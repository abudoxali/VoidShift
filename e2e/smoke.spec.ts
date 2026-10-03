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

/** Wait until the renderer has actually produced `n` more frames (software GL can be slow). */
async function frames(page: Page, n = 2) {
  for (let i = 0; i < n; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
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
    // Fighters are rigid-batched (one draw per material); the rest is FX layers + post passes.
    expect(stats.calls).toBeLessThan(80)
    expect(problems, problems.join('\n')).toEqual([])
  })
}

for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test(`plays the first attack, teleport and impact frame-by-frame without errors (${vp.name})`, async ({ page }) => {
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
    // First attack (dash, punch through the phased NOX), the teleport, then contact → explosion.
    await playThrough(3.3, 4.3)
    expect(await litFraction(page)).toBeGreaterThan(0.05)
    await playThrough(9.9, 11.0)
    expect(await litFraction(page)).toBeGreaterThan(0.05)
    await playThrough(13.3, 14.2)
    expect(await litFraction(page)).toBeGreaterThan(0.05)
    expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.phase)).toBe('IMPACT')
    expect(problems, problems.join('\n')).toEqual([])
  })
}

test('the sequence ends on the IMPACT aftermath hold', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page)
  await page.getByRole('button', { name: 'Skip intro' }).click()
  await expect(page.locator('.hud__label')).toHaveText('IMPACT')
  const end = await page.evaluate(() => {
    const e = window.__VOIDSHIFT__!.engine
    return { phase: e.phase, complete: e.isComplete }
  })
  expect(end).toEqual({ phase: 'IMPACT', complete: true })
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
  const settle = async () => {
    await page.waitForTimeout(600)
    await frames(page, 3)
  }
  const beats = async () => {
    // Pass through the combat beats (phase, anchor, teleport, core, impact).
    for (const t of [3.7, 8.9, 10.5, 12.6, 14.0]) {
      await page.evaluate((x) => window.__VOIDSHIFT__!.seek(x), t)
      await frames(page, 2)
    }
    await page.evaluate(() => window.__VOIDSHIFT__!.seek(window.__VOIDSHIFT__!.engine.duration))
  }
  // Warm-up: every beat renders once, so first-time uploads are not mistaken for growth.
  await beats()
  await settle()
  const baseline = await page.evaluate(() => window.__VOIDSHIFT__!.stats())

  const quality = page.getByRole('button', { name: /^Quality/ })
  for (let i = 0; i < 6; i++) {
    await quality.click() // cycles LITE → HIGH → ULTRA …
    await settle()
  }
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__VOIDSHIFT__!.engine.replay())
    await beats()
  }
  await settle()
  const after = await page.evaluate(() => window.__VOIDSHIFT__!.stats())
  expect(after.tier).toBe('HIGH')
  expect(after.geometries).toBeLessThanOrEqual(baseline.geometries)
  expect(after.textures).toBeLessThanOrEqual(baseline.textures)
  expect(problems, problems.join('\n')).toEqual([])
})

test('review panel is hidden for visitors', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/?quality=lite')
  await page.waitForSelector('canvas')
  await page.waitForTimeout(1500)
  await expect(page.locator('.review')).toHaveCount(0)
  await expect(page.locator('.camdebug')).toHaveCount(0)
  expect(await page.evaluate(() => typeof window.__VOIDSHIFT__)).toBe('undefined')
  expect(problems, problems.join('\n')).toEqual([])
})

test('review mode: scene URL lands on the scene; controls drive the engine', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page, 'review=1&scene=teleport&quality=lite')
  const panel = page.locator('.review')
  await expect(panel).toBeVisible()
  const sceneId = await page.evaluate(() => window.__VOIDSHIFT__!.engine.scene?.id)
  expect(sceneId).toBe('teleport')
  await expect(panel.locator('.review__scene')).toHaveText('Teleport')

  // Pause, next / previous shot.
  await page.evaluate(() => window.__VOIDSHIFT__!.pause())
  const before = await page.evaluate(() => window.__VOIDSHIFT__!.engine.shot!.name)
  await panel.getByRole('button', { name: 'Next shot' }).click()
  const next = await page.evaluate(() => window.__VOIDSHIFT__!.engine.shot!.name)
  expect(next).not.toBe(before)
  await panel.getByRole('button', { name: 'Previous shot' }).click()
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.shot!.name)).toBe(before)

  // Scene select.
  await panel.getByRole('combobox', { name: 'Scene' }).selectOption('core')
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.scene?.id)).toBe('core')

  // Slow motion, FX off, debug toggles.
  await panel.getByRole('button', { name: /Slow/ }).click()
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.timeScale)).toBe(0.25)
  await panel.getByRole('button', { name: /^FX/ }).click()
  await expect(panel.getByRole('button', { name: /^FX/ })).toHaveText('FX off')
  await panel.getByRole('button', { name: 'Skeleton' }).click()
  await panel.getByRole('button', { name: 'Camera debug' }).click()
  await expect(page.locator('.camdebug')).toBeVisible()
  await page.waitForTimeout(800)
  expect(await litFraction(page)).toBeGreaterThan(0.02)

  // The panel collapses to a pill (phones) and expands again with its state intact.
  await panel.getByRole('button', { name: 'Hide review panel' }).click()
  await expect(panel.getByRole('button', { name: /^Review/ })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Next shot' })).toHaveCount(0)
  await panel.getByRole('button', { name: /^Review/ }).click()
  await expect(panel.getByRole('button', { name: /^FX/ })).toHaveText('FX off')
  expect(problems, problems.join('\n')).toEqual([])
})

test('FX off: the fight still renders, characters only, without errors', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page, 'review=1&fx=off&scene=close-combat&quality=lite')
  await page.waitForTimeout(1000)
  expect(await page.evaluate(() => window.__VOIDSHIFT__!.engine.scene?.id)).toBe('close-combat')
  expect(await litFraction(page)).toBeGreaterThan(0.02)
  const breakdown = await page.evaluate(() => window.__VOIDSHIFT__!.drawBreakdown())
  expect(breakdown.velocity).toBeGreaterThan(0)
  expect(breakdown.void).toBeGreaterThan(0)
  expect(breakdown.bursts ?? 0).toBe(0)
  expect(problems, problems.join('\n')).toEqual([])
})

test('repeated scene jumps do not grow GPU resources', async ({ page }) => {
  const problems = collectProblems(page)
  await boot(page, 'review=1&quality=high')
  const scenes = await page.evaluate(() => window.__VOIDSHIFT__!.engine.scenes.map((s) => s.id))
  const tour = async () => {
    for (const id of scenes) {
      await page.evaluate((s) => window.__VOIDSHIFT__!.engine.seekScene(s), id)
      await frames(page, 2)
    }
  }
  await tour()
  await page.waitForTimeout(800)
  const baseline = await page.evaluate(() => window.__VOIDSHIFT__!.stats())
  for (let i = 0; i < 3; i++) await tour()
  await page.waitForTimeout(800)
  const after = await page.evaluate(() => window.__VOIDSHIFT__!.stats())
  expect(after.geometries).toBeLessThanOrEqual(baseline.geometries)
  expect(after.textures).toBeLessThanOrEqual(baseline.textures)
  expect(problems, problems.join('\n')).toEqual([])
})
