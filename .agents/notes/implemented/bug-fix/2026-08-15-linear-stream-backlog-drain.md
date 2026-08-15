# Agent Note: Linear streaming-backlog drain

Status: implemented

English | [中文](2026-08-15-linear-stream-backlog-drain.zh.md)

## Problem

One model chunk fans out as one durable Session event, one API Proxy frame, one browser WebSocket message, and, for SDK consumers, one JSON-RPC notification. The host `FrameQueue`, browser `WebApiClient` inbox, and TypeScript SDK subscription used `Array.shift()` for every read. When a suspended tab, slow socket, or temporarily idle SDK consumer accumulated a large burst, the observed V8 path crossed a size threshold and backlog drain became sharply non-linear even though enqueueing stayed fast.

On macOS with Node 26.7.0, synthetic 50,000-item backlogs isolated the local queue cost from provider and network latency. Host mux drain took 1,077.72 ms after 1,064.57 ms of Session appends; browser inbox drain took 1,510.54 ms after 110.18 ms of parse and enqueue work; an SDK unread-notification queue took 200.08 ms to drain after 4.74 ms of enqueueing; and dispatch to 50,000 already pending `next()` calls took 1,403.13 ms. The raw Session append path alone took about 0.4 seconds per 100,000 chunks and the JSON-RPC parser processed about 782,000 measured frames per second, so neither explained the backlog-size cliff.

The existing [reasoning-chunk browser stress lane](../testing/2026-08-03-opt-in-reasoning-chunk-browser-stress.md) already coalesces UI publication at animation frames. That protects React rendering but cannot remove queue work before session reduction, and it deliberately preserves every raw chunk.

## Decision

The host mux/host queues, browser WebSocket inbox, and TypeScript SDK notification queues read through a monotonically advancing cursor. They clear storage when fully drained and periodically compact after at least 1,024 reads once consumed entries occupy at least half the array. Each item therefore incurs amortized constant dequeue work while partial, long-lived backlogs release consumed references.

This is a transport optimization, not chunk coalescing. The producer still publishes the first frame immediately, every raw frame crosses the same parsing and event-reduction path, and FIFO order and exact item count remain unchanged. No timer or batch waits in front of the first chunk.

The host and browser generators check abort before each buffered delivery. Abort discards undelivered frames, clears their arrays, and detaches listeners instead of spending time replaying a connection generation that no longer has a consumer. A natural socket close remains an ordered end marker behind frames already accepted by the browser.

The SDK applies the same cursor discipline to both delivered-but-unread notifications and pending `next()` callers. Manual subscription close still drops unread notifications and rejects pending callers; runtime death still leaves notifications delivered before the failure available to drain.

## Alternatives considered

**Merge or batch model chunks.** Rejected because raw model-visible output must remain reconstructable from the Session log, and a timer or size threshold would add first-chunk latency. Chunk coalescing belongs only at the existing animation-frame UI publication point.

**Apply producer backpressure to the synchronous Session observer.** Rejected because the host WebSocket pump already awaits each socket send, while Session event publication is synchronous. Making that observer await network capacity would stall the model loop; bounding it by dropping frames would violate exact transcript delivery. The queue remains memory-proportional to undelivered frames.

**Optimize only React rendering.** Rejected because the measured cliffs occurred before React: in the host queue, browser carrier inbox, and SDK subscription. The existing UI stress decision remains necessary but is not sufficient for a suspended or bursty consumer.

## Verification

Deterministic tests enqueue and drain 20,000 host mux frames, browser WebSocket frames, SDK unread notifications, and SDK pending `next()` calls while asserting the exact sequence. Separate abort tests prove that an accumulated host or browser backlog terminates without yielding another stale frame. Existing subscription close, runtime-death drain, filter containment, WebSocket parsing, and reconnect tests run on the same focused paths.

With the same 50,000-item probes, host mux drain fell to 10.68 ms, browser inbox drain to 9.14 ms, SDK unread-notification drain to 1.31 ms, and SDK pending-caller dispatch to 13.54 ms. Checksums matched before and after. These are local synthetic measurements rather than provider first-token, Internet, or physical-device evidence.

The production browser stress lane emitted 100,000 reasoning chunks in bursts of 128 every 16 ms. All 100,000 arrived; the measured maximum main-thread delay was 57.10 ms, interaction delay was 1.20 ms, and 251 heartbeat samples completed.

## Consequences

A tab resuming after suspension, a socket recovering from temporary slowness, or an SDK consumer catching up after other work no longer spends seconds reindexing arrays before it can present current model output. Normal low-backlog streaming keeps its one-frame-at-a-time behavior and adds no first-frame batching delay.

The change does not reduce Session append cost, per-frame JSON serialization and validation, network transit, provider time to first token, or the fresh-runtime startup cost of `dsh-subagent-dsh-sdk`. Queue memory still grows with the number and size of frames a live slow consumer has not accepted. Addressing those costs requires separate evidence and, for bounded memory, an explicit delivery or producer-backpressure decision.
