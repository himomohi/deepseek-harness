import { describe, expect, it } from 'vitest'
import {
  formatRepairPrompt,
  formatUpdateFailure,
  formatUpdatePreview,
  previewFromGithubCompare,
  shortSha,
} from '../src/update-preview.ts'

describe('formatUpdatePreview', () => {
  it('says already current when official is not ahead', () => {
    const text = formatUpdatePreview({
      localSha: '1b9a77af9dabc',
      localVersion: '0.1.0-rc.6',
      officialSha: '47f943859bdef',
      officialVersion: '0.1.0-rc.5',
      officialAhead: 0,
      commits: [],
      shallow: true,
    })
    expect(text).toContain('가져올 공식 커밋: 0')
    expect(text).toContain('1b9a77a')
    expect(text).toContain('47f9438')
    expect(text).toContain('얕은 클론')
  })

  it('lists incoming commits and hides the tail', () => {
    const commits = Array.from({ length: 10 }, (_, index) => ({
      sha: `${index.toString(16).padStart(7, '0')}abc`,
      date: '2026-08-16T00:00:00Z',
      title: `commit ${index}`,
    }))
    const text = formatUpdatePreview({
      localSha: 'aaaaaaa',
      localVersion: '0.1.0-rc.6',
      officialSha: 'bbbbbbb',
      officialVersion: '0.1.0-rc.7',
      officialAhead: 10,
      commits,
      shallow: false,
    })
    expect(text).toContain('가져올 공식 커밋: 10')
    expect(text).toContain('commit 0')
    expect(text).toContain('외 2개')
    expect(text).not.toContain('commit 9')
  })
})

describe('formatRepairPrompt', () => {
  it('is a pasteable AI request with repo, step, and conflicts', () => {
    const text = formatRepairPrompt({
      step: 'merge',
      rootDir: '/Users/appcaster/Dev/deepseek-harness',
      detail: 'CONFLICT (content): packages/core/agent-loop/src/agent.ts',
      conflicts: ['packages/core/agent-loop/src/agent.ts'],
    })
    expect(text).toContain('아래 `dsh update` 실패를 고치고')
    expect(text).toContain('dsh update --yes')
    expect(text).toContain('저장소: /Users/appcaster/Dev/deepseek-harness')
    expect(text).toContain('단계: merge')
    expect(text).toContain('- packages/core/agent-loop/src/agent.ts')
    expect(text).toContain('locale-ko')
    expect(text).toContain('성공을 거짓말하지 말 것')
  })

  it('wraps the prompt under an AI에게 요청 heading', () => {
    const text = formatUpdateFailure({
      step: 'build',
      rootDir: '/tmp/dsh',
      detail: 'error TS2304',
    })
    expect(text).toContain('빌드가 실패했습니다.')
    expect(text).toContain('AI에게 요청:')
    expect(text).toContain('error TS2304')
  })
})

describe('previewFromGithubCompare', () => {
  it('uses ahead_by and commit messages', () => {
    const preview = previewFromGithubCompare(
      {
        ahead_by: 1,
        commits: [{
          sha: 'deadbeef0123',
          commit: { message: 'fix: thing\n\nbody', author: { date: '2026-08-16T01:00:00Z' } },
        }],
      },
      { sha: 'localsha', version: '0.1.0-rc.6', shallow: true },
      { sha: 'officialsha', version: '0.1.0-rc.7' },
    )
    expect(preview.officialAhead).toBe(1)
    expect(preview.commits[0]?.title).toBe('fix: thing')
    expect(shortSha(preview.commits[0]?.sha ?? '')).toBe('deadbee')
  })
})

describe('toolName', () => {
  it('uses pnpm.cmd on Windows and pnpm elsewhere', async () => {
    const { toolName } = await import('../src/update.ts')
    expect(toolName('git', 'win32')).toBe('git')
    expect(toolName('pnpm', 'win32')).toBe('pnpm.cmd')
    expect(toolName('pnpm', 'darwin')).toBe('pnpm')
    expect(toolName('pnpm', 'linux')).toBe('pnpm')
  })
})
