/**
 * The OpenCodex proxy plugin card.
 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { SecretField, ValueField } from './fields.tsx'
import { PluginCard } from './PluginCard.tsx'
import type { OpenCodexCardFace } from './opencodex-card-controller.ts'
import type {} from './slot-contract.ts'

export type OpenCodexCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.plugins'>
  & InjectFace<OpenCodexCardFace>

export function OpenCodexCard(props: OpenCodexCardProps) {
  const { t } = props
  const state = props.useOpenCodexCard(snapshot => snapshot)
  const disabled = !state.writable
  return (
    <PluginCard
      t={t}
      titleKey="openCodexTitle"
      descriptionKey="openCodexDescription"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      <SecretField
        id="plugin-config-opencodex-key"
        label={t('openCodexApiKey')}
        hint={t('openCodexApiKeyHint')}
        disabled={!state.apiKeyWritable}
        text={state.apiKey.text}
        configured={state.apiKeyConfigured}
        stateLabel={state.apiKeyConfigured ? t('openCodexApiKeySet') : t('openCodexApiKeyUnset')}
        onEdit={(text) => { props.edit('apiKey', text) }}
      />
      <ValueField
        id="plugin-config-opencodex-endpoint"
        label={t('openCodexBaseUrl')}
        hint={t('openCodexBaseUrlHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        disabled={disabled}
        {...state.baseURL}
        onEdit={(text) => { props.edit('baseURL', text) }}
        onReset={() => { props.resetField('baseURL') }}
      />
    </PluginCard>
  )
}
