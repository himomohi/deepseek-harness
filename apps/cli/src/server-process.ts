/**
 * Detect running `dsh` web servers from a process table, cwd-independent.
 * Matching is command-line based so it works from any directory.
 * @module @deepseek-ai/dsh/server-process
 */

export interface ListedProcess {
  readonly pid: number
  readonly command: string
}

/** True when a process command line is a live dsh web/profile-web server. */
export function isDshServerCommand(command: string): boolean {
  const compact = command.replace(/\s+/g, ' ').trim()
  if (compact === '') return false
  if (/\bdsh(?:\.cmd)?\s+stop\b/i.test(compact)) return false
  if (/\bdsh(?:\.cmd)?\s+update\b/i.test(compact)) return false
  if (/\bdsh(?:\.cmd)?\s+plugin\b/i.test(compact)) return false
  if (/[\\/]vitest[\\/]|\bvitest\s+run\b/.test(compact)) return false
  if (/\bdsh(?:\.cmd)?\s+web\b/i.test(compact)) return true
  if (/[\\/](?:bin\.js|bin\.ts)\s+web\b/.test(compact)) return true
  if (/\bdsh(?:\.cmd)?\s+--profile\s+web\b/i.test(compact) && !/--dump(?:-default)?-config\b/.test(compact)) {
    return true
  }
  return false
}

/** Parse `ps -A -o pid=,args=` (leading spaces allowed). */
export function parsePosixProcessList(text: string): ListedProcess[] {
  const rows: ListedProcess[] = []
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(\d+)\s+(\S.*)$/.exec(line)
    if (match === null) continue
    rows.push({ pid: Number(match[1]), command: match[2] ?? '' })
  }
  return rows
}

/**
 * Parse WMIC CSV `Node,CommandLine,ProcessId` (or any CSV whose last
 * numeric field is the pid and whose CommandLine column is not empty).
 */
export function parseWmicCsv(text: string): ListedProcess[] {
  const rows: ListedProcess[] = []
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length === 0) return rows
  const header = lines[0] ?? ''
  const headers = splitCsv(header).map(cell => cell.toLowerCase())
  const pidIndex = headers.lastIndexOf('processid')
  const cmdIndex = headers.indexOf('commandline')
  if (pidIndex < 0 || cmdIndex < 0) return rows
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line)
    const pid = Number(cells[pidIndex])
    const command = cells[cmdIndex] ?? ''
    if (!Number.isInteger(pid) || pid <= 0) continue
    rows.push({ pid, command })
  }
  return rows
}

function splitCsv(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index)
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

export function selectDshServers(rows: readonly ListedProcess[], selfPid: number): ListedProcess[] {
  return rows.filter(row => row.pid !== selfPid && isDshServerCommand(row.command))
}
