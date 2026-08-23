/**
 * Keep this fork's GitHub automation files available for deliberate reconnects
 * without allowing upstream triggers or scheduled updates to execute automatically.
 * @module @deepseek-ai/dsh/fork-automation-policy
 */

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, extname, relative, resolve } from 'node:path'

const WORKFLOW_DIRECTORY = '.github/workflows'
const ARCHIVE_DIRECTORY = '.github/disabled-workflows'
const DEPENDABOT_PATH = '.github/dependabot.yml'
const WORKFLOW_EXTENSION = /\.(?:yml|yaml)$/u
const AUTOMATIC_TRIGGER = new RegExp(
  String.raw`^\s+(?:push|pull_request|pull_request_target|schedule|issues|issue_comment|`
  + String.raw`pull_request_review|pull_request_review_comment|workflow_call|workflow_run|repository_dispatch):`,
  'mu',
)

/** Marker shared by every active workflow stub in this fork. */
export const DISABLED_WORKFLOW_MARKER = '# dsh-fork-automation: disabled'

/** Relative paths used by the fork automation policy. */
export const FORK_AUTOMATION_PATHS = {
  workflows: WORKFLOW_DIRECTORY,
  archive: ARCHIVE_DIRECTORY,
  dependabot: DEPENDABOT_PATH,
} as const

/** Files changed while applying the fork automation policy. */
export interface ForkAutomationPolicyResult {
  readonly changed: readonly string[]
  readonly archived: readonly string[]
}

/** Result of checking all protected automation files currently present in the checkout. */
export interface ForkAutomationPolicyReport {
  readonly ok: boolean
  readonly active: readonly string[]
  readonly nonCompliant: readonly string[]
}

function repositoryPath(rootDir: string, path: string): string {
  return relative(rootDir, resolve(rootDir, path)).replaceAll('\\', '/')
}

function workflowPaths(rootDir: string): string[] {
  const directory = resolve(rootDir, WORKFLOW_DIRECTORY)
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && WORKFLOW_EXTENSION.test(entry.name))
    .map(entry => `${WORKFLOW_DIRECTORY}/${entry.name}`)
    .sort()
}

function protectedAutomationPaths(rootDir: string): string[] {
  const paths = workflowPaths(rootDir)
  if (existsSync(resolve(rootDir, DEPENDABOT_PATH))) paths.push(DEPENDABOT_PATH)
  return paths.sort()
}

function archivePath(rootDir: string, workflowPath: string, content: string): string {
  const name = basename(workflowPath)
  const primary = resolve(rootDir, ARCHIVE_DIRECTORY, name)
  if (!existsSync(primary) || readFileSync(primary, 'utf8') === content) return primary
  const digest = createHash('sha256').update(content).digest('hex').slice(0, 12)
  return resolve(rootDir, ARCHIVE_DIRECTORY, `${name}.${digest}.upstream`)
}

function archiveOriginal(rootDir: string, workflowPath: string, content: string): string | undefined {
  const target = archivePath(rootDir, workflowPath, content)
  if (existsSync(target) && readFileSync(target, 'utf8') === content) return undefined
  mkdirSync(resolve(rootDir, ARCHIVE_DIRECTORY), { recursive: true })
  writeFileSync(target, content)
  return repositoryPath(rootDir, target)
}

/**
 * Return the manual-only replacement for one workflow filename.
 * @param workflowPath - repository-relative workflow path.
 * @returns a valid workflow that can only be dispatched manually and explains the archive.
 */
export function disabledWorkflowStub(workflowPath: string): string {
  const label = basename(workflowPath, extname(workflowPath)).replaceAll(/[^A-Za-z0-9_.-]/gu, '-')
  return [
    DISABLED_WORKFLOW_MARKER,
    '# The upstream workflow is archived under .github/disabled-workflows/.',
    '# Re-enable it only after explicitly configuring this personal fork.',
    `name: dsh fork automation disabled - ${label}`,
    'on:',
    '  workflow_dispatch:',
    'jobs:',
    '  disabled:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Explain disabled workflow',
    '        run: |',
    `          echo "${workflowPath} is disabled in this fork."`,
    '          echo "See .github/fork-automation-policy.md before reconnecting it."',
    '',
  ].join('\n')
}

/**
 * Return the empty Dependabot configuration used while automation is disabled.
 * @returns a valid configuration with no update targets.
 */
export function disabledDependabotConfig(): string {
  return [
    DISABLED_WORKFLOW_MARKER,
    '# The upstream Dependabot configuration is archived under .github/disabled-workflows/.',
    '# Restore it only after explicitly reconnecting fork automation.',
    'version: 2',
    'updates: []',
    '',
  ].join('\n')
}

/**
 * Identify a workflow path protected by the fork policy.
 * @param path - repository-relative path.
 * @returns true for a YAML workflow under `.github/workflows`.
 */
export function isDisabledWorkflowPath(path: string): boolean {
  return path.startsWith(`${WORKFLOW_DIRECTORY}/`) && WORKFLOW_EXTENSION.test(path)
}

/**
 * Identify an active workflow that has already been replaced by the policy stub.
 * When the path is supplied, require the exact generated stub for that filename.
 * @param content - workflow text.
 * @param workflowPath - optional repository-relative workflow path.
 * @returns true when the policy stub is present without an automatic trigger.
 */
export function isDisabledWorkflowContent(content: string, workflowPath?: string): boolean {
  if (workflowPath !== undefined) return content === disabledWorkflowStub(workflowPath)
  return content.includes(DISABLED_WORKFLOW_MARKER)
    && /^on:\s*$/mu.test(content)
    && /^\s{2}workflow_dispatch:\s*$/mu.test(content)
    && !AUTOMATIC_TRIGGER.test(content)
}

function isDisabledAutomationContent(content: string, path: string): boolean {
  return path === DEPENDABOT_PATH
    ? content === disabledDependabotConfig()
    : isDisabledWorkflowContent(content, path)
}

/**
 * Identify a workflow or Dependabot path protected by this fork policy.
 * @param path - repository-relative path.
 * @returns true for an automation file whose upstream version must not be active.
 */
export function isProtectedAutomationPath(path: string): boolean {
  return path === DEPENDABOT_PATH || isDisabledWorkflowPath(path)
}

/**
 * Return the manual-only replacement for any protected automation file.
 * @param path - repository-relative workflow or Dependabot path.
 * @returns the policy stub for that path.
 */
export function disabledAutomationStub(path: string): string {
  return path === DEPENDABOT_PATH ? disabledDependabotConfig() : disabledWorkflowStub(path)
}

/**
 * Archive active upstream automation files and replace them with disabled stubs.
 * Existing archives are preserved; changed upstream copies receive a short hash
 * suffix so a later reconnect can choose the desired version deliberately.
 * @param rootDir - repository root.
 * @returns active stubs changed and original files archived.
 */
export function applyForkAutomationPolicy(rootDir: string): ForkAutomationPolicyResult {
  const changed: string[] = []
  const archived: string[] = []
  for (const path of protectedAutomationPaths(rootDir)) {
    const abs = resolve(rootDir, path)
    const current = readFileSync(abs, 'utf8')
    if (isDisabledAutomationContent(current, path)) continue
    const archive = archiveOriginal(rootDir, path, current)
    if (archive !== undefined) archived.push(archive)
    const stub = disabledAutomationStub(path)
    if (stub !== current) {
      writeFileSync(abs, stub)
      changed.push(path)
    }
  }
  return { changed, archived }
}

/**
 * Verify that every protected automation file currently tracked by the checkout is disabled.
 * @param rootDir - repository root.
 * @returns active automation paths and any files that do not contain the policy stub.
 */
export function verifyForkAutomationPolicy(rootDir: string): ForkAutomationPolicyReport {
  const active = protectedAutomationPaths(rootDir)
  const nonCompliant = active.filter(path => !isDisabledAutomationContent(readFileSync(resolve(rootDir, path), 'utf8'), path))
  return { ok: nonCompliant.length === 0, active, nonCompliant }
}
