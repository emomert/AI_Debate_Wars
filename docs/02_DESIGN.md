# 02 — Design System

## Design Goal

The product must look like a playful browser-based arcade game, not a corporate AI SaaS product.

The visual direction is inspired by casual puzzle game interfaces:

- dotted grid background
- thick black borders
- rounded rectangles
- chunky shadows
- bright buttons
- small badges
- tactile interactions
- playful icon buttons
- animated states
- clear game-like hierarchy

The UI should feel like a “debate arena” where AI models are fighters or characters.

## Design Motto

> Arcade interface. Serious intelligence.

## What the UI Should Feel Like

The UI should feel:

- playful
- bold
- tactile
- colorful
- energetic
- interactive
- slightly silly, but not childish
- polished enough to feel intentional

The UI should not feel:

- sterile
- enterprise
- generic
- plain chatbot
- Notion-like
- overly minimalist
- academic
- like a standard SaaS dashboard

## Visual References From Provided Screenshots

Use these characteristics:

1. Light gray dotted grid background
2. Rounded main panels
3. Thick black outlines
4. Dashed border panels
5. Bright yellow badges and action buttons
6. Large green primary buttons
7. Game-like top icons
8. Compact information counters
9. Rounded card UI
10. Black drop shadows
11. Chunky typography
12. Strong spacing and alignment
13. Small UI stickers like “Daily Game”
14. Friendly, low-friction layout

## Layout Philosophy

The app should feel like a game screen.

Each page should have:

- clear central focus
- large main panel
- top HUD/status bar
- colorful controls
- card-based sections
- playful microcopy
- visible interaction feedback

## Global Background

Use a dotted grid background.

Example CSS idea:

```css
background-color: #f7f7f2;
background-image: radial-gradient(#c9c9c9 1px, transparent 1px);
background-size: 16px 16px;
```

Avoid pure white full-page background.

## Border System

Use thick black borders.

Default border:

```css
border: 4px solid #050505;
```

Small cards:

```css
border: 3px solid #050505;
```

Dashed panels:

```css
border: 3px dashed #8b8b8b;
```

Border radius:

- small badge: 10px
- button: 14px
- card: 18px
- main panel: 24px
- modal: 28px

## Shadow System

Use hard black shadows, not soft SaaS shadows.

Primary shadow:

```css
box-shadow: 6px 6px 0 #050505;
```

Small shadow:

```css
box-shadow: 3px 3px 0 #050505;
```

Pressed state:

```css
transform: translate(3px, 3px);
box-shadow: 2px 2px 0 #050505;
```

Do not use blurry shadows as the main visual style.

## Color Palette

### Core Colors

| Purpose | Color | Usage |
|---|---:|---|
| Ink Black | `#050505` | borders, text, shadows |
| Paper | `#F7F7F2` | background |
| White Card | `#FFFFFF` | cards, panels |
| Grid Dot | `#C9C9C9` | background dots |
| Yellow | `#FFD91A` | badges, judge, hints |
| Green | `#4CAF50` | start, confirm, positive |
| Blue | `#3B82F6` | Model A |
| Red | `#FF4D4D` | Model B / danger |
| Pink | `#FF75C3` | playful accent |
| Purple | `#8B5CF6` | judge / special |
| Orange | `#FF9F1C` | warnings, streaks |

### Color Rules

- Use blue consistently for Model A.
- Use red/pink consistently for Model B.
- Use yellow for judge, badges, hints, and special prompts.
- Use green for start/confirm buttons.
- Use orange for warnings or energy states.
- Use black for all outlines and strong text.

## Typography

Recommended Google Fonts:

### Headings

Use one of:

- Lilita One
- Baloo 2
- Bricolage Grotesque
- Fredoka
- Luckiest Guy, but only for very large hero titles

### Body

Use one of:

- Inter
- Space Grotesk
- Nunito Sans

### Numbers / Cost / Tokens

Use:

- JetBrains Mono
- Space Mono
- IBM Plex Mono

## Type Scale

### Hero Title

- desktop: 64px–80px
- mobile: 40px–48px
- font-weight: 900
- line-height: 0.95

### Page Title

- desktop: 40px–48px
- mobile: 32px
- font-weight: 900

### Section Title

- 24px–32px
- font-weight: 800

### Body

- 16px–18px
- font-weight: 500

### Small Labels

- 11px–13px
- font-weight: 800
- uppercase optional

## Main Components

### GameShell

The global page shell.

Responsibilities:

- dotted background
- max width container
- top HUD area
- responsive padding
- global sound controls
- optional background music indicator

### ArcadeButton

All primary actions should use this component.

Variants:

- primary-green
- primary-yellow
- model-blue
- model-red
- danger-red
- neutral-white
- judge-purple

Button behavior:

- hover: slightly lift
- active: depress with shadow reduction
- disabled: gray, lower opacity, no bounce
- sound: click effect if sound enabled

### Badge

Small pill-shaped UI label.

Use for:

- mode
- round count
- model provider
- cost
- tokens
- judge enabled
- beta labels
- tone

### AIModelCard

Each model should feel like a character/fighter.

Required fields:

- model display name
- provider
- nickname
- color corner
- role/stance
- model cost tier
- avatar/icon placeholder
- status: idle, thinking, speaking, finished, error

Visual states:

- idle: normal border
- selected: colored border + shadow
- thinking: pulsing dots
- speaking: glow or bouncing corner badge
- error: red warning badge

### DebateMessageCard

A message card for each AI turn.

Required fields:

- speaker
- provider/model
- round label
- role/stance
- content
- token usage
- estimated cost
- latency
- timestamp optional

Visual rules:

- Model A messages align left or use blue accents.
- Model B messages align right or use red/pink accents.
- Judge messages use yellow/purple accents and centered layout.
- Each card should have a cost badge at the bottom.
- Streaming text should appear inside the card with animated cursor.

### CostBadge

Shows compact cost data.

Example:

`$0.0031 • 842 tok • 2.4s`

Detailed hover/expand state can show:

- input tokens
- output tokens
- model price
- latency

### RoundCounter

Game-like HUD component.

Example:

`ROUND 2 / 5 — REBUTTAL`

Should be visible at top of debate screen.

### JudgeVerdictCard

Large final result card.

Should include:

- winner or stronger side
- summary
- score breakdown
- strongest arguments
- weakest arguments
- practical conclusion

Visual style:

- yellow/purple badge
- dramatic reveal animation
- confetti optional
- arcade “VERDICT” header

## Page Designs

### Home Page

Layout:

- Top-right: sound/help/settings icons
- Hero badge: “AI DEBATE ARENA”
- Big title: “Make AIs Fight Your Ideas”
- Short subtitle
- Large topic input
- Quick example topics
- Main CTA: “START MATCH”
- Secondary CTA: “TRY A SAMPLE DEBATE”

Hero should feel like a game start screen.

### Setup Page / Panel

Fields:

- topic
- mode
- model A
- model B
- round count
- tone
- judge mode
- judge model if needed
- max response length

Use cards with clear sections.

### Live Debate Page

Layout options:

#### Desktop

- top HUD
- left model card
- central timeline
- right model card
- bottom controls

#### Mobile

- top HUD
- model cards stacked horizontally in carousel or compact row
- timeline full width
- sticky bottom controls

### Final Result Page

Show:

- debate complete badge
- winner/verdict
- summary
- strongest arguments
- cost summary
- restart/share buttons

## Animation Guidelines

Use Framer Motion.

### Required Animations

- button hover/press
- page transition
- card entrance
- typewriter streaming
- thinking dots
- round transition
- verdict reveal
- cost counter increment

### Avoid

- excessive motion
- slow animations
- animations that block reading
- too many simultaneous effects

## Sound Design

Sound should be optional and muted by default.

Suggested sounds:

- button click
- round start
- model starts speaking
- model finishes speaking
- error
- verdict reveal

Rules:

- No autoplay music without user interaction.
- Always show sound toggle.
- Save sound preference in local storage.
- Keep sounds short and lightweight.

## Microcopy Style

Use playful but clear copy.

Examples:

- “Choose your fighters.”
- “Set the rules.”
- “Round locked.”
- “Judge enters the arena.”
- “The arena lights flickered.”
- “Model is thinking…”
- “Cost meter updated.”
- “Final verdict ready.”

Avoid overly childish copy.

## Accessibility

Even though the UI is playful, it must remain accessible.

Requirements:

- keyboard-accessible buttons
- visible focus states
- adequate contrast
- no information conveyed only by color
- reduced-motion support
- sound not required for understanding
- readable font sizes
- mobile-friendly hit targets

## Design Acceptance Criteria

The design is successful if:

- a screenshot immediately communicates a playful game interface
- the UI does not resemble a generic chat app
- model selection feels like choosing characters
- debate progression feels like rounds in a match
- costs are visible but not intimidating
- the final verdict feels satisfying
- the interface remains usable on mobile
