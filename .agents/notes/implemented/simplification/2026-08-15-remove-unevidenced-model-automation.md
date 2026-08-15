# Agent Note: Remove unevidenced model automation

Status: implemented

English | [中文](2026-08-15-remove-unevidenced-model-automation.zh.md)

## Problem

The fork added three model-path changes without the evidence or lifecycle contracts they required. The agent loop converted every text-only `max-tokens` finish into another paid request with no attempt bound. DeepSeek serialization replayed `reasoning_content` on ordinary assistant turns even though the provider documents passback only for tool-call turns and ignores the field otherwise. The Vision Fallback package advertised automatic image understanding, but no request path called its message transformer: the mere presence of the service bypassed image admission while the text adapter still rejected the image, and its process-wide description cache had no limit.

Those changes made the UI claim continuity, cache improvement, and vision support that the assembled application could not prove. The vision path also violated the model-visible logging rule: a generated description would need a durable event and deterministic request reconstruction before it could replace image content.

## Decision

`max-tokens` is terminal again. The loop records and returns that reason without injecting a user message or starting another request. Callers can decide whether to continue with an explicit user action or a separately bounded policy.

DeepSeek and OpenCodex serialize `reasoning_content` only when the same assistant turn carries tool calls. Ordinary and reasoning-only assistant turns keep their visible text but do not resend ignored reasoning.

The Vision Fallback package, bundle row, Models card, language copy, cache, and image-admission bypasses are removed. Text-only models refuse image prompts and `read_image` calls before provider I/O. OpenCodex declares text-only input even for model ids commonly associated with vision because this adapter has no attachment-byte wire implementation.

## Alternatives considered

**Add a cache bound and keep Vision Fallback mounted.** Rejected because memory was not the primary correctness defect. No assembled request consumed the generated description, and admitting images based on service presence produced a later adapter failure rather than vision output.

**Transform messages inside the `llm/stream` waterfall.** Rejected because loop-built requests are frozen functions of the Session log. A model-visible description requires a new durable event, replay rules, failure semantics, and snapshot coverage; mutating the request in middleware would break reconstruction.

**Bound automatic continuation to a fixed number of retries.** Rejected for this change because the continuation text, budget, billing consent, partial tool-call semantics, and user-visible transcript still need a product contract. Returning `max-tokens` preserves the provider fact without inventing policy.

**Resend plain-turn reasoning for presumed cache hits.** Rejected because the provider documents it as ignored, cache reuse is best-effort, and no provider-side A/B measurement demonstrated a benefit that justified extra input tokens or compatibility risk.

## Consequences

The fork gives up automatic long-output continuation and automatic image descriptions until those capabilities have explicit budgets, durable events, provider-wire support, runnable snapshots, and real provider evidence. Users see a truthful terminal or modality error instead of a silent extra request or a false acceptance.

The model path now matches official passback guidance and has no process-wide vision cache. The existing cursor-backed streaming queues remain unchanged; their measured local backlog gains do not depend on any removed automation.

## Related decisions

[Restore the default Web launch](../bug-fix/2026-08-15-restore-default-web-launch.md) owns the root profile default and browser handoff.
