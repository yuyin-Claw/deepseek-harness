# Agent Note: Nightcity edition — seven additive client plugins on upstream slots

Status: implemented

English | [中文](2026-08-21-nightcity-edition-seven-client-plugins.zh.md)

## Problem

The Nightcity edition reskins the DSH web client and adds debate, workbench, persona, voice, and off-peak surfaces. The reference implementation (Neon fork) reached several features by modifying upstream packages — a fork-added `conversation.chat.persona` seat in ui-conversation, a `viewDefaultFor` provide channel, and a theme adoption patch — which a clean upstream fork cannot carry without merge conflicts. The question was which extension points the seven features could use with zero modifications to upstream packages.

## Decision

All seven features ship as new `packages/client/ui-nightcity-*` packages that only consume public extension points, registered through `ctx.slots.inject` and `ctx.effect`:

- **theme** stacks one scheme-invariant `overrideTokens` layer instead of registering a selectable theme id. The settings-scope adoption that reverts selectable preferences never touches override layers, and both base palettes receive the same dark neon values. The decorative atmosphere layer (skyline, grid, HUD brackets, scanline) was originally a `shell.overlay` entry; it has since been removed on product feedback because its high-saturation neon silhouettes read as noisy colored lines against the light palette — the package now ships only the palette overrides and the hero keeps its separate backdrop image.
- **hero** shadows `conversation.hero.brand.mark` at priority −1 (lowest renders), adds a typewriter suggestion readout in `conversation.input.dock`, and synthesizes the boot chime with Web Audio (no binary assets).
- **persona** mounts on `conversation.composer.dock`, mapping the InputZone phase to the active persona. Per-message CG avatars were rejected: they need a chat-row seat upstream does not declare, and adding one is exactly the upstream modification this edition avoids.
- **voice** is a `conversation.input.right` toggle appending final SpeechRecognition transcripts through the standard `inputActions.setDraft` face; it renders nothing where the API is absent.
- **offpeak** owns the durable `ui-nightcity-offpeak.enabled` setting through `ctx.settingsScope.bind` and registers a `settings.general.item` row mirroring it into a declared store. Enforcement (a host-side gate deferring work through peak windows) is deferred; this package owns the setting and its surface only.
- **workbench** is one additive `conversation.view` tab whose inner pane auto-switches (conversation / execution / trajectory) from the session snapshot's `runningCalls`. Replacing the frame's central surface was rejected for the same reason as persona: upstream exposes no sanctioned external write path into the view-ring store.
- **debate** is one additive `conversation.view` tab folding protocol markers (`⚔️ 第 n 回合`, `正方：/反方：`, `⚖️ 判决`) out of finalized assistant text via the standard `useSession` hook. The debate itself runs host-side with ordinary subagent tools driven by the protocol documented in the package README; no new host API was added.

What was given up: features that fundamentally need an upstream seat (per-message avatars, frame-level view auto-switching) ship as the nearest sanctioned surface with the gap recorded under Known Limitations, rather than as upstream patches.

## Alternatives considered

- Forking the Neon implementation directly: rejected — its own additions are PolyForm-Noncommercial and it modifies upstream packages, defeating the clean-upstream-fork goal.
- Registering a selectable `nightcity` theme id: rejected — the theme service's settings adoption reverts in-process extension themes when a persisted preference arrives (the bug Neon patched in ui-theme); an override layer is immune without the patch.
- Adding the missing upstream seats (`conversation.chat.persona`, a view-default provide channel): rejected — any upstream edit reintroduces the merge-conflict cost this edition exists to avoid.

## Consequences

- All registrations ride `ctx.slots.inject`, so contributions install after the owning declaration and roll back with the contributor's fiber; every package proves disposal in its browser-plugin spec.
- Marker parsing, pane derivation, and the off-peak schedule are pure modules so coverage stays at the per-file 100% gate without render machinery.
- tsconfig references and the three registration surfaces (aggregate `tsconfig.client.json`, `cordis.patch.yml` row, web-app dependency) are per-package; `verify-client-packages --fix` repairs manifest drift.
