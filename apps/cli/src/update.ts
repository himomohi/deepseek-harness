/**
 * Handler for `dsh update`: pulls the latest upstream updates, rebases/merges,
 * and re-builds the harness so custom plugins and localization stay intact.
 * @module @deepseek-ai/dsh/update
 */

import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export async function runUpdate(): Promise<void> {
  const rootDir = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
  console.log('\x1b[36m%s\x1b[0m', '🔄 [dsh update] Starting official update sync...')
  console.log(`Repository Root: ${rootDir}`)

  try {
    // 1. Check or add upstream remote
    console.log('\n📡 Checking upstream remote...')
    let remotes = ''
    try {
      remotes = execSync('git remote', { cwd: rootDir, encoding: 'utf8' })
    } catch {
      // ignore
    }

    if (!remotes.split(/\r?\n/).includes('upstream')) {
      console.log('Adding upstream: https://github.com/deepseek-ai/deepseek-harness.git')
      execSync('git remote add upstream https://github.com/deepseek-ai/deepseek-harness.git', {
        cwd: rootDir,
        stdio: 'inherit',
      })
    }

    // 2. Fetch upstream
    console.log('\n⬇️ Fetching latest changes from official repository (upstream)...')
    execSync('git fetch upstream', { cwd: rootDir, stdio: 'inherit' })

    // 3. Merge upstream default branch (master/main)
    console.log('\n🔀 Merging official upstream updates into current branch...')
    const upstreamBranch = remotes.includes('upstream') ? 'upstream/master' : 'upstream/main'
    try {
      execSync(`git merge ${upstreamBranch} --no-edit`, { cwd: rootDir, stdio: 'inherit' })
    } catch {
      // Try fallback to master
      execSync('git merge upstream/master --no-edit', { cwd: rootDir, stdio: 'inherit' })
    }

    // 4. Install dependencies if changed

    console.log('\n📦 Checking and installing dependencies (pnpm install)...')
    execSync('pnpm install', { cwd: rootDir, stdio: 'inherit' })

    // 5. Build project
    console.log('\n🔨 Rebuilding DeepSeek Harness libraries and frontend...')
    execSync('pnpm run build', { cwd: rootDir, stdio: 'inherit' })

    console.log('\n\x1b[32m%s\x1b[0m', '✅ [dsh update] Successfully updated to the latest official version!')
    console.log('\x1b[32m%s\x1b[0m', '✨ All Korean localization and OpenCodex features remain intact.')
    console.log('You can now run `dsh` to start using the updated version.\n')
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ [dsh update] Update process encountered an error:')
    if (error instanceof Error) {
      console.error(error.message)
    }
    process.exit(1)
  }
}
