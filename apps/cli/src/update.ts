/**
 * Handler for `dsh update`: shows a short official-vs-fork preview, asks
 * before merging, continues through mechanical conflicts, then rebuilds
 * quietly. Failures print a copy-paste prompt an agent can use to self-heal.
 * @module @deepseek-ai/dsh/update
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as stdinStream, stdout as stdoutStream } from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FORK_FEATURES, pickUpstreamBranch, verifyCustomFeatures } from './custom-features.ts'
import { continueOfficialMerge } from './update-merge.ts'
import {
  formatUpdateFailure,
  formatUpdatePreview,
  previewFromGithubCompare,
  type GithubCompare,
  type UpdateFailure,
  type UpdatePreview,
  type UpstreamCommit,
} from './update-preview.ts'

export interface UpdateOptions {
  readonly yes?: boolean
  readonly dryRun?: boolean
}

function git(rootDir: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

function listUpstreamRefs(rootDir: string): string[] {
  try {
    return git(rootDir, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes/upstream'])
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function mergeInProgress(rootDir: string): boolean {
  try {
    git(rootDir, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])
    return true
  } catch {
    return false
  }
}

function unmergedFiles(rootDir: string): string[] {
  try {
    return git(rootDir, ['diff', '--name-only', '--diff-filter=U'])
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function isShallow(rootDir: string): boolean {
  try {
    return git(rootDir, ['rev-parse', '--is-shallow-repository']).trim() === 'true'
  } catch {
    return false
  }
}

function readPackageVersion(rootDir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function tail(text: string, maxLines = 20): string {
  const lines = text.replace(/\s+$/, '').split(/\r?\n/)
  return lines.slice(-maxLines).join('\n')
}

export function toolName(bin: 'git' | 'pnpm', platform: NodeJS.Platform = process.platform): string {
  if (bin === 'git') return 'git'
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

interface CommandResult {
  ok: boolean
  output: string
}

function runQuiet(bin: 'git' | 'pnpm', args: readonly string[], rootDir: string): CommandResult {
  try {
    const output = execFileSync(toolName(bin), args, {
      cwd: rootDir,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, npm_config_loglevel: 'error', CI: process.env.CI ?? '1' },
    })
    return { ok: true, output }
  } catch (error) {
    const extra = error !== null && typeof error === 'object' && 'stdout' in error
      ? `${typeof error.stdout === 'string' ? error.stdout : ''}\n`
        + ('stderr' in error && typeof error.stderr === 'string' ? error.stderr : '')
      : error instanceof Error
        ? error.message
        : String(error)
    return { ok: false, output: tail(extra) }
  }
}

/**
 * Expand a shallow checkout through its source remote before an upstream merge.
 *
 * Git hides parents listed in `.git/shallow`, so a normal merge can report
 * unrelated histories even when the boundary commit names the official
 * repository as its real parent. Fetching the complete source history restores
 * that ancestry without rewriting commits or branches.
 * @param rootDir - checkout whose history may be shallow.
 * @returns success when the checkout is already complete or was expanded.
 */
export function repairShallowHistory(rootDir: string): CommandResult {
  if (!isShallow(rootDir)) return { ok: true, output: '' }
  let remotes: string[]
  try {
    remotes = git(rootDir, ['remote'])
      .split(/\r?\n/)
      .map(remote => remote.trim())
      .filter(Boolean)
  } catch (error: unknown) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) }
  }
  const source = remotes.includes('origin')
    ? 'origin'
    : remotes.find(remote => remote !== 'upstream') ?? remotes[0]
  if (source === undefined) {
    return { ok: false, output: 'cannot expand shallow history: this checkout has no Git remote' }
  }
  const fetched = runQuiet('git', ['fetch', source, '--unshallow', '--tags', '--prune'], rootDir)
  if (!fetched.ok) return fetched
  return isShallow(rootDir)
    ? { ok: false, output: `git fetch ${source} --unshallow completed but the checkout is still shallow` }
    : fetched
}

function fail(failure: UpdateFailure): never {
  console.error(`\n${formatUpdateFailure(failure)}\n`)
  process.exit(1)
}

async function confirmProceed(): Promise<boolean> {
  if (!stdinStream.isTTY || !stdoutStream.isTTY) return false
  const rl = createInterface({ input: stdinStream, output: stdoutStream })
  try {
    const answer = (await rl.question('진행할까요? [y/N] ')).trim().toLowerCase()
    return answer === 'y' || answer === 'yes'
  } finally {
    rl.close()
  }
}

async function loadGithubCompare(): Promise<{ compare: GithubCompare; officialSha: string; officialVersion: string } | undefined> {
  try {
    const compareRes = await fetch(
      'https://api.github.com/repos/himomohi/deepseek-harness/compare/master...deepseek-ai:deepseek-harness:master',
      { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-update' } },
    )
    if (!compareRes.ok) return undefined
    const compare = await compareRes.json() as GithubCompare
    let officialSha = ''
    let officialVersion = ''
    try {
      const headRes = await fetch(
        'https://api.github.com/repos/deepseek-ai/deepseek-harness/commits/master',
        { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-update' } },
      )
      if (headRes.ok) {
        const head = await headRes.json() as { sha?: string }
        officialSha = head.sha ?? ''
      }
      const pkgRes = await fetch(
        'https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/package.json',
        { headers: { 'User-Agent': 'dsh-update' } },
      )
      if (pkgRes.ok) {
        const pkg = await pkgRes.json() as { version?: string }
        officialVersion = pkg.version ?? ''
      }
    } catch {
      // optional
    }
    return { compare, officialSha, officialVersion }
  } catch {
    return undefined
  }
}

function localGitPreview(rootDir: string, upstreamBranch: string): Pick<UpdatePreview, 'officialAhead' | 'commits' | 'officialSha'> {
  let officialSha = ''
  try {
    officialSha = git(rootDir, ['rev-parse', upstreamBranch]).trim()
  } catch {
    officialSha = ''
  }
  let commits: UpstreamCommit[] = []
  try {
    const raw = git(rootDir, ['log', '--format=%H%x09%cI%x09%s', `HEAD..${upstreamBranch}`])
    commits = raw.split(/\r?\n/).filter(Boolean).map((line) => {
      const [sha, date, ...rest] = line.split('\t')
      return { sha: sha ?? '', date: date ?? '', title: rest.join('\t') }
    })
  } catch {
    commits = []
  }
  return { officialSha, officialAhead: commits.length, commits }
}

export async function runUpdate(options: UpdateOptions = {}): Promise<void> {
  const rootDir = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
  const localSha = git(rootDir, ['rev-parse', 'HEAD']).trim()
  const localVersion = readPackageVersion(rootDir)

  try {
    const remotes = git(rootDir, ['remote']).split(/\r?\n/)
    if (!remotes.includes('upstream')) {
      git(rootDir, ['remote', 'add', 'upstream', 'https://github.com/deepseek-ai/deepseek-harness.git'])
    }
  } catch (error) {
    fail({
      step: 'fetch',
      rootDir,
      detail: error instanceof Error ? error.message : String(error),
    })
  }

  if (isShallow(rootDir)) {
    process.stdout.write('로컬 Git 계보 복구 중…\n')
    const repaired = repairShallowHistory(rootDir)
    if (!repaired.ok) {
      fail({
        step: 'fetch',
        rootDir,
        detail: repaired.output,
      })
    }
  }
  const shallow = isShallow(rootDir)

  process.stdout.write('공식 저장소 확인 중…\n')
  const fetched = runQuiet('git', ['fetch', 'upstream', '--tags', '--prune'], rootDir)
  const github = await loadGithubCompare()
  let upstreamBranch: 'upstream/master' | 'upstream/main' | undefined
  try {
    upstreamBranch = pickUpstreamBranch(listUpstreamRefs(rootDir))
  } catch {
    upstreamBranch = undefined
  }

  const localFallback = upstreamBranch
    ? localGitPreview(rootDir, upstreamBranch)
    : { officialSha: '', officialAhead: 0, commits: [] as UpstreamCommit[] }

  if (!github && !upstreamBranch) {
    fail({
      step: 'fetch',
      rootDir,
      detail: fetched.ok
        ? 'no upstream default branch (expected upstream/master or upstream/main)'
        : fetched.output,
    })
  }

  const preview = github
    ? previewFromGithubCompare(github.compare, { sha: localSha, version: localVersion, shallow }, {
      sha: github.officialSha || localFallback.officialSha,
      version: github.officialVersion,
    })
    : {
      localSha,
      localVersion,
      officialSha: localFallback.officialSha,
      officialVersion: '',
      officialAhead: localFallback.officialAhead,
      commits: localFallback.commits,
      shallow,
    }

  console.log(formatUpdatePreview(preview))

  if (preview.officialAhead <= 0) {
    console.log('끝. 가져올 공식 업데이트가 없습니다.')
    return
  }

  if (options.dryRun) {
    console.log('미리보기만 했습니다. 적용하려면 `dsh update` 후 y, 또는 `dsh update --yes`.')
    return
  }

  if (!options.yes) {
    const ok = await confirmProceed()
    if (!ok) {
      console.log('취소했습니다. 나중에 `dsh update` 또는 `dsh update --yes`.')
      return
    }
  }

  if (!upstreamBranch) {
    fail({
      step: 'fetch',
      rootDir,
      detail: fetched.ok
        ? 'no upstream default branch (expected upstream/master or upstream/main)'
        : fetched.output,
    })
  }

  process.stdout.write('[1/4] 머지… ')
  const merged = runQuiet('git', ['merge', upstreamBranch, '--no-edit', '--no-stat'], rootDir)
  if (!merged.ok && !mergeInProgress(rootDir)) {
    console.log('실패')
    fail({
      step: 'merge',
      rootDir,
      detail: merged.output,
      conflicts: unmergedFiles(rootDir),
    })
  }
  const continued = continueOfficialMerge(rootDir)
  if (!continued.ok) {
    console.log('실패')
    fail({
      step: 'merge',
      rootDir,
      detail: [merged.ok ? '' : merged.output, continued.output].filter(Boolean).join('\n'),
      conflicts: continued.remaining,
    })
  }
  const extras: string[] = []
  if (!merged.ok && continued.resolved.length > 0) extras.push(`충돌 ${String(continued.resolved.length)}개 넘김`)
  if (continued.kept.length > 0) extras.push('포크 기능 유지')
  console.log(extras.length > 0 ? `완료 (${extras.join(', ')})` : '완료')

  process.stdout.write('[2/4] 의존성… ')
  const installed = runQuiet('pnpm', ['install', '--reporter=silent'], rootDir)
  if (!installed.ok) {
    console.log('실패')
    fail({ step: 'install', rootDir, detail: installed.output })
  }
  console.log('완료')

  process.stdout.write('[3/4] 빌드… ')
  const built = runQuiet('pnpm', ['run', 'build'], rootDir)
  if (!built.ok) {
    console.log('실패')
    fail({ step: 'build', rootDir, detail: built.output })
  }
  console.log('완료')

  process.stdout.write('[4/4] 포크 기능 검사… ')
  const report = verifyCustomFeatures(
    relativePath => existsSync(resolve(rootDir, relativePath)),
    relativePath => readFileSync(resolve(rootDir, relativePath), 'utf8'),
  )
  if (!report.ok) {
    console.log('실패')
    fail({
      step: 'verify',
      rootDir,
      detail: report.checks.filter(check => !check.ok).map(check => `${check.id}: ${check.missing.join(', ')}`).join('\n'),
      missing: report.checks.flatMap(check => check.ok ? [] : check.missing.map(item => `${check.id}: ${item}`)),
    })
  }
  console.log('통과')
  console.log(`완료. ${upstreamBranch} 머지됨. ${FORK_FEATURES.map(feature => feature.id).join(' · ')} 검사 통과`)
}
