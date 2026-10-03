# VoidShift

A code-driven cinematic web experience: the choreography, speed, deception and impact of an
anime battle, translated into computational motion graphics — vectors, coordinates, particles,
shaders, typography and camera — rendered in real time with WebGL.

Project state and milestone tracking live in [`STATUS.md`](./STATUS.md).

## Run

```bash
npm ci
npm run dev        # http://localhost:5173
```

URL switches for QA: `?quality=ultra|high|lite`, `?motion=reduced|full`, `?debug`
(renderer stats + `window.__VOIDSHIFT__` handle for seeking the timeline).

## Verify

```bash
npm run verify     # typecheck + lint + unit tests + production build
npm run test:e2e   # Playwright runtime checks against the production build (Chromium)
```

Keyboard: `Esc` skips the intro.
