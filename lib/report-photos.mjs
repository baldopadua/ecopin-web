// Every photo or video on a report, tagged with who it came from. The officer
// report popup uses this so staff never have to guess from a filename.
//
// Sources, as the data really has them:
//  - the citizen's own photo or video (`image_url`, `video_url`)
//  - extra citizen evidence (files in the report_evidence folder, which only
//    citizens upload to; each has a name and an upload time, but no uploader)
//  - the field crew's before and after photos (`before_photos` / `after_photos`
//    lists, or the single `before_photo_url` / `after_photo_url`). These carry
//    no time and no person, so none is shown.

export const PHOTO_GROUPS = ['citizen', 'before', 'after']

export const PHOTO_GROUP_TEXT = {
  citizen: { tab: 'Citizen', tone: 'info' },
  before: { tab: 'Crew before', tone: 'warning' },
  after: { tab: 'Crew after', tone: 'success' },
}

const noun = (isVideo) => (isVideo ? 'video' : 'photo')

function label(group, isVideo) {
  if (group === 'citizen') return `Citizen ${noun(isVideo)}`
  return `Field crew · ${group === 'before' ? 'Before' : 'After'} cleanup`
}

function urlOf(entry) {
  if (typeof entry === 'string') return entry
  return entry?.url || entry?.photo_url || entry?.file_url || ''
}

function addedText(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return `Added ${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

/**
 * @param report   the report row
 * @param evidence extra citizen evidence rows ({ name, url, createdAt, resource_type })
 * @param media    { isVideoResource, getVideoPosterUrl } from mediaHelpers
 * @returns photos in the order citizen, before, after; each URL once.
 */
export function buildReportPhotos(report, evidence, media) {
  const { isVideoResource, getVideoPosterUrl } = media
  const photos = []
  const seen = new Set()
  const add = (group, url, extra = {}) => {
    if (!url || typeof url !== 'string' || seen.has(url)) return
    seen.add(url)
    const isVideo = extra.isVideo ?? isVideoResource(url, extra.resourceType)
    photos.push({
      url,
      group,
      isVideo,
      label: label(group, isVideo),
      caption: extra.caption || null,
      fileName: extra.fileName || null,
      poster: isVideo ? getVideoPosterUrl(url) : null,
    })
  }

  add('citizen', report?.image_url, { caption: 'Sent with the report' })
  add('citizen', report?.video_url, { isVideo: true, caption: 'Sent with the report' })
  for (const item of Array.isArray(evidence) ? evidence : []) {
    const url = item?.photo_url || item?.file_url || item?.url
    add('citizen', url, {
      resourceType: item?.resource_type,
      caption: addedText(item?.createdAt || item?.created_at),
      fileName: item?.name || null,
    })
  }
  for (const slot of ['before', 'after']) {
    const list = report?.[`${slot}_photos`]
    const urls = (Array.isArray(list) ? list : []).map(urlOf).filter(Boolean)
    if (urls.length === 0 && report?.[`${slot}_photo_url`]) {
      urls.push(report[`${slot}_photo_url`])
    }
    for (const url of urls) add(slot, url, { caption: 'Taken by the field crew' })
  }
  return photos
}

export function countPhotos(photos) {
  const counts = { citizen: 0, before: 0, after: 0 }
  for (const photo of photos) counts[photo.group] += 1
  return counts
}

/** The groups that have at least one photo, in display order. */
export function presentGroups(photos) {
  const counts = countPhotos(photos)
  return PHOTO_GROUPS.filter((group) => counts[group] > 0)
}

/** Lines for the Photos summary card, e.g. “3 from the citizen”. */
export function photoSummaryLines(photos) {
  const counts = countPhotos(photos)
  const lines = []
  if (counts.citizen) lines.push({ group: 'citizen', text: `${counts.citizen} from the citizen` })
  if (counts.before) lines.push({ group: 'before', text: `${counts.before} from the field crew before cleanup` })
  if (counts.after) lines.push({ group: 'after', text: `${counts.after} from the field crew after cleanup` })
  return lines
}
