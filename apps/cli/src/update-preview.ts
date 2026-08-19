/**
 * Compact preview / failure copy for `dsh update`.
 * Long git/pnpm logs stay out of the happy path; failures include a
 * copy-paste prompt an agent can use to self-heal.
 * @module @deepseek-ai/dsh/update-preview
 */

export interface UpstreamCommit {
  readonly sha: string
  readonly date: string
  readonly title: string
}

export interface UpdatePreview {
  readonly localSha: string
  readonly localVersion: string
  readonly officialSha: string
  readonly officialVersion: string
  readonly officialAhead: number
  readonly commits: readonly UpstreamCommit[]
  readonly shallow: boolean
}

export interface UpdateFailure {
  readonly step: 'fetch' | 'merge' | 'install' | 'build' | 'verify' | 'other'
  readonly rootDir: string
  readonly detail: string
  readonly conflicts?: readonly string[]
  readonly missing?: readonly string[]
}

const PREVIEW_COMMIT_LIMIT = 8

export function shortSha(sha: string): string {
  return sha.replace(/^origin\/|^upstream\//, '').slice(0, 7)
}

export function formatUpdatePreview(preview: UpdatePreview): string {
  const lines = [
    'dsh update',
    `포크    ${shortSha(preview.localSha)}  ${preview.localVersion}`,
    `공식    ${shortSha(preview.officialSha) || 'unknown'}  ${preview.officialVersion || 'unknown'}`,
  ]
  if (preview.shallow) lines.push('참고    로컬이 얕은 클론이라 GitHub 비교를 씁니다.')
  if (preview.officialAhead <= 0) {
    lines.push('가져올 공식 커밋: 0  (이미 최신)')
    return lines.join('\n')
  }
  lines.push(`가져올 공식 커밋: ${preview.officialAhead}`)
  const shown = preview.commits.slice(0, PREVIEW_COMMIT_LIMIT)
  for (const commit of shown) {
    const date = commit.date.slice(0, 10)
    lines.push(`  ${shortSha(commit.sha)}  ${date}  ${commit.title}`)
  }
  const hidden = preview.officialAhead - shown.length
  if (hidden > 0) lines.push(`  … 외 ${hidden}개`)
  lines.push('다음은 머지 → 설치 → 빌드 → 포크 기능 검사입니다.')
  return lines.join('\n')
}

export function formatRepairPrompt(failure: UpdateFailure): string {
  const conflicts = failure.conflicts ?? []
  const missing = failure.missing ?? []
  const conflictBlock = conflicts.length > 0
    ? `충돌 파일:\n${conflicts.map(file => `- ${file}`).join('\n')}`
    : ''
  const missingBlock = missing.length > 0
    ? `빠진 포크 마커:\n${missing.map(item => `- ${item}`).join('\n')}`
    : ''
  return [
    '아래 `dsh update` 실패를 고치고, 끝나면 `dsh update --yes`로 다시 검사해줘.',
    '',
    `저장소: ${failure.rootDir}`,
    `단계: ${failure.step}`,
    conflictBlock,
    missingBlock,
    '마지막 출력:',
    failure.detail.trim() || '(없음)',
    '',
    '요청:',
    '- 머지 충돌이면 locale-ko와 포크 마커를 유지한 채 해결',
    '- 설치/빌드 실패면 원인 고치고 재빌드',
    '- 포크 마커가 없으면 공식 덮어쓰기를 되돌리거나 다시 패치',
    '- 성공을 거짓말하지 말 것',
  ].join('\n')
}

export function formatUpdateFailure(failure: UpdateFailure): string {
  const title = {
    fetch: '공식 저장소를 가져오지 못했습니다.',
    merge: '공식 머지가 충돌했습니다. 자동으로 해결하지 않습니다.',
    install: '의존성 설치가 실패했습니다.',
    build: '빌드가 실패했습니다.',
    verify: '머지는 됐지만 포크 기능 마커가 빠졌습니다.',
    other: '업데이트 중 오류가 났습니다.',
  }[failure.step]
  return [
    `실패  ${title}`,
    '',
    'AI에게 요청:',
    formatRepairPrompt(failure),
  ].join('\n')
}

interface GithubCompareCommit {
  readonly sha?: string
  readonly commit?: {
    readonly message?: string
    readonly author?: { readonly date?: string }
  }
}

export interface GithubCompare {
  readonly status?: string
  readonly ahead_by?: number
  readonly total_commits?: number
  readonly commits?: readonly GithubCompareCommit[]
}

export function previewFromGithubCompare(
  compare: GithubCompare,
  local: { sha: string; version: string; shallow: boolean },
  official: { sha: string; version: string },
): UpdatePreview {
  const commits = (compare.commits ?? []).map(commit => ({
    sha: commit.sha ?? '',
    date: commit.commit?.author?.date ?? '',
    title: (commit.commit?.message ?? '').split(/\r?\n/, 1)[0] ?? '',
  }))
  return {
    localSha: local.sha,
    localVersion: local.version,
    officialSha: official.sha,
    officialVersion: official.version,
    officialAhead: compare.ahead_by ?? compare.total_commits ?? commits.length,
    commits,
    shallow: local.shallow,
  }
}
