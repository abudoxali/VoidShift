import { defineConfig } from 'vitest/config'

/** `npm run bake`: offline asset generation through the same TypeScript sources as the app. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.bake.ts'],
    testTimeout: 3_600_000,
    fileParallelism: false,
  },
})
