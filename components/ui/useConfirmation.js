'use client'

import { useEffect, useRef, useState } from 'react'
import Dialog from './Dialog'

export default function useConfirmation() {
  const [prompt, setPrompt] = useState(null)
  const resolve = useRef(null)
  useEffect(() => () => { resolve.current?.(false) }, [])
  const settle = answer => { resolve.current?.(answer); resolve.current = null; setPrompt(null) }
  const confirm = options => new Promise(done => {
    resolve.current?.(false)
    resolve.current = done
    setPrompt(options)
  })
  const confirmation = <Dialog open={Boolean(prompt)} onClose={() => settle(false)} label={prompt?.title || 'Confirm action'}>
    {prompt && <section className="w-full max-w-md bg-surface text-text-primary border border-border rounded-3xl p-6" onClick={event => event.stopPropagation()}>
      <h2 className="text-xl font-medium mb-3">{prompt.title}</h2>
      <p className="text-sm leading-relaxed text-text-secondary">{prompt.description}</p>
      <div className="flex flex-wrap justify-end gap-3 mt-6">
        <button type="button" autoFocus className="btn-secondary min-h-11" onClick={() => settle(false)}>Cancel</button>
        <button type="button" className="min-h-11 rounded-full px-5 py-2 bg-red-700 text-white" onClick={() => settle(true)}>{prompt.action || 'Delete photo'}</button>
      </div>
    </section>}
  </Dialog>
  return { confirm, confirmation }
}
