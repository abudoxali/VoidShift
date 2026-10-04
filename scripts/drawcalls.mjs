// Dev tool: draw calls per frame across the fight (real GPU). node scripts/drawcalls.mjs [quality]
import { chromium } from '@playwright/test'
const q = process.argv[2] ?? 'ultra'
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(`http://localhost:5173/?debug&quality=${q}`)
await page.waitForFunction(() => window.__VOIDSHIFT__?.renderer && window.__VOIDSHIFT__.ready(), null, { timeout: 180000 })
const res = await page.evaluate(async () => {
  const d = window.__VOIDSHIFT__
  d.pause()
  const out = []
  for (let t = 0; t <= d.engine.duration; t += 0.25) {
    d.seek(t)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    out.push([+t.toFixed(2), d.stats().calls, d.engine.scene?.id])
  }
  return out
})
const calls = res.map((r) => r[1])
console.log(q, 'min', Math.min(...calls), 'max', Math.max(...calls), 'peak at', res.find((r) => r[1] === Math.max(...calls)))
const byScene = {}
for (const [, c, s] of res) byScene[s] = Math.max(byScene[s] ?? 0, c)
console.log(JSON.stringify(byScene))
await browser.close()
