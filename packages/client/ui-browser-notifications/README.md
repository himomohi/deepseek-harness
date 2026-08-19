# @deepseek-ai/dsh-client-ui-browser-notifications

English | [中文](README.zh.md)

Opt-in browser notifications for sessions that need a user answer or finish a response while the Web page is hidden or unfocused. The browser plugin observes the shared session-list summary: a transition into `pendingInteraction: question` emits the question notification, and `running: true` to `running: false` emits the completion notification. The initial ready session list is only a baseline, so opening or refreshing the page never replays notifications for existing state.

The General settings row owns the `ui-browser-notifications.enabled` preference. Enabling it is the only path that calls the browser permission prompt. A denied permission remains visible as a browser-controlled state; the plugin does not retry the prompt automatically. Clicking a notification focuses the window and opens the originating session when it still exists.

The Host half requires the settings service and registers the schema before browser clients connect. Remote or memory-mode browsers present the preference as unavailable. The Web bundle includes the plugin by default.

## Model Experience

None, as notifications observe browser session summaries and never enter model input or transcript output.

#### KV Cache effect

None; this package neither assembles nor sends provider requests.

## Known Limitations and Deferred Work

- Browser and operating-system notification policies remain authoritative. Focus and notification display may be restricted by the user agent.
- Completion means the observed running turn stopped. The notification does not distinguish a successful response from a terminal error.
