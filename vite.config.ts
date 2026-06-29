import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // 로컬 레퍼런스 클론, 하네스 서브모듈, Codex 작업용 scratch worktree 테스트는 수집하지 않는다.
    exclude: [
      ...configDefaults.exclude,
      '.reference-repos/**',
      '.harness/**',
      '.claude/worktrees/**',
    ],
  },
})
