# 22 — Blitz Character Art Spec

> The delivery contract for Blitz-mode fighter art. The cinematic stage
> (`src/components/blitz/CharacterShot.tsx`) cuts between a handful of **static
> poses** per character — no video, no sprite sheets. Produce art to this template
> and drop it in; no code change is needed beyond registering the paths.
>
> Code contract: `src/lib/debate/blitzCharacters.ts`. Until a model has art it
> renders the placeholder hero, so the mode is fully playable with zero art.

## The idea (why stills are enough)

The "objection meme" look is not animation — it's ~6 static drawings per
character plus aggressive **camera direction** (hard cuts, a white flash, a
slammed-in bubble, screen shake, speed lines, a slow push-in). The engine already
does all the camera work. You only supply consistent stills.

## Pose set (the contract — keep these exact keys)

| Pose | When it shows | Direction |
|---|---|---|
| `idle` | neutral / intro / fallback for any missing pose | calm, ready stance, facing slightly inward |
| `talk` | while delivering a line | mouth open / mid-gesture (the "speaking" hero shot) |
| `attack` | on a move cut-in (OBJECTION / COUNTER / FINISHER) | dynamic lunge or point, high energy |
| `shock` | reserved: reaction when hit by a move | recoil, wide-eyed (optional in v1) |
| `win` | verdict, if this fighter won | triumphant pose |
| `lose` | verdict, if this fighter lost | deflated pose |

**Minimum viable set:** `idle`, `talk`, `attack`, `win`, `lose` (5). `shock` is
optional. Any missing pose falls back to `idle`, then to the placeholder hero.

## Canvas & format

- **Dimensions:** 1024×1024 px, transparent background (PNG or WebP; export final
  as **WebP** for size). The stage scales art down to ~46vh, so 1024 is ample.
- **Safe area / anchor:** center the character horizontally; feet/base near the
  bottom third; keep the head within the top ~15% padding. Every pose must share
  the **same anchor and scale** so cutting between them doesn't make the character
  jump or resize.
- **One character, one visual language:** all poses of a character must read as the
  same fighter (same palette, proportions, outfit).
- **Weight:** keep each file ≲ 200 KB (WebP). Only the two fighters in a match are
  preloaded, so total roster size doesn't hurt load — but per-image weight does.

## Art direction

- Match the app's arcade language: **thick black outlines, bold flats, chunky
  shadows, bright saturated colors** (see `docs/02_DESIGN.md`). Think sticker /
  fighting-game character select, not soft illustration.
- Give each fighter a silhouette that reads at a glance and a color that doesn't
  clash with the side frame (A = arcade blue `#2563EB`, B = arcade red `#DC2626`).
- Expressions should be big and legible — this is comic drama, not subtlety.

## Trademark / brand rules (important)

- Characters are **Debator's own original fighters**, loosely themed to each model.
- **Never** draw the providers' logos as faces, use their brand mascots, or their
  wordmarks/trademarks. No "the GPT robot," no Gemini mascot, etc.
- Never reference "Ace Attorney" / "Phoenix Wright"; don't reproduce that game's
  specific character designs, speech-bubble art, fonts, or sounds. "OBJECTION" as a
  word is fine (generic courtroom language); the specific expression is not.

## File layout & registration

Put files under:

```
public/blitz/<characterKey>/idle.webp
public/blitz/<characterKey>/talk.webp
public/blitz/<characterKey>/attack.webp
public/blitz/<characterKey>/win.webp
public/blitz/<characterKey>/lose.webp
public/blitz/<characterKey>/shock.webp   (optional)
```

`<characterKey>` is the key already declared per model in
`src/lib/debate/blitzRoster.ts` (e.g. `deepseek-pro`, `qwen-next`). Then register
the paths in `BLITZ_CHARACTER_ART` in `src/lib/debate/blitzCharacters.ts`:

```ts
export const BLITZ_CHARACTER_ART: Record<string, BlitzCharacterArt> = {
  "deepseek-v4-pro": { poses: {
    idle: "/blitz/deepseek-pro/idle.webp",
    talk: "/blitz/deepseek-pro/talk.webp",
    attack: "/blitz/deepseek-pro/attack.webp",
    win: "/blitz/deepseek-pro/win.webp",
    lose: "/blitz/deepseek-pro/lose.webp",
  }},
};
```

(The key is the **modelId**, the folder is the **characterKey** — they can differ.)

## AI-generation prompt template (starting point)

Generate the `idle` first to lock the design, then produce the other poses **as
edits of that same character** so they stay consistent (same tool, "same character,
new pose").

> Full-body original mascot fighter for a debate arcade game, bold arcade sticker
> style: thick black outlines, flat saturated colors, chunky drop shadow,
> expressive cartoon face. [describe the character concept — an original design,
> NOT any company's logo or mascot]. Centered, facing slightly to the [left/right],
> transparent background, 1024×1024, full body with feet near the bottom. Pose:
> **[idle: calm ready stance / talk: mouth open mid-argument, one hand gesturing /
> attack: dramatic forward lunge pointing, high energy / win: triumphant arms up /
> lose: slumped, defeated]**. Consistent proportions and palette across poses.

Keep the anchor identical between poses — if the tool drifts the size/position,
re-center and re-scale in an editor so the cut between poses is seamless.

## Checklist before adding a character

- [ ] 5–6 poses, same anchor/scale, transparent background, WebP ≲ 200 KB each.
- [ ] Reads clearly at ~46vh; face/expression legible.
- [ ] Original design — no provider logos/mascots, no Ace Attorney assets.
- [ ] Files under `public/blitz/<characterKey>/`, registered in `blitzCharacters.ts`.
- [ ] Ran `npx tsc --noEmit` + started a Blitz match with that fighter to sanity-check.
