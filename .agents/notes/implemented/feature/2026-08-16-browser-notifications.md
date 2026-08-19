# Agent Note: Browser notifications for waiting and completed sessions

Status: implemented

English | [中文](2026-08-16-browser-notifications.zh.md)

## Problem

The Web surface gives visible waiting and completion state inside the page, but a user working in another window receives no signal when an agent asks a question or finishes a response. Notification permission is browser-controlled and requires a user gesture, while session state can arrive during startup, reconnection, or ordinary background updates. Treating every observed waiting or idle row as a new event would replay stale notifications after refresh.

## Decision

`@deepseek-ai/dsh-client-ui-browser-notifications` is a dual-face plugin. Its Host half requires the settings service and synchronously registers the durable `ui-browser-notifications.enabled` setting with a default of `false` before browser clients connect. Its browser half contributes an opt-in row to General settings, requests notification permission only from that row's direct enable gesture, and observes `ctx.sessions.list`.

The first ready session-list snapshot is a quiet baseline. After that baseline, a transition into `pendingInteraction: question` sends a question notification, and a transition from `running: true` to `running: false` sends a completion notification. A question transition takes precedence when both facts change in one snapshot. New sessions discovered after the baseline may notify when they already wait for an answer, while newly discovered idle sessions do not produce completion notifications.

Notifications are suppressed while the document is visible and focused. Clicking one focuses the browser window, opens the originating session if it still exists, and closes the notification. Browser permission and operating-system display policy remain authoritative. A denied permission is shown in settings and is never requested again by background synchronization.

The Web bundle includes the plugin by default. The API proxy's explicit Web settings allowlist exposes this namespace to loopback configuration clients; registration alone does not cross that security boundary. The Korean language pack owns the corresponding Korean settings and notification dictionary.

## Verification

Controller specifications pin the quiet baseline, question and completion transitions, active-page and disabled suppression, removed-session clicks, direct permission requests, denied permission, unavailable settings, and write failures. Component, Host schema, browser-adapter, client assembly, invariant, and Korean dictionary specifications cover the remaining package faces.

The `settings-chrome` real Web composition scenario renders the new row in the committed General-settings accessibility golden, installs a deterministic granted Notifications API because headless Chromium pins notification permission to denied, drives the opt-in switch, and verifies the Host settings document records the accepted value. The browser-adapter and controller specifications separately cover the native permission-request call. This feature does not change model input or transcript output, so no ACP, headless, or CLI transcript fixture changes.

## Alternatives considered

**Use page-local toast messages.** Toasts remain invisible when the page is hidden, which is the state this feature addresses.

**Request permission during plugin activation.** Browsers may reject permission prompts without a user gesture, and an unsolicited prompt gives the user no product context. The General settings opt-in is the only permission-request entry point.

**Notify from durable `completed` rows.** That field is an unread reminder whose value can survive refresh and selection changes. It would replay old completion state instead of representing the observed end of the current running turn.

**Send notifications from the Host.** Browser permission, focus, localization, and click navigation are browser-owned facts. Keeping delivery in the client plugin avoids a new push protocol and preserves the existing session summary as the event source.

## Consequences

Users can opt into background question and completion signals without changing model-visible state or session logs. Refresh and reconnect do not replay the initial list, and notification clicks preserve navigation through the sessions service.

Completion means only that the observed running turn stopped. The notification does not distinguish a successful assistant response from a terminal error. Browser and operating-system policy may still suppress display or window focus after the plugin has issued a notification.
