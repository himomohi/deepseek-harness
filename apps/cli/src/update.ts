/**
 * Handler for `dsh update`: merges official upstream, rebuilds, then verifies
 * fork-owned plugins and core patches still exist. Success is not claimed on a
 * conflicted merge or a missing custom marker.
 * @module @deepseek-ai/dsh/update
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pickUpstreamBranch, verifyCustomFeatures } from './custom-features.ts'

function git(rootDir: string, args: string, options?: { inherit?: boolean }): string {
  return execSync(`git ${args}`, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: options?.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
}

function listUpstreamRefs(rootDir: string): string[] {
  try {
    return git(rootDir, 'for-each-ref --format=%(refname:short) refs/remotes/upstream')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function mergeInProgress(rootDir: string): boolean {
  try {
    git(rootDir, 'rev-parse -q --verify MERGE_HEAD')
    return true
  } catch {
    return false
  }
}

function unmergedFiles(rootDir: string): string[] {
  try {
    return git(rootDir, 'diff --name-only --diff-filter=U')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function runUpdate(): Promise<void> {
  const rootDir = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
  console.log('\x1b[36m%s\x1b[0m', '🔄 [dsh update] Starting official update sync...')
  console.log(`Repository Root: ${rootDir}`)

  try {
    console.log('\n🔎 Checking official @deepseek-ai/dsh release version...')
    let officialNpmVersion = ''
    try {
      officialNpmVersion = execSync('npm view @deepseek-ai/dsh version', { encoding: 'utf8' }).trim()
      console.log(`Official latest published version: \x1b[33m${officialNpmVersion}\x1b[0m`)
    } catch {
      // npm registry is optional; git upstream is the source of truth.
    }

    console.log('\n📡 Checking upstream remote...')
    let remotes = ''
    try {
      remotes = git(rootDir, 'remote')
    } catch {
      remotes = ''
    }
    if (!remotes.split(/\r?\n/).includes('upstream')) {
      console.log('Adding upstream: https://github.com/deepseek-ai/deepseek-harness.git')
      execSync('git remote add upstream https://github.com/deepseek-ai/deepseek-harness.git', {
        cwd: rootDir,
        stdio: 'inherit',
      })
    }

    console.log('\n⬇️ Fetching latest changes from official repository (upstream)...')
    execSync('git fetch upstream --tags', { cwd: rootDir, stdio: 'inherit' })

    const upstreamBranch = pickUpstreamBranch(listUpstreamRefs(rootDir))
    console.log(`\n🔀 Merging ${upstreamBranch} into the current branch...`)
    try {
      execSync(`git merge ${upstreamBranch} --no-edit`, { cwd: rootDir, stdio: 'inherit' })
    } catch {
      const conflicts = unmergedFiles(rootDir)
      console.error('\n\x1b[31m%s\x1b[0m', '❌ [dsh update] Merge conflict. Custom patches were not auto-resolved.')
      if (conflicts.length > 0) {
        console.error('Conflicted files:')
        for (const file of conflicts) console.error(`  - ${file}`)
      }
      if (mergeInProgress(rootDir)) {
        console.error('Resolve the conflicts, then `git commit` and `pnpm run build`.')
        console.error('Or abort with `git merge --abort`.')
      }
      process.exit(1)
    }

    if (officialNpmVersion) {
      try {
        const pkg = JSON.parse(git(rootDir, 'show HEAD:package.json')) as { version?: string }
        if (pkg.version !== officialNpmVersion) {
          console.log(`\n📌 Synchronizing workspace version to match official release: ${officialNpmVersion}`)
          execSync(`pnpm exec tsx scripts/release/bump.ts --family dsh ${officialNpmVersion}`, {
            cwd: rootDir,
            stdio: 'inherit',
          })
        }
      } catch {
        // non-blocking
      }
    }

    console.log('\n📦 Checking and installing dependencies (pnpm install)...')
    execSync('pnpm install', { cwd: rootDir, stdio: 'inherit' })

    console.log('\n🔨 Rebuilding DeepSeek Harness libraries and frontend...')
    execSync('pnpm run build', { cwd: rootDir, stdio: 'inherit' })

    const report = verifyCustomFeatures(
      relativePath => existsSync(resolve(rootDir, relativePath)),
      relativePath => readFileSync(resolve(rootDir, relativePath), 'utf8'),
    )
    console.log('\n🧪 Verifying fork features after merge...')
    for (const check of report.checks) {
      const mark = check.ok ? '✅' : '❌'
      console.log(`  ${mark} ${check.id} (${check.kind})`)
      for (const missing of check.missing) console.log(`     - ${missing}`)
    }
    if (!report.ok) {
      console.error('\n\x1b[31m%s\x1b[0m', '❌ [dsh update] Upstream merge succeeded, but fork features are missing.')
      console.error('Independent packages usually survive; core-file patches need a manual merge.')
      process.exit(1)
    }

    console.log('\n\x1b[32m%s\x1b[0m', `✅ [dsh update] Merged ${upstreamBranch}${officialNpmVersion ? ` (npm ${officialNpmVersion})` : ''}.`)
    console.log('\x1b[32m%s\x1b[0m', '✨ Fork feature check passed (locale-ko, OpenCodex, vision-fallback, auto-continue, reasoning preserve).')
    console.log('This is a post-merge file/marker check, not a guarantee that every core patch still behaves the same.')
    console.log('You can now run `dsh` to start using the updated version.\n')
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ [dsh update] Update process encountered an error:')
    if (error instanceof Error) {
      console.error(error.message)
    }
    process.exit(1)
  }
}
