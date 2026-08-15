/**
 * The OpenCodex proxy plugin card.
 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { ProviderSecretField, ValueField } from './fields.tsx'
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
      <ProviderSecretField
        id="plugin-config-opencodex-key"
        label={t('openCodexApiKey')}
        hint={t('openCodexApiKeyHint')}
        writable={state.apiKeyWritable}
        text={state.apiKey.text}
        configured={state.apiKeyConfigured}
        configuredLabel={t('openCodexApiKeySet')}
        unconfiguredLabel={t('openCodexApiKeyUnset')}
        onEdit={(text) => { props.edit('apiKey', text) }}
      />
      {/* jscpd:ignore-start -- each provider binds the same shared endpoint control */}
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
      {/* jscpd:ignore-end */}
    </PluginCard>
  )
}
