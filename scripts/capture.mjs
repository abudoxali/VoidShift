// Dev tool: headless captures of the live app (real GPU when available).
// node scripts/capture.mjs <outDir> <url-path> <name> [seekTimes comma] [w] [h]
import { chromium } from '@playwright/test'
const [outDir, path, name, times = '', w = '1440', h = '810'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const logs = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`) })
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5173${path}`)
const lab = path.includes('lab=')
if (lab) {
  await page.waitForTimeout(+(process.env.WAIT ?? 4000))
  await page.screenshot({ path: `${outDir}/${name}.png` })
} else {
  await page.waitForFunction(() => window.__VOIDSHIFT__?.renderer && document.querySelector('canvas'), null, { timeout: 120000 })
  await page.waitForFunction(() => { let n = 0; window.__VOIDSHIFT__.scene?.traverse((o) => { if (o.isSkinnedMesh) n++ }); return n >= 8 }, null, { timeout: 180000 })
  const list = times ? times.split(',').map(Number) : [null]
  for (const t of list) {
    if (t !== null) await page.evaluate((tt) => { const d = window.__VOIDSHIFT__; d.pause(); d.seek(tt) }, t)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${outDir}/${name}${t !== null ? '-' + t.toFixed(2) : ''}.png` })
  }
  const stats = await page.evaluate(() => window.__VOIDSHIFT__.stats())
  logs.push(`stats ${JSON.stringify(stats)}`)
}
console.log(logs.slice(-12).join('\n'))
await browser.close()
