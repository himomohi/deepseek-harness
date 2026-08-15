import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { repairShallowHistory } from '../src/update.ts'

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

describe('update shallow-history repair', () => {
  it('restores hidden parents without rewriting the checked-out branch', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-update-history-'))
    const origin = join(root, 'origin.git')
    const source = join(root, 'source')
    const checkout = join(root, 'checkout')
    try {
      git(root, ['init', '--bare', origin])
      git(root, ['init', source])
      git(source, ['config', 'user.name', 'DeepSeek Harness Test'])
      git(source, ['config', 'user.email', 'test@example.invalid'])
      writeFileSync(join(source, 'history.txt'), 'one\n')
      git(source, ['add', 'history.txt'])
      git(source, ['commit', '-m', 'first'])
      writeFileSync(join(source, 'history.txt'), 'two\n')
      git(source, ['commit', '-am', 'second'])
      git(source, ['remote', 'add', 'origin', origin])
      git(source, ['push', 'origin', 'HEAD:master'])
      git(root, [
        'clone',
        '--depth=1',
        '--branch',
        'master',
        pathToFileURL(origin).href,
        checkout,
      ])

      const before = git(checkout, ['rev-parse', 'HEAD']).trim()
      expect(git(checkout, ['rev-parse', '--is-shallow-repository']).trim()).toBe('true')

      expect(repairShallowHistory(checkout)).toEqual({ ok: true, output: '' })
      expect(git(checkout, ['rev-parse', '--is-shallow-repository']).trim()).toBe('false')
      expect(git(checkout, ['rev-parse', 'HEAD']).trim()).toBe(before)
      expect(git(checkout, ['rev-list', '--count', 'HEAD']).trim()).toBe('2')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
