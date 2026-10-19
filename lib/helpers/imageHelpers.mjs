/**
 * Intelligent utility to separate container/layout styling from image-specific styling.
 * Preserves dimensions, rounded borders, and cursors on the wrapper to eliminate layout jumps (CLS).
 */
export function splitImageClassNames(className = '') {
  if (!className || typeof className !== 'string') {
    return { wrapperClass: '', imgClass: '' }
  }

  const tokens = className.trim().split(/\s+/).filter(Boolean)
  // If it's a CSS module class (e.g. styles.avatar), put on wrapper and let img inherit
  if (tokens.length === 1 && !tokens[0].includes('-')) {
    return { wrapperClass: tokens[0], imgClass: 'w-full h-full object-cover' }
  }

  const wrapperTokens = []
  const imgTokens = []

  const imgOnlyPatterns = [
    /^object-(cover|contain|fill|none|scale-down)$/,
    /^object-(top|bottom|center|left|right)$/,
    /^(group-hover:|hover:|active:)?scale-/,
    /^transition(-[a-z]+)?$/,
    /^(hover:|group-hover:)?opacity-/,
    /^duration-/,
    /^(blur|brightness|contrast|grayscale|invert|sepia)/
  ]

  const wrapperOnlyPatterns = [
    /^(w-|h-|min-w-|min-h-|max-w-|max-h-|aspect-)/,
    /^rounded/,
    /^border/,
    /^cursor-/,
    /^shadow/
  ]

  for (const token of tokens) {
    if (imgOnlyPatterns.some(p => p.test(token))) {
      imgTokens.push(token)
    } else if (wrapperOnlyPatterns.some(p => p.test(token))) {
      wrapperTokens.push(token)
    } else {
      wrapperTokens.push(token)
    }
  }

  return {
    wrapperClass: wrapperTokens.join(' '),
    imgClass: imgTokens.join(' ')
  }
}
