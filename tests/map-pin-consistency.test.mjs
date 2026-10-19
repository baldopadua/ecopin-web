import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPORT_PIN_STATUSES, UNKNOWN_PIN_STATUS } from '../components/map/reportPinStatus.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

test('WT-84: REPORT_PIN_STATUSES defines comprehensive status tones and Lucide icons', () => {
  const expectedStatuses = [
    'unresolved',
    'in_progress',
    'resolved',
    'waiting_for_feedback',
    'pending_owner_consent',
    'closed',
  ]

  for (const status of expectedStatuses) {
    const config = REPORT_PIN_STATUSES[status]
    assert.ok(config, `Missing status config for: ${status}`)
    assert.ok(config.label, `Missing label for: ${status}`)
    assert.ok(config.tone, `Missing tone for: ${status}`)
    assert.ok(config.Icon, `Missing Lucide Icon for: ${status}`)
  }

  assert.equal(REPORT_PIN_STATUSES.unresolved.tone, 'error')
  assert.equal(REPORT_PIN_STATUSES.in_progress.tone, 'warning')
  assert.equal(REPORT_PIN_STATUSES.resolved.tone, 'success')
  assert.equal(REPORT_PIN_STATUSES.waiting_for_feedback.tone, 'info')
  assert.equal(REPORT_PIN_STATUSES.pending_owner_consent.tone, 'info')
  assert.equal(REPORT_PIN_STATUSES.closed.tone, 'muted')

  assert.ok(UNKNOWN_PIN_STATUS.Icon, 'UNKNOWN_PIN_STATUS must have an Icon')
  assert.equal(UNKNOWN_PIN_STATUS.tone, 'muted')
})

test('WT-84: OperationsMap defaults modern prop to true for unified photo pins', () => {
  const operationsMapFile = fs.readFileSync(path.join(rootDir, 'components/map/OperationsMap.js'), 'utf8')
  assert.match(
    operationsMapFile,
    /export\s+default\s+function\s+OperationsMap\s*\(\s*\{[^}]*modern\s*=\s*true[^}]*\}\s*\)/,
    'OperationsMap must default modern = true to enable photoPins by default'
  )
  assert.match(
    operationsMapFile,
    /<CrewTaskLayer\s+tasks=\{tasks\}\s+photoPins=\{modern\}\s+routeColor=\{modern\s*\?\s*'#0052cc'\s*:\s*undefined\}/,
    'OperationsMap must pass photoPins={modern} to CrewTaskLayer'
  )
})

test('WT-84: HotzoneDetail enables photoPins={true} for cluster constituent reports', () => {
  const hotzoneFile = fs.readFileSync(path.join(rootDir, 'app/dashboard/officer/hotzone-intel/[id]/page.js'), 'utf8')
  assert.match(
    hotzoneFile,
    /<EcoPinMap[\s\S]*?allowedReportIds=\{reports\.map\(r\s*=>\s*r\.id\)\}[\s\S]*?photoPins=\{true\}/,
    'HotzoneDetail must pass photoPins={true} to EcoPinMap'
  )
})

test('WT-84: Field Crew report detail enables photoPins={true} on static map view', () => {
  const reportDetailFile = fs.readFileSync(path.join(rootDir, 'app/dashboard/field-crew/operations/[id]/[report_id]/page.js'), 'utf8')
  assert.match(
    reportDetailFile,
    /<EcoPinMap[\s\S]*?allowedReportIds=\{\[report\.id\.toString\(\)\]\}[\s\S]*?photoPins=\{true\}/,
    'Field Crew report detail must pass photoPins={true} to EcoPinMap'
  )
})

test('WT-84: Shared Map Grid enables photoPins={true} across EcoPinMap and CrewTaskLayer', () => {
  const sharedMapFile = fs.readFileSync(path.join(rootDir, 'app/dashboard/(shared)/map-grid/page.js'), 'utf8')
  assert.match(
    sharedMapFile,
    /<EcoPinMap[\s\S]*?photoPins=\{true\}/,
    'Shared map grid must pass photoPins={true} to EcoPinMap'
  )
  assert.match(
    sharedMapFile,
    /<CrewTaskLayer\s+photoPins=\{true\}\s+tasks=\{filteredTasks\}\s*\/>/,
    'Shared map grid must pass photoPins={true} to CrewTaskLayer'
  )
})

test('WT-84: EcoPinMarker and ReportPhotoMarker safely fall back to preloaded report photo properties', () => {
  const markerFile = fs.readFileSync(path.join(rootDir, 'components/map/EcoPinMarker.js'), 'utf8')
  assert.match(
    markerFile,
    /photoSource\s*=\s*photo\s*\|\|\s*report\?\.photo_url\s*\|\|\s*report\?\.file_url\s*\|\|\s*report\?\.image_url\s*\|\|\s*report\?\.image/,
    'EcoPinMarker must compute photoSource using preloaded report image fields'
  )

  const photoMarkerFile = fs.readFileSync(path.join(rootDir, 'components/map/ReportPhotoMarker.js'), 'utf8')
  assert.match(
    photoMarkerFile,
    /effectiveImage\s*=\s*image\s*\|\|\s*report\?\.photo_url\s*\|\|\s*report\?\.file_url\s*\|\|\s*report\?\.image_url\s*\|\|\s*report\?\.image/,
    'ReportPhotoMarker must compute effectiveImage using preloaded report image fields'
  )
})

test('WT-84: createEcoPinIcon supports full unified status color palette', () => {
  const markerFile = fs.readFileSync(path.join(rootDir, 'components/map/EcoPinMarker.js'), 'utf8')
  assert.match(markerFile, /status\s*===\s*'in_progress'[\s\S]*?--warning/)
  assert.match(markerFile, /status\s*===\s*'resolved'[\s\S]*?--success/)
  assert.match(markerFile, /status\s*===\s*'waiting_for_feedback'[\s\S]*?--info/)
  assert.match(markerFile, /status\s*===\s*'closed'[\s\S]*?--text-muted/)
})

test('WT-84: useMapPhotoEvidence allows reports without approximate privacy flag to load evidence', () => {
  const photoHookFile = fs.readFileSync(path.join(rootDir, 'components/map/useMapPhotoEvidence.js'), 'utf8')
  assert.match(
    photoHookFile,
    /location_precision\s*!==\s*'approximate'/,
    'useMapPhotoEvidence must allow exact and non-approximate reports to query photo evidence'
  )
})

test('WT-84: DESIGN.md records dashboard map pin audit and unified design specification', () => {
  const designFile = fs.readFileSync(path.join(rootDir, 'DESIGN.md'), 'utf8')
  assert.match(
    designFile,
    /### Dashboard and specialized detail view map pins \(WT-84\)/,
    'DESIGN.md must document the WT-84 map pin audit'
  )
  assert.match(designFile, /\[25,\s*58\]/, 'Must document [25, 58] anchor')
  assert.match(designFile, /\[0,\s*-62\]/, 'Must document [0, -62] popup anchor')
  assert.match(designFile, /50px circular photo frame/, 'Must document 50px photo frame')
})
