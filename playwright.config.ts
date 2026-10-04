import { defineConfig } from '@playwright/test'

/**
 * Runtime verification against the production build. WebGL runs on SwiftShader in headless
 * Chromium, so these tests check correctness (errors, rendering, controls, resource
 * lifecycle) — not frame rate.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      // SwiftShader by default (CI has no GPU); PW_GPU=1 runs on the local GPU (ANGLE D3D11).
      args: process.env.PW_GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
