Design and build the frontend UI as a modern, premium data product — think Linear,
Vercel dashboards, and Notion's polish, but with a visual identity unique to THIS
product: an AI engine that takes messy, inconsistent spreadsheets and resolves them
into clean structured CRM records.

The signature idea: everywhere in this UI, show the transformation from "messy/raw"
to "clean/resolved." Don't just build a generic upload form — make the act of
mapping chaotic columns into structured fields the visual heart of the product.

DESIGN TOKENS

Color (use CSS variables, not hardcoded hex):
  --ink:        #14161F   (primary dark background, headers)
  --paper:      #F6F4EF   (primary light background)
  --ink-muted:  #4B4E5C   (secondary text on paper)
  --paper-muted:#B9BAC4   (secondary text on ink)
  --match:      #2FD895   (mint — matched/clean/success state)
  --review:     #F5A623   (amber — needs review/ambiguous state)
  --skip:       #EF6461   (coral — skipped/error state)
  --line:       rgba(20,22,31,0.08)  (hairline dividers on paper)

These status colors are not decorative — they are the same colors used in the
results table (imported/skipped/review), so the brand IS the product's own
status language. Do not introduce a separate "marketing" palette.

Typography:
  Display:  Space Grotesk or Cabinet Grotesk — used ONLY for H1/H2, tight
            tracking, large sizes (48-72px hero). Confident, geometric, a
            little technical.
  Body:     Inter — 16-18px body copy, comfortable line-height (1.6).
  Utility/Data: IBM Plex Mono or JetBrains Mono — used specifically to render
            anything representing RAW data: CSV column headers, field names,
            cell values, code-like labels ("crm_status", "email"). This is a
            deliberate signal: monospace = unprocessed/raw, sans = resolved/human.

Layout:
  - Hero: asymmetric split, NOT a centered bento grid. Left: headline + copy +
    CTA. Right: the signature animation (see below). Avoid symmetric
    stat-card hero patterns.
  - Below the fold: a light bento-style grid IS appropriate for the results
    dashboard and feature tiles, because those genuinely are independent
    modular units (this is a functional choice, not a default).
  - Generous whitespace, 8px spacing scale, soft 12-16px corner radii on
    cards (not full pill/squircle everywhere — reserve heavy rounding for
    interactive elements like buttons and chips).

Signature element (build this specifically, it's the memorable moment):
  In the hero, animate 5-6 small "chip" elements representing messy real-world
  column headers (e.g. "Contact No.", "phn", "Full Name", "e-mail ID",
  "Mobile#") drifting in from the left in mono font, muted/desaturated color.
  On a scroll trigger or on load, they travel along a subtle curved path and
  snap into clean paper-colored slots on the right labeled with the final
  CRM schema field names in mono ("mobile_without_country_code", "email",
  "name") — each snap triggers a brief mint (--match) glow + a thin
  connecting line that fades after ~1s. This should feel precise and
  satisfying, not bouncy or cartoonish. Respect prefers-reduced-motion
  (fall back to a static "before → after" pair of chip rows).

Motion overall:
  - Page load: stagger the hero elements in (headline, then subcopy, then the
    chip animation) over ~600ms, ease-out.
  - Upload → Preview → Confirm → Results should feel like ONE continuous
    surface, not four separate screens — use a shared layout transition
    (e.g. the table that appears in "preview" morphs in place into the
    "results" table rather than being replaced wholesale).
  - Hover states on buttons/cards: subtle lift (2-4px translateY) + shadow,
    150ms ease.
  - Loading state during AI extraction: do NOT use a generic spinner. Show
    the batch progress as small chip rows resolving left-to-right in real
    time (ties back to the signature motif) — "Batch 2 of 5 resolved."

Copy voice:
  - Plain, active, specific. Buttons say what they do: "Upload CSV",
    "Confirm import", "Download results" — never "Submit" or "Proceed."
  - Empty/error states explain what happened and what to do next, in the
    product's voice, not an apology: e.g. "No email or mobile found in this
    row — it was skipped." not "Oops! Something went wrong."
  - The hero headline should name the real problem plainly, e.g.
    "Any spreadsheet in. Clean CRM data out." — avoid vague AI-marketing
    phrases like "Supercharge your leads" or "Unlock the power of AI."

WHAT TO AVOID (explicitly):
  - Do not default to a warm cream (#F4F1EA) + terracotta (#D97757) + serif
    combination — this is the most common AI-generated look right now.
  - Do not default to near-black + single neon accent with no other identity.
  - Do not use numbered "01 / 02 / 03" section markers unless the content is
    a genuine sequence (the Upload → Preview → Confirm → Results flow IS a
    real sequence, so numbering IS justified there — but nowhere else).
  - Do not fill the hero with unnecessary stat cards ("99.9% accuracy",
    "10x faster") unless they are real and sourced from the actual build.

ACCESSIBILITY / QUALITY FLOOR:
  - Responsive down to 375px width, sticky table headers on mobile too.
  - Visible keyboard focus states on all interactive elements.
  - Color is never the ONLY signal for status — pair mint/amber/coral with
    an icon + text label (matched / needs review / skipped).
  - prefers-reduced-motion disables the chip animation and all transitions
    beyond simple opacity fades.

TECH:
  Next.js 14 (App Router) + TypeScript + Tailwind CSS. Define all tokens
  above as Tailwind theme extensions / CSS variables in globals.css, not
  inline hex values in components. Use Framer Motion for the hero animation
  and shared layout transitions between the four flow stages.