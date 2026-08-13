/** Korean browser language-pack host half. */

import type { Context } from '@deepseek-ai/cordis'

/**
 * Keep the package visible to the Host Loader so its browser half is included
 * in the client module graph.
 * @param _ctx - owning Host context.
 */
export function apply(_ctx: Context): void {}
