/**
 * Shared credential status and write control for settings plugin cards.
 */

import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** Settings value that names a credential reference. */
export interface CredentialSettings {
  /** Credential reference naming the environment or managed-store entry. */
  apiKeyEnv?: string
}

/** Redacted credential state exposed to a plugin card. */
export interface CredentialControlState {
  /** Whether any credential layer supplies the current reference. */
  configured: boolean
  /** Whether the managed credential store accepts a write for it. */
  writable: boolean
}

/**
 * Reads and writes one settings section's referenced credential.
 *
 * Responses are accepted only while they still describe the reference in
 * force, so an out-of-order request cannot publish stale key state.
 */
export class CredentialControl<Settings extends CredentialSettings> {
  private ref: string
  private state: CredentialControlState = { configured: false, writable: true }

  /**
   * @param scope - settings scope whose `apiKeyEnv` selects the credential.
   * @param api - credentials wire face.
   * @param defaultRef - reference used when the settings section omits one.
   * @param onChange - publish the owning card projection after state changes.
   */
  constructor(
    private readonly scope: SettingsScope<Settings>,
    private readonly api: Pick<IApiClient, 'credentials'>,
    private readonly defaultRef: string,
    private readonly onChange: () => void,
  ) {
    this.ref = this.refOf(scope.getSnapshot())
  }

  /** Latest redacted state for the current reference. */
  get snapshot(): CredentialControlState {
    return this.state
  }

  /** Re-read the current reference from the Host. */
  async read(): Promise<void> {
    const ref = this.refOf(this.scope.getSnapshot())
    if (ref !== this.ref) {
      this.ref = ref
      this.state = { configured: false, writable: true }
      this.onChange()
    }
    let response: Awaited<ReturnType<IApiClient['credentials']['describe']>>
    try {
      response = await this.api.credentials.describe({ refs: [ref] })
    } catch (_credentialReadFailure) {
      // The last redacted state remains usable; a later refresh can recover.
      return
    }
    if (!response.result.ok || ref !== this.refOf(this.scope.getSnapshot())) return
    const view = response.result.value.credentials[ref]
    const next = {
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
    }
    if (next.configured === this.state.configured && next.writable === this.state.writable) return
    this.state = next
    this.onChange()
  }

  /**
   * Re-read when the Host reports a change to this control's reference.
   * @param ref - changed credential reference.
   */
  refresh(ref: string): void {
    if (ref !== this.ref) return
    void this.read()
  }

  /**
   * Write one staged credential and read back whether it landed.
   * @param value - staged credential literal.
   * @returns whether the Host reports a configured credential afterwards.
   */
  async write(value: string): Promise<boolean> {
    try {
      await this.api.credentials.set({ ref: this.refOf(this.scope.getSnapshot()), value })
    } catch (_credentialWriteFailure) {
      // Read-back below is authoritative and preserves a failed draft.
    }
    await this.read()
    return this.state.configured
  }

  private refOf(snapshot: SettingsScopeSnapshot<Settings>): string {
    const declared = snapshot.value?.apiKeyEnv
    return declared !== undefined && declared.length > 0 ? declared : this.defaultRef
  }
}
