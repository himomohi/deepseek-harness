/** Korean locale definition and dictionaries supplied as one browser plugin. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { ko as common } from './dictionaries/common.ts'
import { ko as localeSettings } from './dictionaries/settings-locale.ts'
import { ko as agentPreset } from './dictionaries/ui-agent-preset.ts'
import { ko as commands } from './dictionaries/ui-commands.ts'
import { ko as conversation } from './dictionaries/ui-conversation.ts'
import { ko as cordis } from './dictionaries/ui-cordis.ts'
import { ko as deliverables } from './dictionaries/ui-deliverables.ts'
import { ko as goal } from './dictionaries/ui-goal.ts'
import { ko as inputTrigger } from './dictionaries/ui-input-trigger.ts'
import { ko as jobs } from './dictionaries/ui-jobs.ts'
import { ko as messageFeedback } from './dictionaries/ui-message-feedback.ts'
import { ko as modelSelection } from './dictionaries/ui-model-selection.ts'
import { ko as permissionPresets } from './dictionaries/ui-permission-presets.ts'
import { ko as plan } from './dictionaries/ui-plan.ts'
import { ko as settingsGeneral } from './dictionaries/ui-settings-general.ts'
import { ko as settingsModels } from './dictionaries/ui-settings-models.ts'
import { ko as settingsPluginInventory } from './dictionaries/ui-settings-plugin-inventory.ts'
import { ko as settingsPlugins } from './dictionaries/ui-settings-plugins.ts'
import { ko as sidebar } from './dictionaries/ui-sidebar.ts'
import { ko as skill } from './dictionaries/ui-skill.ts'
import { ko as subagent } from './dictionaries/ui-subagent.ts'
import { ko as theme } from './dictionaries/ui-theme.ts'
import { ko as browserNotifications } from './dictionaries/ui-browser-notifications.ts'
import { ko as trajectory } from './dictionaries/ui-trajectory.ts'
import { ko as userQuestions } from './dictionaries/ui-user-questions.ts'
import { ko as workflowRun } from './dictionaries/ui-workflow-run.ts'
import { ko as workspace } from './dictionaries/ui-workspace.ts'
import { ko as sessionLogExport } from './dictionaries/session-log-export.ts'

/** Required service supplied by the base locale plugin. */
export const inject = ['locale']

const DICTIONARIES: readonly [namespace: string, dictionary: Record<string, string>][] = [
  ['common', common],
  ['settings.locale', localeSettings],
  ['settings.agentPreset', agentPreset],
  ['command', commands],
  ['conversation', conversation],
  ['cordis', cordis],
  ['deliverables', deliverables],
  ['goal', goal],
  ['slash.menu', inputTrigger],
  ['job', jobs],
  ['feedback', messageFeedback],
  ['model', modelSelection],
  ['settings.permission', permissionPresets],
  ['plan', plan],
  ['settings', settingsGeneral],
  ['settings.models', settingsModels],
  ['settings.pluginInventory', settingsPluginInventory],
  ['settings.plugins', settingsPlugins],
  ['sidebar', sidebar],
  ['skill', skill],
  ['subagent', subagent],
  ['settings.theme', theme],
  ['settings.browserNotifications', browserNotifications],
  ['trajectory', trajectory],
  ['question', userQuestions],
  ['workflowRun', workflowRun],
  ['workspace', workspace],
  ['session-log-download', sessionLogExport],
]

/**
 * Register Korean as a selectable locale and occupy its dictionary seats.
 * @param ctx - browser context carrying the locale registry.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.registerLocale({ id: 'ko', label: '한국어' }),
    'locale-ko: locale definition',
  )
  for (const [namespace, dictionary] of DICTIONARIES) {
    ctx.effect(
      () => ctx.locale.register(namespace, 'ko', dictionary),
      `locale-ko: ${namespace} dictionary`,
    )
  }
}
