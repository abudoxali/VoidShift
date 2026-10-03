import { expect, test, type Page } from '@playwright/test'

/** Library-internal deprecation notices that are not VoidShift errors. */
const IGNORED = [/THREE\.Clock: This module has been deprecated/]

function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    const text = msg.text()
    if (!IGNORED.some((re) => re.test(text))) problems.push(`[${msg.type()}] ${text.slice(0, 400)}`)
  })
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`))
  return problems
}

async function boot(page: Page, query = 'debug&quality=lite') {
  await page.goto(`/?${query}`)
  await page.waitForFunction(() => Boolean(window.__VOIDSHIFT__?.renderer), null, { timeout: 60_000 })
}

/** Fraction of sampled canvas pixels that are not near-black. */
async function litFraction(page: Page): Promise<number> {
  return page.evaluate(() => {
    const src = document.querySelector('canvas')!
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 90
    const ctx = c.getContext('2d')!
    ctx.drawImage(src, 0, 0, c.width, c.height)
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    let lit = 0
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 30) lit++
    return lit / (data.length / 4)
  })
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'phone', width: 390, height: 844 },
]

for (const vp of VIEWPORTS) {
  test(`renders the final hold without errors (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    const problems = collectProblems(page)
    await boot(page)

    // Hold on the final composition: both entities present.
    await page.evaluate(() => {
      const d = window.__VOIDSHIFT__!
      d.pause()
      d.seek(d.engine.duration)
    })
    await page.waitForTimeout(1500)

    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    expect(box?.width).toBeCloseTo(vp.width, 0)
    expect(box?.height).toBeCloseTo(vp.height, 0)

    expect(await litFraction(page)).toBeGreaterThan(0.05)
    const stats = await page.evaluate(() => window.__VOIDSHIFT__!.stats())
    expect(stats.calls).toBeGreaterThan(5)
    expect(stats.calls).toBeLessThan(60)
    expect(problems, problems.join('\n')).toEqual([])
  })
}

for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test(`plays both combat exchanges frame-by-frame without errors (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    const problems = collectProblems(page)
    await boot(page)
    expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.layout)).toBe(vp.width < vp.height ? 'portrait' : 'landscape')

    const playThrough = async (from: number, to: number) => {
      await page.evaluate((t) => {
        const d = window.__VOIDSHIFT__!
        d.seek(t)
        d.setFixedDelta(1 / 60)
        d.play()
      }, from)
      await page.waitForFunction((end) => window.__VOIDSHIFT__!.engine.time >= end, to, { timeout: 90_000 })
    }
    // Launch → contact → dilated crossing → exit (exchange 1), then split → pass (exchange 2).
    await playThrough(21.55, 22.5)
    expect(await litFraction(page)).toBeGreaterThan(0.05)
    await playThrough(26.85, 27.4)
    expect(await litFraction(page)).toBeGreaterThan(0.05)
    expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.phase)).toBe('PHASE')
    expect(problems, problems.join('\n')).toEqual([])
  })
}

test('the sequence ends on the PHASE hold', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page)
  await page.getByRole('button', { name: 'Skip intro' }).click()
  await expect(page.locator('.hud__label')).toHaveText('PHASE')
  const end = await page.evaluate(() => {
    const e = window.__VOIDSHIFT__!.engine
    return { phase: e.phase, complete: e.isComplete }
  })
  expect(end).toEqual({ phase: 'PHASE', complete: true })
  expect(problems, problems.join('\n')).toEqual([])
})

test('skip and replay intro controls drive the engine', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page)
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip intro' }).click()
  await expect(page.getByRole('button', { name: 'Replay intro' })).toBeVisible()
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.isComplete)).toBe(true)

  await page.getByRole('button', { name: 'Replay intro' }).click()
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeVisible()
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.time)).toBeLessThan(1)

  // Escape also skips.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Replay intro' })).toBeVisible()
  expect(problems, problems.join('\n')).toEqual([])
})

test('reduced motion: honours the system setting and the in-app toggle', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const problems = collectProblems(page)
  await boot(page)
  const toggle = page.getByRole('button', { name: /Reduced motion/ })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.motion.reduced)).toBe(true)
  const shakeCues = await page.evaluate(() => window.__VOIDSHIFT__!.engine.cues.filter((c) => c.name === 'camera:shake').length)
  expect(shakeCues).toBe(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.motion.reduced)).toBe(false)
  expect(problems, problems.join('\n')).toEqual([])
  await context.close()
})

test('quality switches and replays do not leak GPU resources', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page, 'debug&quality=high')
  const settle = () => page.waitForTimeout(1200)
  await page.evaluate(() => window.__VOIDSHIFT__!.seek(window.__VOIDSHIFT__!.engine.duration))
  await settle()
  const baseline = await page.evaluate(() => window.__VOIDSHIFT__!.stats())

  const quality = page.getByRole('button', { name: /^Quality/ })
  for (let i = 0; i < 6; i++) {
    await quality.click() // cycles LITE → HIGH → ULTRA …
    await settle()
  }
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__VOIDSHIFT__!.engine.replay())
    // Pass through the combat beats (phase, fold, afterimages, attack vector) on every replay.
    for (const t of [21.7, 22.1, 27.0]) {
      await page.evaluate((x) => window.__VOIDSHIFT__!.seek(x), t)
      await page.waitForTimeout(300)
    }
    await page.evaluate(() => window.__VOIDSHIFT__!.seek(window.__VOIDSHIFT__!.engine.duration))
  }
  await settle()
  const after = await page.evaluate(() => window.__VOIDSHIFT__!.stats())
  expect(after.tier).toBe('HIGH')
  expect(after.geometries).toBeLessThanOrEqual(baseline.geometries)
  expect(after.textures).toBeLessThanOrEqual(baseline.textures)
  expect(problems, problems.join('\n')).toEqual([])
})
