/**
 * The OpenCodex card controller for managing OpenCodex proxy settings.
 */

import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SettingsScopeSnapshot, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import {
  CardForm, textField,
  type CardActions, type CardFieldState, type CardShell,
} from './card-form.ts'

export const OPENCODEX_NS = 'llm-opencodex'
const DEFAULT_API_KEY_REF = 'OPENCODEX_API_KEY'
const API_KEY_FIELD = 'apiKey'

export interface OpenCodexSettings {
  apiKeyEnv?: string
  baseURL?: string
}

interface CredentialState {
  ref: string
  configured: boolean
  writable: boolean
}

export interface OpenCodexCardState extends CardShell {
  baseURL: CardFieldState
  apiKey: CardFieldState
  apiKeyConfigured: boolean
  apiKeyWritable: boolean
}

export interface OpenCodexCardFace extends CardActions {
  hooks: {
    openCodexCard: SnapshotStore<OpenCodexCardState>
  }
}

export class OpenCodexCardController {
  private readonly form: CardForm<OpenCodexSettings>
  private readonly store: SnapshotStore<OpenCodexCardState>
  private credential: CredentialState = { ref: '', configured: false, writable: true }

  constructor(
    private readonly scope: SettingsScope<OpenCodexSettings>,
    private readonly api: Pick<IApiClient, 'credentials'>,
  ) {
    this.form = new CardForm(
      scope,
      [textField('baseURL')],
      [{ field: API_KEY_FIELD, write: text => this.writeKey(text) }],
    )
    this.store = this.form.bind(() => this.projection())
    scope.subscribe(() => { void this.readCredential() })
    void this.readCredential()
  }

  private projection(): OpenCodexCardState {
    return {
      ...this.form.shell(),
      baseURL: this.form.field('baseURL'),
      apiKey: this.form.field(API_KEY_FIELD),
      apiKeyConfigured: this.credential.configured,
      apiKeyWritable: this.credential.writable,
    }
  }

  private async readCredential(): Promise<void> {
    const ref = refOf(this.scope.getSnapshot())
    if (ref !== this.credential.ref) {
      this.credential = { ref, configured: false, writable: true }
      this.store.set(this.projection())
    }
    let response: Awaited<ReturnType<IApiClient['credentials']['describe']>>
    try {
      response = await this.api.credentials.describe({ refs: [ref] })
    } catch (_credentialReadFailure) {
      return
    }
    if (!response.result.ok || ref !== refOf(this.scope.getSnapshot())) return
    const view = response.result.value.credentials[ref]
    const next: CredentialState = {
      ref,
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
    }
    if (next.configured === this.credential.configured && next.writable === this.credential.writable) return
    this.credential = next
    this.store.set(this.projection())
  }

  refreshCredential(ref: string): void {
    if (ref !== this.credential.ref) return
    void this.readCredential()
  }

  inject(): OpenCodexCardFace {
    return { hooks: { openCodexCard: this.store }, ...this.form.actions() }
  }

  private async writeKey(value: string): Promise<boolean> {
    try {
      await this.api.credentials.set({ ref: refOf(this.scope.getSnapshot()), value })
    } catch (_credentialWriteFailure) {
      // ignore
    }
    await this.readCredential()
    return this.credential.configured
  }
}

function refOf(snapshot: SettingsScopeSnapshot<OpenCodexSettings>): string {
  const declared = snapshot.value?.apiKeyEnv
  return declared !== undefined && declared.length > 0 ? declared : DEFAULT_API_KEY_REF
}
