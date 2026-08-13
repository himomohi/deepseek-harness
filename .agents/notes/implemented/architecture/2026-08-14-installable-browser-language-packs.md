# Agent Note: Installable browser language packs

Status: implemented

English | [中文](2026-08-14-installable-browser-language-packs.zh.md)

## Problem

The locale registry originally treated every shipped language as a closed set owned by the base package. Adding one language required editing the locale preference schema and every feature dictionary registration, so a translation could not be installed, updated, or removed independently.

## Decision

`LocaleRuntime.registerLocale` is the public registration point for selectable browser locales. The base package owns `zh` and `en`; language-pack plugins own additional locale definitions and use the existing single-locale dictionary registration for each namespace.

The persisted preference is a string because a Host settings read may precede the matching browser plugin. LocaleRuntime ignores an unavailable stored id until its language pack registers, then activates it. Browser language preferences follow the same late-registration rule.

`@deepseek-ai/dsh-client-locale-ko` owns the Korean definition and dictionaries as a dual-face client package with a DSH bundle patch. The Web bundle includes it by default, while other profiles can add or update it through `dsh plugin`.

## Alternatives considered

**Keep Korean in the base locale package.** This makes Korean available but preserves the closed locale set and requires coordinated edits across every dictionary owner.

**Patch LocaleRuntime internals from an external plugin.** This permits an out-of-tree package on older prereleases, but private fields and settings validation make it version-dependent. The repository exposes an explicit registration API instead.

## Consequences

Language packs can ship on their own package cadence without rewriting a global DSH installation. Duplicate locale ids and duplicate namespace-locale seats fail during activation. The Host schema accepts ids whose browser plugin is absent, so LocaleRuntime remains the authority that decides whether a stored locale is currently selectable.

Focused locale and Korean language-pack tests pin late browser and Host preference adoption, registration disposal, dictionary lookup, and duplicate rejection. The Korean browser snapshot pins the assembled Web bundle.
