/**
 * Dedicated GUI settings card for configuring Vision Fallback options.
 * Allows users to toggle vision fallback, choose between automatic best-model
 * discovery and custom provider/model specification, and adjust max tokens.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { en } from './locales.ts'
import styles from './VisionFallbackCard.module.css'

export interface VisionFallbackCardProps {
  api: Pick<IApiClient, 'settings'>
  t: (key: keyof typeof en) => string
  readOnly?: boolean
}

interface VisionFallbackSettingsData {
  enabled?: boolean | undefined
  fallbackProvider?: string | undefined
  fallbackModel?: string | undefined
  maxTokens?: number | undefined
}

const COMMON_VISION_MODELS: readonly { provider: string; model: string; label: string }[] = [
  { provider: 'opencodex', model: 'gpt-5.6-sol', label: 'OpenCodex - GPT-5.6 Sol (Vision & Reasoning)' },
  { provider: 'opencodex', model: 'claude-3-7-sonnet', label: 'OpenCodex - Claude 3.7 Sonnet (Vision)' },
  { provider: 'opencodex', model: 'commandcode/google/gemini-3.7-flash', label: 'OpenCodex - Gemini 3.7 Flash' },
  { provider: 'opencodex', model: 'xai/grok-4.6', label: 'OpenCodex - Grok 4.6 (Vision)' },
  { provider: 'opencodex', model: 'minimax/MiniMax-M3', label: 'OpenCodex - MiniMax M3' },
  { provider: 'opencodex', model: 'zai/glm-5.2', label: 'OpenCodex - GLM 5.2' },
  { provider: 'anthropic', model: 'claude-3-7-sonnet-latest', label: 'Anthropic - Claude 3.7 Sonnet' },
  { provider: 'openai', model: 'gpt-4o', label: 'OpenAI - GPT-4o' },
  { provider: 'google', model: 'gemini-1.5-pro-latest', label: 'Google - Gemini 1.5 Pro' },
]

export function VisionFallbackCard({ api, t, readOnly = false }: VisionFallbackCardProps): ReactNode {
  const [enabled, setEnabled] = useState(true)
  const [mode, setMode] = useState<'auto' | 'custom'>('auto')
  const [provider, setProvider] = useState('opencodex')
  const [model, setModel] = useState('gpt-5.6-sol')
  const [maxTokens, setMaxTokens] = useState(2048)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let unmounted = false
    void api.settings.describe({}).then((response) => {
      if (unmounted || !response.result.ok) return
      const nsView = response.result.value.namespaces.find(n => n.ns === 'vision-fallback')
      const current = (nsView?.value ?? nsView?.user) as VisionFallbackSettingsData | undefined
      if (current) {
        if (typeof current.enabled === 'boolean') setEnabled(current.enabled)
        if (current.fallbackProvider && current.fallbackModel) {
          setMode('custom')
          setProvider(current.fallbackProvider)
          setModel(current.fallbackModel)
        } else {
          setMode('auto')
        }
        if (typeof current.maxTokens === 'number' && current.maxTokens > 0) {
          setMaxTokens(current.maxTokens)
        }
      }
    })
    return () => { unmounted = true }
  }, [api])

  const handleSave = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    setSaved(false)
    try {
      const payload: VisionFallbackSettingsData = {
        enabled,
        maxTokens,
        ...mode === 'custom'
          ? { fallbackProvider: provider.trim(), fallbackModel: model.trim() }
          : { fallbackProvider: undefined, fallbackModel: undefined },
      }

      const response = await api.settings.mutate({
        ns: 'vision-fallback',
        ops: [{ op: 'set', path: [], value: payload }],
      })

      if (!response.result.ok) {
        setError(response.result.error.message)
        return
      }

      setSaved(true)
      setTimeout(() => { setSaved(false) }, 3500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles['card']}>
      <div className={styles['header']}>
        <div className={styles['headerInfo']}>
          <div className={styles['titleRow']}>
            <span className={styles['title']}>👁️ {t('visionFallbackTitle')}</span>
            <span className={styles['badge']}>Plugin Active</span>
          </div>
          <p className={styles['intro']}>{t('visionFallbackIntro')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`${styles['switch']} ${enabled ? styles['switchOn'] : ''}`}
          disabled={readOnly || busy}
          onClick={() => { setEnabled(!enabled) }}
        >
          <span className={styles['switchTrack']}>
            <span className={styles['switchThumb']} />
          </span>
          <span>{t('visionFallbackEnabled')}</span>
        </button>
      </div>

      {enabled ? (
        <div className={styles['body']}>
          <div className={styles['formGroup']}>
            <span className={styles['label']}>{t('visionFallbackMode')}</span>
            <div className={styles['radioGroup']}>
              <label className={styles['radioOption']}>
                <input
                  type="radio"
                  name="visionFallbackMode"
                  className={styles['radioInput']}
                  checked={mode === 'auto'}
                  disabled={readOnly || busy}
                  onChange={() => { setMode('auto') }}
                />
                <span>{t('visionFallbackModeAuto')}</span>
              </label>
              <label className={styles['radioOption']}>
                <input
                  type="radio"
                  name="visionFallbackMode"
                  className={styles['radioInput']}
                  checked={mode === 'custom'}
                  disabled={readOnly || busy}
                  onChange={() => { setMode('custom') }}
                />
                <span>{t('visionFallbackModeCustom')}</span>
              </label>
            </div>
          </div>

          {mode === 'custom' ? (
            <div className={styles['formGroup']}>
              <div className={styles['gridTwo']}>
                <div className={styles['formGroup']}>
                  <label className={styles['label']}>{t('visionFallbackProvider')}</label>
                  <select
                    className={`${styles['select']} ${styles['selectInput']}`}
                    value={provider}
                    disabled={readOnly || busy}
                    onChange={(e) => { setProvider(e.target.value) }}
                  >
                    <option value="opencodex">OpenCodex (Local Proxy)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="google">Google (Gemini)</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>

                <div className={styles['formGroup']}>
                  <label className={styles['label']}>{t('visionFallbackModel')}</label>
                  <select
                    className={`${styles['select']} ${styles['selectInput']}`}
                    value={model}
                    disabled={readOnly || busy}
                    onChange={(e) => { setModel(e.target.value) }}
                  >
                    {COMMON_VISION_MODELS.filter(m => m.provider === provider).map(m => (
                      <option key={m.model} value={m.model}>{m.model}</option>
                    ))}
                    {!COMMON_VISION_MODELS.some(m => m.provider === provider && m.model === model) ? (
                      <option value={model}>{model} (Custom)</option>
                    ) : null}
                  </select>
                </div>
              </div>

              <div className={styles['formGroup']}>
                <label className={styles['label']}>Or Type Custom Model ID:</label>
                <input
                  type="text"
                  className={styles['input']}
                  value={model}
                  disabled={readOnly || busy}
                  placeholder="e.g. gpt-5.6-sol, claude-3-7-sonnet"
                  onChange={(e) => { setModel(e.target.value) }}
                />
              </div>
            </div>
          ) : null}

          <div className={styles['formGroup']}>
            <label className={styles['label']}>{t('visionFallbackMaxTokens')}</label>
            <input
              type="number"
              className={styles['input']}
              style={{ width: '180px' }}
              value={maxTokens}
              min={256}
              max={8192}
              step={256}
              disabled={readOnly || busy}
              onChange={(e) => { setMaxTokens(Number(e.target.value) || 2048) }}
            />
          </div>

          <div className={styles['footer']}>
            {saved ? <span className={styles['savedMsg']}>✓ {t('visionFallbackSaved')}</span> : null}
            {error ? <span className={styles['errorMsg']}>{error}</span> : null}
            <button
              type="button"
              className={styles['saveButton']}
              disabled={readOnly || busy}
              onClick={() => { void handleSave() }}
            >
              {busy ? t('visionFallbackSaving') : t('visionFallbackSave')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
