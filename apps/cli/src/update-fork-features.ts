/**
 * Complete fork-feature patches applied during `dsh update`.
 * Official text is the base; each function is idempotent and writes the
 * working feature, not a verification-only substring.
 * @module @deepseek-ai/dsh/update-fork-features
 */

import { compositionalNeedles, FORK_FEATURES } from './custom-features.ts'

const PARSE_HOOK = /try \{\r?\n    program\.parse/
const THIN_INTERNALS = 'export const internals: { resolveDistIndex: () => string } = { resolveDistIndex }'
const OFFICIAL_PROFILE_REQUIRED = new RegExp(
  String.raw`if \(options\.profile === undefined\) \{\r?\n`
  + String.raw`        program\.error\('error: --profile <name> is required'\)\r?\n`
  + String.raw`      \}`,
)

const UPDATE_COMMAND = [
  "  program.command('update').description('preview official commits, confirm, then merge/rebuild/verify')",
  "    .option('-y, --yes', 'skip the confirmation prompt')",
  "    .option('--dry-run', 'print the preview and exit without merging')",
  '    .action((options: { yes?: boolean; dryRun?: boolean }) => {',
  "      rejectParentOptions('update')",
  '      resolved = { mode: \'update\', yes: options.yes === true, dryRun: options.dryRun === true }',
  '    })',
  '',
].join('\n')

const STOP_COMMAND = [
  "  program.command('stop').description('find and stop running dsh web servers on this machine')",
  '    .action(() => {',
  "      rejectParentOptions('stop')",
  "      resolved = { mode: 'stop' }",
  '    })',
  '',
].join('\n')

const FORK_PROFILE_HANDLE = [
  'if (options.profile === undefined) {',
  '        const first = args[0]',
  "        if (first === '-h' || first === '--help') program.help()",
  "        if (first !== undefined && !first.startsWith('-')) {",
  '          program.error(`error: unexpected command ${JSON.stringify(first)}; use \\`dsh web\\` or \\`dsh --profile <name>\\``)',
  '        }',
  '      }',
].join('\n')

const PHONE_CSS: Readonly<Record<string, string>> = {
  'packages/client/ui-settings-general/src/client/SettingsRoot.module.css': [
    '',
    '/* Phone / narrow: the 188px nav + leftover content column squeezes CJK',
    '   into a one-character strip. Stack the rail, then the page. */',
    '@media (max-width: 720px) {',
    '  .overlay {',
    '    align-items: stretch;',
    '    justify-content: stretch;',
    '  }',
    '',
    '  .panel {',
    '    width: 100%;',
    '    height: 100%;',
    '    max-width: none;',
    '    border-radius: 0;',
    '    flex-direction: column;',
    '  }',
    '',
    '  .nav {',
    '    width: 100%;',
    '    padding: 16px 12px 8px;',
    '    gap: 10px;',
    '  }',
    '',
    '  .navList {',
    '    flex-direction: row;',
    '    flex-wrap: wrap;',
    '    gap: 4px;',
    '  }',
    '',
    '  .navCell {',
    '    flex: 1 1 calc(50% - 4px);',
    '    min-width: 0;',
    '  }',
    '',
    '  .navLabel {',
    '    white-space: normal;',
    '  }',
    '',
    '  .content {',
    '    min-height: 0;',
    '  }',
    '',
    '  .options {',
    '    padding: 0 16px 24px;',
    '  }',
    '}',
    '',
  ].join('\n'),
  'packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.module.css': [
    '',
    '@media (max-width: 720px) {',
    '  .tabs {',
    '    flex-wrap: wrap;',
    '    gap: 8px 16px;',
    '  }',
    '',
    '  .heading,',
    '  .intro {',
    '    overflow-wrap: anywhere;',
    '  }',
    '}',
    '',
  ].join('\n'),
  'packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css': [
    '',
    '@media (max-width: 720px) {',
    '  .root {',
    '    --dsh-composer-side-clearance: 10px;',
    '  }',
    '',
    '  .header {',
    '    padding: 8px 12px 0 12px;',
    '  }',
    '',
    '  .headerUtilities {',
    '    margin-left: 8px;',
    '  }',
    '',
    '  .tabs {',
    '    gap: 16px;',
    '    padding-left: 4px;',
    '    overflow-x: auto;',
    '    scrollbar-width: none;',
    '  }',
    '}',
    '',
  ].join('\n'),
}

const STUB_PHONE_CSS = [
  '@media (max-width: 720px) {',
  '  .root {',
  '    max-width: 100%;',
  '  }',
  '}',
].join('\n')

const BROWSER_LAUNCH_HELPERS = `
interface BrowserLaunchCommand {
  command: string
  args: string[]
}

/** Resolve the operating-system handoff command for one local Web URL. */
function browserLaunchCommand(platform: NodeJS.Platform, url: string): BrowserLaunchCommand {
  if (platform === 'win32') {
    return { command: 'cmd.exe', args: ['/d', '/s', '/c', 'start', '', url] }
  }
  if (platform === 'darwin') return { command: 'open', args: [url] }
  return { command: 'xdg-open', args: [url] }
}

/** User-visible progress text for the default-browser handoff. */
function browserOpeningMessage(locale: string, url: string): string {
  const language = locale.toLowerCase()
  if (language.startsWith('ko')) return \`기본 브라우저에서 DeepSeek Harness를 여는 중… \${url}\`
  if (language.startsWith('zh')) return \`正在默认浏览器中打开 DeepSeek Harness… \${url}\`
  return \`Opening DeepSeek Harness in the default browser… \${url}\`
}

/** Read the macOS user locale without a shell. */
function readMacLocale(): string {
  return execFileSync('defaults', ['read', '-g', 'AppleLocale'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

/** Best-effort locale used only for the terminal's browser-launch message. */
function systemLocale(
  platform: NodeJS.Platform = process.platform,
  lcAll: string | undefined = process.env['LC_ALL'],
  lang: string | undefined = process.env['LANG'],
  resolveLocale: () => string = () => Intl.DateTimeFormat().resolvedOptions().locale,
  readAppleLocale: () => string = readMacLocale,
): string {
  if (platform === 'darwin') {
    try {
      const locale = readAppleLocale()
      if (locale) return locale
    } catch {
      // \`defaults\` may be absent in a restricted runtime; environment and Intl follow.
    }
  }
  if (lcAll) return lcAll
  if (lang) return lang
  try {
    return resolveLocale() || 'en'
  } catch {
    return 'en'
  }
}

/** Hand the URL to the desktop without keeping its short-lived helper referenced. */
function launchDefaultBrowser(url: string): void {
  const launch = browserLaunchCommand(process.platform, url)
  try {
    const child = spawn(launch.command, launch.args, {
      stdio: 'ignore',
      windowsHide: true,
    })
    child.once('error', (error) => {
      console.warn(\`dsh web: could not open the default browser (\${error.message}); open \${url} manually\`)
    })
    child.unref()
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    console.warn(\`dsh web: could not open the default browser (\${detail}); open \${url} manually\`)
  }
}

/** Test hooks for built-dist resolution and platform browser handoff. */
export const internals: {
  resolveDistIndex: () => string
  browserLaunchCommand: (platform: NodeJS.Platform, url: string) => BrowserLaunchCommand
  browserOpeningMessage: (locale: string, url: string) => string
  readMacLocale: () => string
  systemLocale: (
    platform?: NodeJS.Platform,
    lcAll?: string,
    lang?: string,
    resolveLocale?: () => string,
    readAppleLocale?: () => string,
  ) => string
  openBrowser: (url: string) => void
} = {
  resolveDistIndex,
  browserLaunchCommand,
  browserOpeningMessage,
  readMacLocale,
  systemLocale,
  openBrowser: launchDefaultBrowser,
}
`

const FRAME_QUEUE_TAKE = [
  '  /** Remove the next buffered item; callers prove that one exists. */',
  '  private take(): F {',
  '    const item = this.buffer[this.readIndex] as F',
  '    this.readIndex += 1',
  '    if (this.readIndex === this.buffer.length) {',
  '      this.buffer.length = 0',
  '      this.readIndex = 0',
  '    } else if (this.readIndex >= 1_024 && this.readIndex * 2 >= this.buffer.length) {',
  '      this.buffer.splice(0, this.readIndex)',
  '      this.readIndex = 0',
  '    }',
  '    return item',
  '  }',
  '',
].join('\n')

const SDK_TAKE_QUEUED = [
  '  /** Remove one queued notification in amortized constant time. */',
  '  private takeQueued(): HarnessNotification | undefined {',
  '    if (this.state.queueReadIndex >= this.state.queue.length) return undefined',
  '    const queued = this.state.queue[this.state.queueReadIndex] as HarnessNotification',
  '    this.state.queueReadIndex += 1',
  '    if (this.state.queueReadIndex === this.state.queue.length) {',
  '      this.state.queue.length = 0',
  '      this.state.queueReadIndex = 0',
  '    } else if (this.state.queueReadIndex >= 1_024 && this.state.queueReadIndex * 2 >= this.state.queue.length) {',
  '      this.state.queue.splice(0, this.state.queueReadIndex)',
  '      this.state.queueReadIndex = 0',
  '    }',
  '    return queued',
  '  }',
  '',
].join('\n')

const SDK_TAKE_WAITER = [
  '  /** Remove one pending consumer in amortized constant time. */',
  '  private takeWaiter(): SubscriptionState[\'waiters\'][number] | undefined {',
  '    if (this.state.waiterReadIndex >= this.state.waiters.length) return undefined',
  '    const waiter = this.state.waiters[this.state.waiterReadIndex] as SubscriptionState[\'waiters\'][number]',
  '    this.state.waiterReadIndex += 1',
  '    if (this.state.waiterReadIndex === this.state.waiters.length) {',
  '      this.state.waiters.length = 0',
  '      this.state.waiterReadIndex = 0',
  '    } else if (this.state.waiterReadIndex >= 1_024',
  '      && this.state.waiterReadIndex * 2 >= this.state.waiters.length) {',
  '      this.state.waiters.splice(0, this.state.waiterReadIndex)',
  '      this.state.waiterReadIndex = 0',
  '    }',
  '    return waiter',
  '  }',
  '',
].join('\n')

function insertYamlRow(content: string, afterId: string, afterName: string, rowId: string, rowName: string): string {
  if (content.includes(rowName)) return content
  const localeRow = new RegExp(
    `^([ \\t]*)- id: ${afterId}\\r?\\n\\1  name: '${afterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[ \\t]*$`,
    'm',
  )
  const match = localeRow.exec(content)
  if (match === null) return content
  const indent = match[1] ?? ''
  return content.replace(match[0], `${match[0]}\n${indent}- id: ${rowId}\n${indent}  name: '${rowName}'`)
}

function applyLocaleKo(content: string): string {
  return insertYamlRow(
    content,
    'locale',
    '@deepseek-ai/dsh-client-locale',
    'locale-ko',
    '@deepseek-ai/dsh-client-locale-ko',
  )
}

function applyBrowserNotifications(content: string): string {
  const withLocale = applyLocaleKo(content)
  if (withLocale.includes('@deepseek-ai/dsh-client-ui-browser-notifications')) return withLocale
  return insertYamlRow(
    withLocale,
    'ui-settings-general',
    '@deepseek-ai/dsh-client-ui-settings-general',
    'ui-browser-notifications',
    '@deepseek-ai/dsh-client-ui-browser-notifications',
  )
}

function applyOpenBrowserYml(content: string): string {
  if (content.includes('openBrowser: !!js ctx.webStartup.openBrowser')) return content
  const printUrl = /^([ \t]*)printUrl:[^\n]*$/m
  const match = printUrl.exec(content)
  if (match === null) return content
  const indent = match[1] ?? ''
  return content.replace(match[0], `${match[0]}\n${indent}openBrowser: !!js ctx.webStartup.openBrowser`)
}

function applyDefaultWeb(content: string): string {
  let next = content
  if (OFFICIAL_PROFILE_REQUIRED.test(next)) {
    next = next.replace(OFFICIAL_PROFILE_REQUIRED, FORK_PROFILE_HANDLE)
  }
  if (!next.includes("const profile = options.profile ?? 'web'")) {
    next = next.replace(/const profile = options\.profile(;?)$/m, "const profile = options.profile ?? 'web'$1")
  }
  return next
}

function insertBeforeParse(content: string, block: string): string {
  if (!content.includes('rejectParentOptions') || !PARSE_HOOK.test(content)) return content
  if (content.includes(block.split('\n', 1)[0] ?? '')) return content
  return content.replace(PARSE_HOOK, `${block}$&`)
}

function applyUpdateCommand(content: string): string {
  if (content.includes("program.command('update')")) return content
  return insertBeforeParse(content, UPDATE_COMMAND)
}

function applyStopCommand(content: string): string {
  if (content.includes("program.command('stop')")) return content
  return insertBeforeParse(content, STOP_COMMAND)
}

function applyPhoneLayout(path: string, content: string): string {
  const block = PHONE_CSS[path]
  if (block === undefined) return content
  if (content.includes(STUB_PHONE_CSS)) return content.replace(STUB_PHONE_CSS, block.trim())
  if (content.includes('@media (max-width: 720px)')) return content
  return `${content.replace(/\s*$/, '')}\n${block}`
}

function applyHeroZh(content: string): string {
  return content.replace("'hero.headline': '探索未至之境'", "'hero.headline': 'DeepSeek'")
}

function ensureChildProcessImports(content: string): string {
  let next = content
  const names = ['execFileSync', 'spawn']
  for (const name of names) {
    if (new RegExp(`\\b${name}\\b`).test(next) && next.includes("from 'node:child_process'")) continue
    if (next.includes("from 'node:child_process'")) {
      next = next.replace(
        /import \{([^}]+)\} from 'node:child_process'/,
        (full, inner: string) => (inner.includes(name) ? full : `import { ${inner.replace(/^\s+|\s+$/g, '')}, ${name} } from 'node:child_process'`),
      )
      continue
    }
    next = next.replace(/^import /m, `import { ${name} } from 'node:child_process'\nimport `)
  }
  return next
}

function applyBrowserAutoOpenTs(content: string): string {
  let next = content
  if (!next.includes('openBrowser: boolean')) {
    next = next.replace(
      '  printUrl: boolean\n',
      '  printUrl: boolean\n  /** Open the canonical URL after settled startup. */\n  openBrowser: boolean\n',
    )
  }
  if (!next.includes('openBrowser: z.boolean()')) {
    next = next.replace(
      '  printUrl: z.boolean().default(true),\n',
      '  printUrl: z.boolean().default(true),\n  openBrowser: z.boolean().default(false),\n',
    )
  }
  next = ensureChildProcessImports(next)
  if (next.includes(THIN_INTERNALS) && !next.includes('function launchDefaultBrowser')) {
    next = next.replace(THIN_INTERNALS, BROWSER_LAUNCH_HELPERS.trim())
  }
  if (next.includes('internals.openBrowser(url)')) return next
  if (next.includes('if (config.openBrowser)')) {
    return next.replace(/if \(config\.openBrowser\) \{\r?\n/, match => `${match}        internals.openBrowser(url)\n`)
  }
  if (/console\.log\(`dsh web:/.test(next)) {
    if (!next.includes('const url = localWebUrl(ctx)')) {
      next = next.replace(
        /const printUrl = \(\): void => \{\r?\n/,
        'const printUrl = (): void => {\n      const url = localWebUrl(ctx)\n',
      )
    }
    return next.replace(
      /console\.log\(`dsh web:[\s\S]*?`\)/,
      log => `${log.replace('${localWebUrl(ctx)}', '${url}')}\n`
        + '      if (config.openBrowser) {\n'
        + '        console.log(browserOpeningMessage(systemLocale(), url))\n'
        + '        internals.openBrowser(url)\n'
        + '      }',
    )
  }
  if (next.includes('localWebUrl(ctx)')) {
    return next.replace(
      /const url = localWebUrl\(ctx\)\r?\n/,
      match => `${match}      if (config.openBrowser) internals.openBrowser(url)\n`,
    )
  }
  return next
}

function applyApiProxyQueue(content: string): string {
  if (content.includes('private readIndex = 0') && content.includes('this.readIndex += 1')) return content
  if (!content.includes('class FrameQueue') || !content.includes('this.buffer.shift()')) return content
  let next = content
  if (!next.includes('private readIndex = 0')) {
    next = next.replace(/private buffer: F\[\] = \[\]\n/, 'private buffer: F[] = []\n  private readIndex = 0\n')
  }
  if (!next.includes('private take():')) {
    next = next.replace(
      /async \*iterate\(signal: AbortSignal, cleanup: \(\) => void\): AsyncGenerator<F> \{/,
      `${FRAME_QUEUE_TAKE}  async *iterate(signal: AbortSignal, cleanup: () => void): AsyncGenerator<F> {`,
    )
  }
  if (!next.includes('const aborted = (): boolean => signal.aborted')) {
    next = next.replace(
      /const onAbort = \(\): void => \{ this\.end\(\) \}\n/,
      'const onAbort = (): void => { this.end() }\n    const aborted = (): boolean => signal.aborted\n',
    )
  }
  next = next.replace(
    /while \(this\.buffer\.length > 0\) yield this\.buffer\.shift\(\) as F/,
    `if (aborted()) return
        while (this.readIndex < this.buffer.length) {
          if (aborted()) return
          yield this.take()
        }`,
  )
  next = next.replace(/if \(this\.done \|\| signal\.aborted\) return/, 'if (this.done || aborted()) return')
  if (!next.includes('this.buffer.length = 0')) {
    next = next.replace(
      /finally \{\n      signal\.removeEventListener\('abort', onAbort\)\n      cleanup\(\)/,
      `finally {
      this.done = true
      this.buffer.length = 0
      this.readIndex = 0
      this.waiter = undefined
      signal.removeEventListener('abort', onAbort)
      cleanup()`,
    )
  }
  return next
}

function applyWebApiClientQueue(content: string): string {
  if (content.includes('let readIndex = 0') && content.includes('readIndex += 1')) return content
  if (!content.includes('inbox.shift()')) return content
  let next = content
  if (!next.includes('let readIndex = 0')) {
    next = next.replace('const inbox: SocketItem<F>[] = []\n', 'const inbox: SocketItem<F>[] = []\n    let readIndex = 0\n')
  }
  if (!next.includes('const take = ():')) {
    const officialEnqueue = new RegExp(
      String.raw`const enqueue = \(item: SocketItem<F>\): void => \{\n`
      + String.raw`      inbox\.push\(item\)\n`
      + String.raw`      wake\?\.\(\)\n`
      + String.raw`      wake = undefined\n`
      + String.raw`    \}\n`,
    )
    next = next.replace(
      officialEnqueue,
      `const enqueue = (item: SocketItem<F>): void => {
      inbox.push(item)
      wake?.()
      wake = undefined
    }
    const take = (): SocketItem<F> => {
      const item = inbox[readIndex] as SocketItem<F>
      readIndex += 1
      if (readIndex === inbox.length) {
        inbox.length = 0
        readIndex = 0
      } else if (readIndex >= 1_024 && readIndex * 2 >= inbox.length) {
        inbox.splice(0, readIndex)
        readIndex = 0
      }
      return item
    }
`,
    )
  }
  next = next.replace(
    /while \(inbox\.length > 0\) \{\n          const item = inbox\.shift\(\) as SocketItem<F>/,
    'while (readIndex < inbox.length) {\n          const item = take()',
  )
  if (!next.includes('inbox.length = 0')) {
    next = next.replace(
      /socket\.removeEventListener\('close', handleClose\)\n      handleAbort\(\)/,
      `socket.removeEventListener('close', handleClose)
      inbox.length = 0
      readIndex = 0
      wake = undefined
      handleAbort()`,
    )
  }
  return next
}

function applySdkQueue(content: string): string {
  if (content.includes('queueReadIndex') && content.includes('takeQueued')) return content
  if (!content.includes('this.state.queue.shift()')) return content
  let next = content
  next = next.replace(
    'interface SubscriptionState {\n  readonly queue: HarnessNotification[]\n',
    'interface SubscriptionState {\n  readonly queue: HarnessNotification[]\n  queueReadIndex: number\n',
  )
  if (!next.includes('waiterReadIndex: number')) {
    next = next.replace(
      '  readonly waiters: { resolve: (item: HarnessNotification) => void; reject: (error: Error) => void }[]\n',
      '  readonly waiters: { resolve: (item: HarnessNotification) => void; reject: (error: Error) => void }[]\n  waiterReadIndex: number\n',
    )
  }
  next = next.replace(
    '    const queued = this.state.queue.shift()\n    if (queued !== undefined) return Promise.resolve(queued)',
    '    const queued = this.takeQueued()\n    if (queued !== undefined) return Promise.resolve(queued)',
  )
  next = next.replace(
    '    return this.state.queue.shift()',
    '    return this.takeQueued()',
  )
  if (!next.includes('this.state.queueReadIndex = 0')) {
    next = next.replace(
      '    this.state.queue.length = 0\n    this.fail(new TransportClosedError',
      '    this.state.queue.length = 0\n    this.state.queueReadIndex = 0\n    this.fail(new TransportClosedError',
    )
  }
  if (!next.includes('private takeQueued()')) {
    next = next.replace(
      /  \/\*\*\n   \* Reject pending and future waits/,
      `${SDK_TAKE_QUEUED}  /**\n   * Reject pending and future waits`,
    )
  }
  next = next.replace(
    '    for (const waiter of this.state.waiters.splice(0)) waiter.reject(this.state.failure)',
    '    const pending = this.state.waiters.splice(this.state.waiterReadIndex)\n    this.state.waiters.length = 0\n    this.state.waiterReadIndex = 0\n    for (const waiter of pending) waiter.reject(this.state.failure)',
  )
  next = next.replace(
    '    const waiter = this.state.waiters.shift()',
    '    const waiter = this.takeWaiter()',
  )
  if (!next.includes('private takeWaiter()')) {
    next = next.replace(
      /  \/\*\*\n   \* Iterate notifications until the subscription/,
      `${SDK_TAKE_WAITER}  /**\n   * Iterate notifications until the subscription`,
    )
  }
  next = next.replace(
    '      queue: [],\n',
    '      queue: [],\n      queueReadIndex: 0,\n',
  )
  if (!next.includes('waiterReadIndex: 0')) {
    next = next.replace(
      '      waiters: [],\n',
      '      waiters: [],\n      waiterReadIndex: 0,\n',
    )
  }
  return next
}

/**
 * Apply every complete fork patch that belongs to one path.
 * @param path - repository-relative path.
 * @param content - official or merged file text.
 * @returns the same text with fork features intact when a known hook exists.
 */
export function applyForkFeatures(path: string, content: string): string {
  if (path === 'packages/bundle/web-app/cordis.patch.yml') {
    return applyOpenBrowserYml(applyBrowserNotifications(applyLocaleKo(content)))
  }
  if (path === 'apps/cli/src/args.ts') {
    return applyStopCommand(applyUpdateCommand(applyDefaultWeb(content)))
  }
  if (path === 'packages/bundle/web-app/src/index.ts') return applyBrowserAutoOpenTs(content)
  if (path in PHONE_CSS) return applyPhoneLayout(path, content)
  if (path === 'packages/client/ui-conversation/src/client/locales.ts') return applyHeroZh(content)
  if (path === 'packages/host/apiproxy/src/api-proxy.ts') return applyApiProxyQueue(content)
  if (path === 'packages/client/connection/src/client/web-api-client.ts') return applyWebApiClientQueue(content)
  if (path === 'packages/sdk/client/src/client.ts') return applySdkQueue(content)
  return content
}

/**
 * Whether `content` still carries every fork needle that belongs to `path`.
 * @param path - repository-relative path.
 * @param content - candidate file text.
 * @returns false when this path has no fork needles, or any needle is missing.
 */
export function forkFeaturesComplete(path: string, content: string): boolean {
  const needles = compositionalNeedles().filter(item => item.path === path)
  if (needles.length === 0) return false
  return needles.every(item => content.includes(item.needle))
}

/**
 * Insert one restorable fork feature when the file still has a known hook.
 * @param path - repository-relative path that owns the needle.
 * @param content - current file text.
 * @param needle - exact substring later required by verification.
 * @returns updated text, or `undefined` when the needle is present or cannot be applied.
 */
export function insertCompositionalMarker(path: string, content: string, needle: string): string | undefined {
  if (content.includes(needle)) return undefined
  const next = applyForkFeatures(path, content)
  return next.includes(needle) && next !== content ? next : undefined
}

/** Repository-relative paths that receive a complete fork-feature apply. */
export function forkFeaturePaths(): readonly string[] {
  const paths = new Set<string>()
  for (const feature of FORK_FEATURES) {
    for (const item of feature.contains ?? []) paths.add(item.path)
  }
  return [...paths]
}
