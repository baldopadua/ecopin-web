import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FB_POST_URL = 'https://www.facebook.com/share/p/19hk6BA5W8/'
const FB_PROFILE_URL = 'https://www.facebook.com/jonah.talagtag.77'

test('WT-98: LandingPage footer and photo lead include photo credit and attribution links', () => {
  const landingPath = path.resolve(__dirname, '../components/landing/LandingPage.js')
  const content = fs.readFileSync(landingPath, 'utf8')

  assert.ok(content.includes(FB_POST_URL), 'LandingPage must include link to Facebook post')
  assert.ok(content.includes(FB_PROFILE_URL), 'LandingPage must include link to photographer Facebook profile')
  assert.ok(content.includes('Pasig Tayo'), 'LandingPage must credit "Pasig Tayo"')
  assert.ok(content.includes('Jonah Talagtag'), 'LandingPage must credit "Jonah Talagtag"')
  assert.ok(content.includes('target="_blank"'), 'Attribution link must open in new tab')
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Attribution link must have safe rel attributes')
  assert.ok(content.includes('styles.photoCredit'), 'LandingPage footer must use styles.photoCredit')
  assert.ok(content.includes('styles.leadCredit'), 'LandingPage lead caption must use styles.leadCredit')
})

test('WT-98: LandingPage.module.css contains styles for photoCredit and leadCredit', () => {
  const cssPath = path.resolve(__dirname, '../components/landing/LandingPage.module.css')
  const content = fs.readFileSync(cssPath, 'utf8')

  assert.ok(content.includes('.photoCredit'), 'LandingPage.module.css must define .photoCredit')
  assert.ok(content.includes('.leadCredit'), 'LandingPage.module.css must define .leadCredit')
  assert.ok(content.includes('.footerCopy'), 'LandingPage.module.css must define .footerCopy')
})

test('WT-98: AuthPhotos figcaption includes photo credit and attribution links', () => {
  const authPhotosPath = path.resolve(__dirname, '../app/auth/AuthPhotos.js')
  const content = fs.readFileSync(authPhotosPath, 'utf8')

  assert.ok(content.includes(FB_POST_URL), 'AuthPhotos must include link to Facebook post')
  assert.ok(content.includes(FB_PROFILE_URL), 'AuthPhotos must include link to photographer Facebook profile')
  assert.ok(content.includes('Pasig Tayo'), 'AuthPhotos must credit "Pasig Tayo"')
  assert.ok(content.includes('Jonah Talagtag'), 'AuthPhotos must credit "Jonah Talagtag"')
  assert.ok(content.includes('target="_blank"'), 'Attribution link must open in new tab')
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Attribution link must have safe rel attributes')
  assert.ok(content.includes('styles.photoCredit'), 'AuthPhotos must use styles.photoCredit')
})

test('WT-98: AuthPage form card includes photo attribution footnote', () => {
  const authPagePath = path.resolve(__dirname, '../app/auth/page.js')
  const content = fs.readFileSync(authPagePath, 'utf8')

  assert.ok(content.includes(FB_POST_URL), 'AuthPage must include link to Facebook post')
  assert.ok(content.includes(FB_PROFILE_URL), 'AuthPage must include link to photographer Facebook profile')
  assert.ok(content.includes('Pasig Tayo'), 'AuthPage must credit "Pasig Tayo"')
  assert.ok(content.includes('Jonah Talagtag'), 'AuthPage must credit "Jonah Talagtag"')
  assert.ok(content.includes('target="_blank"'), 'Attribution link must open in new tab')
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Attribution link must have safe rel attributes')
  assert.ok(content.includes('styles.authPhotoCredit'), 'AuthPage must use styles.authPhotoCredit')
})

test('WT-98: Auth.module.css contains styles for photoCredit and authPhotoCredit', () => {
  const cssPath = path.resolve(__dirname, '../app/auth/Auth.module.css')
  const content = fs.readFileSync(cssPath, 'utf8')

  assert.ok(content.includes('.photoCredit'), 'Auth.module.css must define .photoCredit')
  assert.ok(content.includes('.authPhotoCredit'), 'Auth.module.css must define .authPhotoCredit')
  assert.ok(content.includes('.captionHeader'), 'Auth.module.css must define .captionHeader')
})
