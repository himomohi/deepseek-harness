/**
 * Handler for `dsh stop`: find every live dsh web server on this machine
 * (any cwd) and terminate it. Uses the OS process table, not a lock file.
 * @module @deepseek-ai/dsh/stop
 */

import { execFileSync } from 'node:child_process'
import {
  parsePosixProcessList,
  parseWmicCsv,
  selectDshServers,
  type ListedProcess,
} from './server-process.ts'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function listAllProcesses(): ListedProcess[] {
  if (process.platform === 'win32') {
    const output = execFileSync(
      'wmic',
      ['process', 'get', 'ProcessId,CommandLine', '/FORMAT:CSV'],
      { encoding: 'utf8', shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return parseWmicCsv(output)
  }
  const output = execFileSync('ps', ['-A', '-o', 'pid=,args='], {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return parsePosixProcessList(output)
}

function terminate(pid: number): void {
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T'], {
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch {
      // already gone
    }
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // already gone
  }
}

function forceKill(pid: number): void {
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch {
      // already gone
    }
    return
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // already gone
  }
}

export async function runStop(): Promise<void> {
  let found: ListedProcess[]
  try {
    found = selectDshServers(listAllProcesses(), process.pid)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('dsh 서버 목록을 읽지 못했습니다.')
    console.error(detail)
    process.exit(1)
  }

  if (found.length === 0) {
    console.log('실행 중인 dsh 서버가 없습니다.')
    return
  }

  for (const row of found) {
    console.log(`중지  pid ${row.pid}`)
    terminate(row.pid)
  }

  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    if (found.every(row => !isAlive(row.pid))) break
    await sleep(150)
  }

  const leftover = found.filter(row => isAlive(row.pid))
  for (const row of leftover) {
    console.log(`강제 종료  pid ${row.pid}`)
    forceKill(row.pid)
  }

  const still = leftover.filter(row => isAlive(row.pid))
  if (still.length > 0) {
    console.error(`종료하지 못함: ${still.map(row => row.pid).join(', ')}`)
    process.exit(1)
  }
  console.log(`완료. ${String(found.length)}개 서버를 중지했습니다.`)
}
