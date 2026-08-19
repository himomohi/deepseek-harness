/**
 * Mechanical continuation of an official merge inside `dsh update`.
 * Version-only package.json hunks take the official side; shared files take
 * official text then receive complete fork-feature patches.
 * @module @deepseek-ai/dsh/update-merge
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { compositionalNeedles, type FeatureNeedle } from './custom-features.ts'
import {
  applyForkFeatures,
  forkFeaturePaths,
  forkFeaturesComplete,
} from './update-fork-features.ts'

export { insertCompositionalMarker } from './update-fork-features.ts'

const VERSION_LINE = /^\s*"version"\s*:\s*"[^"]+"\s*,?\s*$/
const LOCKFILE = 'pnpm-lock.yaml'

const FORK_OWNED_PREFIXES = [
  'packages/client/locale-ko/',
  'packages/client/ui-browser-notifications/',
] as const

const FORK_OWNED_FILES = new Set([
  'apps/cli/src/update.ts',
  'apps/cli/src/stop.ts',
  'apps/cli/src/update-merge.ts',
  'apps/cli/src/update-fork-features.ts',
  'apps/cli/src/update-preview.ts',
  'apps/cli/src/custom-features.ts',
])

/** One unmerged path and its working-tree text, if the file still exists. */
export interface UnmergedFile {
  readonly path: string
  readonly content: string | undefined
}

/** Mechanical writes, official lockfile checkout, fork-owned checkout, and leftover paths. */
export interface MergeContinuationPlan {
  readonly writes: readonly { path: string; content: string }[]
  readonly takeTheirs: readonly string[]
  readonly takeOurs: readonly string[]
  readonly unresolved: readonly string[]
}

/** Result of finishing an official merge that Git left in progress. */
export interface MergeContinuationResult {
  readonly ok: boolean
  readonly resolved: readonly string[]
  readonly remaining: readonly string[]
  readonly kept: readonly string[]
  readonly output: string
}

interface TextSegment {
  readonly type: 'text'
  readonly text: string
}

interface ConflictSegment {
  readonly type: 'conflict'
  readonly ours: string
  readonly theirs: string
}

type Segment = TextSegment | ConflictSegment

function git(rootDir: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: { ...process.env, GIT_EDITOR: 'true' },
  })
}

function mergeInProgress(rootDir: string): boolean {
  try {
    git(rootDir, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])
    return true
  } catch {
    return false
  }
}

function listUnmerged(rootDir: string): string[] {
  try {
    return git(rootDir, ['diff', '--name-only', '--diff-filter=U'])
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function parseConflictFile(content: string): Segment[] | undefined {
  const lines = content.split(/\r?\n/)
  const segments: Segment[] = []
  let buffer: string[] = []
  const flushText = (): void => {
    if (buffer.length === 0) return
    segments.push({ type: 'text', text: buffer.join('\n') })
    buffer = []
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (!line.startsWith('<<<<<<<')) {
      buffer.push(line)
      continue
    }
    flushText()
    index += 1
    const ours: string[] = []
    const theirs: string[] = []
    let mode: 'ours' | 'base' | 'theirs' = 'ours'
    let closed = false
    while (index < lines.length) {
      const body = lines[index] ?? ''
      if (body.startsWith('|||||||')) {
        mode = 'base'
        index += 1
        continue
      }
      if (body.startsWith('=======')) {
        mode = 'theirs'
        index += 1
        continue
      }
      if (body.startsWith('>>>>>>>')) {
        closed = true
        break
      }
      if (mode === 'ours') ours.push(body)
      else if (mode === 'theirs') theirs.push(body)
      index += 1
    }
    if (!closed) return undefined
    segments.push({ type: 'conflict', ours: ours.join('\n'), theirs: theirs.join('\n') })
  }
  flushText()
  return segments
}

function isVersionOnly(side: string): boolean {
  const lines = side.split('\n').filter(line => line.trim() !== '')
  return lines.length > 0 && lines.every(line => VERSION_LINE.test(line))
}

function isForkOwnedPath(path: string): boolean {
  return FORK_OWNED_FILES.has(path) || FORK_OWNED_PREFIXES.some(prefix => path.startsWith(prefix))
}

function collapseSide(segments: readonly Segment[], side: 'ours' | 'theirs'): string {
  return segments.map(segment => segment.type === 'text' ? segment.text : segment[side]).join('\n')
}

function allVersionOnly(segments: readonly Segment[]): boolean {
  return segments
    .filter((segment): segment is ConflictSegment => segment.type === 'conflict')
    .every(segment => isVersionOnly(segment.ours) && isVersionOnly(segment.theirs))
}

/**
 * Resolve one unmerged file: official text plus complete fork features.
 * @param path - repository-relative path.
 * @param content - working-tree text that still has Git conflict markers.
 * @param _needles - unused; completeness uses {@link compositionalNeedles}.
 * @returns resolved text, or `undefined` when the file is not a mechanical update.
 */
export function resolveConflictText(
  path: string,
  content: string,
  _needles: readonly FeatureNeedle[] = compositionalNeedles(),
): string | undefined {
  const segments = parseConflictFile(content)
  if (segments === undefined) return undefined
  if (!segments.some(segment => segment.type === 'conflict')) return undefined
  const theirsAll = collapseSide(segments, 'theirs')
  const oursAll = collapseSide(segments, 'ours')
  if (theirsAll.includes('<<<<<<<') || oursAll.includes('<<<<<<<')) return undefined
  const pathNeedles = (_needles.length > 0 ? _needles : compositionalNeedles()).filter(item => item.path === path)
  const oursNeedles = pathNeedles.filter(item => oursAll.includes(item.needle))
  const officialPlus = applyForkFeatures(path, theirsAll)
  if (oursNeedles.length > 0 && oursNeedles.every(item => officialPlus.includes(item.needle))) return officialPlus
  if (oursNeedles.length === 0 && forkFeaturesComplete(path, officialPlus)) return officialPlus
  const oursPlus = applyForkFeatures(path, oursAll)
  if (oursNeedles.length > 0 && oursNeedles.every(item => oursPlus.includes(item.needle))) return oursPlus
  if (allVersionOnly(segments)) return theirsAll
  return undefined
}

/**
 * Decide writes, official lockfile checkout, and leftover unmerged paths.
 * @param files - current unmerged paths and their working-tree text.
 * @param needles - restorable fork needles used for hunk comparison and insert.
 * @returns a plan the updater applies with `git add` / `git show :3:`.
 */
export function planOfficialMergeContinuation(
  files: readonly UnmergedFile[],
  needles: readonly FeatureNeedle[] = compositionalNeedles(),
): MergeContinuationPlan {
  const writes: { path: string; content: string }[] = []
  const takeTheirs: string[] = []
  const takeOurs: string[] = []
  const unresolved: string[] = []
  for (const file of files) {
    if (basename(file.path) === LOCKFILE) {
      takeTheirs.push(file.path)
      continue
    }
    if (file.content === undefined) {
      if (isForkOwnedPath(file.path)) takeOurs.push(file.path)
      else unresolved.push(file.path)
      continue
    }
    const resolved = resolveConflictText(file.path, file.content, needles)
    if (resolved === undefined) unresolved.push(file.path)
    else writes.push({ path: file.path, content: resolved })
  }
  return { writes, takeTheirs, takeOurs, unresolved }
}

/**
 * Apply complete fork features onto files that still have a known hook.
 * @param rootDir - repository root.
 * @returns relative paths that were rewritten.
 */
export function keepCompositionalMarkers(rootDir: string): readonly string[] {
  const kept: string[] = []
  for (const path of forkFeaturePaths()) {
    const abs = resolve(rootDir, path)
    if (!existsSync(abs)) continue
    const current = readFileSync(abs, 'utf8')
    const next = applyForkFeatures(path, current)
    if (next === current) continue
    writeFileSync(abs, next)
    kept.push(path)
  }
  return kept
}

/**
 * Finish an official merge that Git left in progress, then keep restorable markers.
 * @param rootDir - repository root that may have `MERGE_HEAD`.
 * @returns success when no unmerged paths remain and any merge commit completed.
 */
export function continueOfficialMerge(rootDir: string): MergeContinuationResult {
  const conflicts = listUnmerged(rootDir)
  const files: UnmergedFile[] = conflicts.map((path) => {
    const abs = resolve(rootDir, path)
    return { path, content: existsSync(abs) ? readFileSync(abs, 'utf8') : undefined }
  })
  const plan = planOfficialMergeContinuation(files)
  const resolved: string[] = []
  for (const write of plan.writes) {
    try {
      writeFileSync(resolve(rootDir, write.path), write.content)
      git(rootDir, ['add', '--', write.path])
      resolved.push(write.path)
    } catch (error) {
      return {
        ok: false,
        resolved,
        remaining: listUnmerged(rootDir),
        kept: [],
        output: error instanceof Error ? error.message : String(error),
      }
    }
  }
  for (const path of plan.takeTheirs) {
    try {
      const theirs = git(rootDir, ['show', `:3:${path}`])
      writeFileSync(resolve(rootDir, path), theirs)
      git(rootDir, ['add', '--', path])
      resolved.push(path)
    } catch (error) {
      return {
        ok: false,
        resolved,
        remaining: [...new Set([...listUnmerged(rootDir), path])],
        kept: [],
        output: error instanceof Error ? error.message : String(error),
      }
    }
  }
  for (const path of plan.takeOurs) {
    try {
      git(rootDir, ['checkout', '--ours', '--', path])
      git(rootDir, ['add', '--', path])
      resolved.push(path)
    } catch (error) {
      return {
        ok: false,
        resolved,
        remaining: [...new Set([...listUnmerged(rootDir), path])],
        kept: [],
        output: error instanceof Error ? error.message : String(error),
      }
    }
  }
  const remaining = listUnmerged(rootDir)
  if (remaining.length > 0) {
    return {
      ok: false,
      resolved,
      remaining,
      kept: [],
      output: `unmerged after mechanical continue: ${remaining.join(', ')}`,
    }
  }
  let kept: readonly string[] = []
  try {
    kept = keepCompositionalMarkers(rootDir)
    for (const path of kept) git(rootDir, ['add', '--', path])
    if (mergeInProgress(rootDir)) {
      git(rootDir, ['commit', '--no-edit'])
    } else if (kept.length > 0) {
      git(rootDir, ['commit', '-m', 'chore(fork): keep fork features after official merge'])
    }
  } catch (error) {
    return {
      ok: false,
      resolved,
      remaining: listUnmerged(rootDir),
      kept,
      output: error instanceof Error ? error.message : String(error),
    }
  }
  return { ok: true, resolved, remaining: [], kept, output: '' }
}
