/**
 * The OpenCodex card controller for managing OpenCodex proxy settings.
 */

import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import {
  CardForm, textField,
  type CardActions, type CardFieldState, type CardShell,
} from './card-form.ts'
import { CredentialControl } from './credential-control.ts'

/** Namespace owned by the OpenCodex proxy provider. */
export const OPENCODEX_NS = 'llm-opencodex'
const DEFAULT_API_KEY_REF = 'OPENCODEX_API_KEY'
const API_KEY_FIELD = 'apiKey'

/** OpenCodex settings fields edited by the card. */
export interface OpenCodexSettings {
  /** Credential reference for a remote proxy. */
  apiKeyEnv?: string
  /** Local or remote OpenCodex API base. */
  baseURL?: string
}

/** What the OpenCodex card renders. */
export interface OpenCodexCardState extends CardShell {
  /** Proxy endpoint field. */
  baseURL: CardFieldState
  /** Write-only credential field. */
  apiKey: CardFieldState
  /** Whether the current reference resolves to a credential. */
  apiKeyConfigured: boolean
  /** Whether the managed store accepts a write for it. */
  apiKeyWritable: boolean
}

/** Registration-side face injected into the OpenCodex card. */
export interface OpenCodexCardFace extends CardActions {
  hooks: {
    /** Card snapshot bound by the renderer as `useOpenCodexCard`. */
    openCodexCard: SnapshotStore<OpenCodexCardState>
  }
}

/** Bridges the OpenCodex settings scope and credential domain onto one card. */
export class OpenCodexCardController {
  private readonly form: CardForm<OpenCodexSettings>
  private readonly store: SnapshotStore<OpenCodexCardState>
  private readonly credential: CredentialControl<OpenCodexSettings>

  /**
   * @param scope - bound `llm-opencodex` settings scope.
   * @param api - credentials wire face.
   */
  /* jscpd:ignore-start -- parallel cards wire the same shared form and credential controls */
  constructor(
    scope: SettingsScope<OpenCodexSettings>,
    api: Pick<IApiClient, 'credentials'>,
  ) {
    this.form = new CardForm(
      scope,
      [textField('baseURL')],
      [{ field: API_KEY_FIELD, write: text => this.writeKey(text) }],
    )
    this.credential = new CredentialControl(
      scope,
      api,
      DEFAULT_API_KEY_REF,
      () => { this.store.set(this.projection()) },
    )
    this.store = this.form.bind(() => this.projection())
    scope.subscribe(() => { void this.credential.read() })
    void this.credential.read()
  }
  /* jscpd:ignore-end */

  private projection(): OpenCodexCardState {
    return {
      ...this.form.shell(),
      baseURL: this.form.field('baseURL'),
      apiKey: this.form.field(API_KEY_FIELD),
      apiKeyConfigured: this.credential.snapshot.configured,
      apiKeyWritable: this.credential.snapshot.writable,
    }
  }

  /**
   * Re-read after a Host credential change.
   * @param ref - changed credential reference.
   */
  refreshCredential(ref: string): void {
    this.credential.refresh(ref)
  }

  /**
   * Build the snapshot and form actions injected into the card.
   * @returns the card's snapshot and form actions.
   */
  inject(): OpenCodexCardFace {
    return { hooks: { openCodexCard: this.store }, ...this.form.actions() }
  }

  private async writeKey(value: string): Promise<boolean> {
    return this.credential.write(value)
  }
}
