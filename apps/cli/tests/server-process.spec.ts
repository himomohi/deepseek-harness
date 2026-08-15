import { describe, expect, it } from 'vitest'
import {
  isDshServerCommand,
  parsePosixProcessList,
  parseWmicCsv,
  selectDshServers,
} from '../src/server-process.ts'

describe('isDshServerCommand', () => {
  it('matches dsh web and the bin entry with web', () => {
    expect(isDshServerCommand('dsh')).toBe(true)
    expect(isDshServerCommand('node --import tsx/esm /repo/apps/cli/src/bin.ts')).toBe(true)
    expect(isDshServerCommand('node /repo/apps/cli/lib/bin.js')).toBe(true)
    expect(isDshServerCommand('node /global/@deepseek-ai/dsh/lib/bin.js')).toBe(true)
    expect(isDshServerCommand('dsh --port 3080 --no-open')).toBe(true)
    expect(isDshServerCommand('node /global/@deepseek-ai/dsh/lib/bin.js --no-open')).toBe(true)
    expect(isDshServerCommand('node /Users/a/Dev/deepseek-harness/apps/cli/lib/bin.js web --host 127.0.0.1')).toBe(true)
    expect(isDshServerCommand('node --import tsx/esm apps/cli/src/bin.ts web')).toBe(true)
    expect(isDshServerCommand('dsh web --port 3080')).toBe(true)
    expect(isDshServerCommand('C:\\\\Users\\\\a\\\\AppData\\\\Roaming\\\\npm\\\\dsh.cmd web')).toBe(true)
    expect(isDshServerCommand('dsh --profile web --trusted-host example')).toBe(true)
  })

  it('ignores stop, update, plugin, dumps, and tests', () => {
    expect(isDshServerCommand('dsh stop')).toBe(false)
    expect(isDshServerCommand('dsh update --yes')).toBe(false)
    expect(isDshServerCommand('dsh plugin --profile web add x')).toBe(false)
    expect(isDshServerCommand('dsh --profile web --dump-config')).toBe(false)
    expect(isDshServerCommand('dsh --help')).toBe(false)
    expect(isDshServerCommand('node node_modules/vitest/vitest.mjs run apps/cli/tests')).toBe(false)
    expect(isDshServerCommand('node /another/project/lib/bin.js')).toBe(false)
    expect(isDshServerCommand('node idle-game/vite')).toBe(false)
  })
})

describe('parsePosixProcessList', () => {
  it('reads pid and command', () => {
    const rows = parsePosixProcessList([
      '  13317 node /repo/apps/cli/lib/bin.js web --host 127.0.0.1',
      '26460 dsh stop',
      'not a process',
    ].join('\n'))
    expect(rows).toEqual([
      { pid: 13317, command: 'node /repo/apps/cli/lib/bin.js web --host 127.0.0.1' },
      { pid: 26460, command: 'dsh stop' },
    ])
  })
})

describe('parseWmicCsv', () => {
  it('reads CommandLine and ProcessId from a Node CSV header', () => {
    const text = [
      'Node,CommandLine,ProcessId',
      'BOX,"node C:\\dsh\\apps\\cli\\lib\\bin.js web",4242',
      'BOX,"dsh stop",99',
    ].join('\r\n')
    expect(parseWmicCsv(text)).toEqual([
      { pid: 4242, command: 'node C:\\dsh\\apps\\cli\\lib\\bin.js web' },
      { pid: 99, command: 'dsh stop' },
    ])
  })
})

describe('selectDshServers', () => {
  it('drops the current process and non-servers', () => {
    const selected = selectDshServers([
      { pid: 1, command: 'dsh web' },
      { pid: 2, command: 'dsh stop' },
      { pid: 3, command: 'dsh web --port 3080' },
    ], 1)
    expect(selected.map(row => row.pid)).toEqual([3])
  })
})
