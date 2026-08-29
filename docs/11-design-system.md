## 11. Design System

Current tokens, extracted from `app/globals.css`. Treat this as the
existing system to extend, not replace.

- Font: Inter (primary), OpenDyslexic (accessibility override via
  `.font-dyslexic`).
- Base palette: background `#f4f6f8`, foreground `#1c252e`, card background
  `#ffffff` (opaque), border `#dcdcd6`.
- Category colors, each with a background/border/text triad:
  - Sage: `#EAEFE9` / `#C3D2C1` / `#2F4F2F`
  - Cerulean: `#E8F1F5` / `#BDD4E2` / `#1D3B51`
  - Terracotta: `#F9ECE7` / `#ECCBBF` / `#6A2B15`
- Font scale steps: normal (16px), large (18px), xlarge (20px), with
  matching heading scale overrides for `h1`-`h3`.
- High contrast mode overrides every token above to pure black/white plus
  saturated category colors, triggered by a `body.high-contrast` class.

### Rules for extending this system
- New feature colors follow the same three-token pattern (bg/border/text),
  never a single flat color, so high-contrast mode has something to
  override.
- No new font family without an accessibility-mode equivalent, matching the
  Inter/OpenDyslexic pairing already in place.
- Card surfaces use the existing `glass-card` / `bg-card-bg` pattern for
  visual consistency across dashboards: opaque white background, a
  hairline border, and a single soft flat shadow — no transparency, blur,
  or hover motion.
