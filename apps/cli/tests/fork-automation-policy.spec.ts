import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyForkAutomationPolicy,
  disabledDependabotConfig,
  disabledWorkflowStub,
  DISABLED_WORKFLOW_MARKER,
  isDisabledWorkflowContent,
  verifyForkAutomationPolicy,
} from '../src/fork-automation-policy.ts'

describe('fork automation policy', () => {
  it('creates a manual-only stub without automatic triggers', () => {
    const stub = disabledWorkflowStub('.github/workflows/e2e.yml')
    expect(stub).toContain(DISABLED_WORKFLOW_MARKER)
    expect(stub).toContain('workflow_dispatch:')
    expect(stub).not.toMatch(/^\s+(push|pull_request|schedule|issues|pull_request_review|workflow_call):/mu)
  })

  it('does not trust a marker if an automatic trigger is added', () => {
    const tampered = `${disabledWorkflowStub('.github/workflows/e2e.yml')}\n  push:\n`
    expect(isDisabledWorkflowContent(tampered)).toBe(false)
  })

  it('archives an upstream workflow and remains idempotent', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-fork-automation-'))
    try {
      const workflow = join(root, '.github/workflows/ci.yml')
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      const original = 'name: upstream\non:\n  push:\n    branches: [master]\n'
      writeFileSync(workflow, original)

      const first = applyForkAutomationPolicy(root)
      expect(first.changed).toEqual(['.github/workflows/ci.yml'])
      expect(first.archived).toEqual(['.github/disabled-workflows/ci.yml'])
      expect(readFileSync(workflow, 'utf8')).toBe(disabledWorkflowStub('.github/workflows/ci.yml'))
      expect(readFileSync(join(root, first.archived[0] as string), 'utf8')).toBe(original)
      expect(verifyForkAutomationPolicy(root).ok).toBe(true)

      expect(applyForkAutomationPolicy(root)).toEqual({ changed: [], archived: [] })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('disables scheduled Dependabot updates while preserving the original', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-fork-dependabot-'))
    try {
      const config = join(root, '.github/dependabot.yml')
      mkdirSync(join(root, '.github'), { recursive: true })
      const original = 'version: 2\nupdates:\n  - package-ecosystem: npm\n'
      writeFileSync(config, original)

      const result = applyForkAutomationPolicy(root)
      expect(result.changed).toEqual(['.github/dependabot.yml'])
      expect(result.archived).toEqual(['.github/disabled-workflows/dependabot.yml'])
      expect(readFileSync(config, 'utf8')).toBe(disabledDependabotConfig())
      expect(readFileSync(join(root, result.archived[0] as string), 'utf8')).toBe(original)
      expect(verifyForkAutomationPolicy(root).ok).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
