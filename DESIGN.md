# Ecopin Design System: Refined Neo-Brutalist / Cyber-Matrix 

This document outlines the core design language, aesthetic principles, and technical implementation details for the Ecopin neo-brutalist redesign. This system is designed to be reusable across web, mobile, and any other platforms within the Ecopin ecosystem.

## 1. Core Philosophy
The design bridges the gap between raw civic action and cutting-edge geospatial technology. Moving away from "maximum neo-brutalism" towards a **Refined Cyber-Brutalist** / **Terminal** look. 

It communicates urgency, transparency, and grassroots action while remaining highly legible and accessible. It feels like a high-tech control center combined with a sophisticated operational dashboard.

### Key Characteristics:
*   **Controlled Contrast:** Dark charcoal (`#1A1A1A`) instead of pure black. Neon green used selectively for accents and active states.
*   **Structural & Technical:** Sharp edges (`rounded-none` or `rounded-sm`), 1px or 2px borders, subtle tectonic drop shadows (e.g., 2px offset).
*   **System/Terminal Accents:** Monospace typography strictly reserved for system readouts, metadata, and timestamps. Standard sans-serif for reading.
*   **Clear Hierarchy:** Not everything needs a heavy border. Outline weights establish importance.

---

## 2. Color Palette

The color system is highly restricted to maintain maximum impact. Avoid using gradients unless they are used to create structural noise or glowing light effects.

| Role | Hex | RGB | Usage |
| :--- | :--- | :--- | :--- |
| **Dark Charcoal (Base)** | `#1A1A1A` | `rgb(26,26,26)` | Primary background in dark mode, borders, text, and shadows. |
| **Neon Lime (Accent)** | `#CCFF00` | `rgb(204,255,0)` | Active states, highlights, glowing orbs, primary buttons. Used selectively. |
| **Pure White** | `#FFFFFF` | `rgb(255,255,255)` | Primary text (dark mode), secondary backgrounds (light mode). |
| **Dark Grey (Surface)**| `#222222` | `rgb(34,34,34)` | Secondary backgrounds. |
| **Status: Urgent** | `#FF0000` | `rgb(255,0,0)` | Urgent report tags, critical errors. |

---

## 3. Typography

The typography discards modern geometric sans-serifs (like Inter or Outfit) in favor of raw, unpolished, native fonts. 

### Font Families
1.  **Primary/Reading:** `Helvetica`, `Arial`, `sans-serif` (or modern sans like `Outfit`)
    *   *Usage:* Headlines, task descriptions, UI text, primary buttons.
    *   *Styling:* Avoid excessive uppercase for readability. Use `font-bold` for emphasis rather than always `font-black`.
2.  **Secondary/System:** `monospace` (System default like `Courier New` or `SF Mono`)
    *   *Usage:* System readouts, timestamps, metadata, specific tags.
    *   *Styling:* Small, uppercase, widely spaced (`tracking-widest`).

### Typographic Rules
*   **Headlines:** Keep line-heights relatively tight.
*   **Outline Text:** Use CSS text strokes (`-webkit-text-stroke: 1px #ccff00`) sparingly.
*   **Hierarchy:** Do not make all text uppercase. Reserve uppercase for headers and small metadata.

---

## 4. UI Elements & Motifs

### A. Borders & Shapes
*   **Thickness:** Establish hierarchy. Standard containers use `border-border` (1px). Primary interactive containers use `border-2` (charcoal).
*   **Corners:** Sharp (`rounded-none`) or slightly refined (`rounded-sm`). Avoid large border radiuses.

### B. Interactions & Hover States (Refined Shadows)
Avoid soft, blurry drop shadows for standard UI elements. Use **solid, subtle offset shadows**.
*   **Resting State:** Button has a solid shadow, e.g., `box-shadow: 2px 2px 0px 0px #1A1A1A;`
*   **Hover State:** Button translates to "press down" into the shadow, e.g., `transform: translate(2px, 2px); box-shadow: 0px 0px 0px 0px #1A1A1A;`

### C. Mix-Blend Modes
Use CSS `mix-blend-difference` and `mix-blend-exclusion` for overlapping text and shapes. This ensures text remains readable even when intersecting with solid neon blocks, while adding a glitchy, technical feel.

### D. System Overlays & Grids
The "Matrix" look is achieved through CSS background patterns.
*   **Map Grids:** Linear gradients creating technical intersection points and crosshairs, mimicking satellite maps or targeting systems.
*   *Implementation (CSS):*
    ```css
    background-image: linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px);
    background-size: 100px 100px;
    ```

### E. Interactive Backgrounds & 3D Objects
*   Instead of static background blobs, utilize **Interactive Particle Systems** that respond to the user's cursor.
*   Particles should mimic "specks navigating through a map", pulling gently towards the cursor when hovered and leaving motion-blurred trails behind them to emphasize the real-time tracking aspect of the platform.
*   **3D Elements:** Key presentation items (like phone mockups) should utilize CSS 3D transforms (`rotateX`, `rotateY` with `perspective`) to tilt responsively based on cursor movement.

### F. Glitch Triggers
*   Glitch text effects (like sliced typography) should **strictly be triggered on `:hover`**.
*   Do not leave heavy CSS animations looping infinitely, as this causes cognitive overload. The glitch is a reward/feedback for user interaction.

### G. Floating "UI Chips"
Scatter small, tilted UI cards across the layout to represent the "live" nature of the platform (e.g., `[ ✅ RESOLVED ]`, `[ 🔴 URGENT ]`). Rotate them slightly (`rotate-[-12deg]`) and give them thick borders.

---

## 5. Light Mode Implementation
The refined brutalist aesthetic relies on charcoal-on-white. When implementing **Light Mode**, follow these inversion rules:
*   **Backgrounds:** Pure white (`#ffffff`) or light surface (`#F8FAF6`).
*   **Text & Borders:** Charcoal (`#1A1A1A`).
*   **Accents:** Keep Neon Green (`#ccff00`) as the primary punch color for highlights.
*   **Shadows:** In light mode, subtle charcoal drop shadows (`shadow-[2px_2px_0px_0px_#1A1A1A]`) provide brutalist contrast against white containers.

---

## 6. Layout Structure (Web Specifics)

1.  **Header/Nav:** Thick bottom border. Navigation links should be uppercase, monospace, or heavy sans-serif. Hover states should invert colors (black text on neon green background).
2.  **Hero Section:** 
    *   Large, bold typography with hard line breaks.
    *   Text strokes (`-webkit-text-stroke`) used for hollow "ghost" text effects.
    *   Subtle map/coordinate overlays behind elements.
3.  **Data Displays (How it Works/Features):** Monospace fonts with high-contrast text. Use borders and neon highlights to direct attention.
4.  **3D Containers:**
    *   When embedding 3D interactive objects (like phone mockups), allow the object to intentionally break out of the container bounds using negative margins or oversized dimensions.
    *   Ensure floating UI chips maintain a high `z-index` (e.g., `z-30`) so they never clip behind the 3D transforms.
5.  **Footer:** 
    *   Must be heavily structured, utilizing multiple columns with a clear separation of Brand, Navigation, and Legal information.
    *   Use monospace font (`font-mono`) and muted colors (`text-gray-400`) for secondary information like copyright and status indicators (e.g., `SYSTEM: ONLINE`).
6.  **Section Dividers:** 
    *   Use infinite CSS marquees with thick top and bottom borders.
    *   Text should be repeating calls to action: `REPORT IT. TRACK IT. WATCH IT DISAPPEAR. //`
7.  **Content Sections:** Use asymmetrical grid layouts. Wrap text in heavily bordered containers.

---

## 6. Implementation Checklist for Other Platforms (Mobile/App)

If adapting this design to the Flutter/React Native mobile app:
- [ ] Override default navigation bars with absolute black backgrounds and neon green bottom borders.
- [ ] Replace soft shadows with solid, non-blurred offset shadows.
- [ ] Use system Sans-Serif (iOS: San Francisco bold/black, Android: Roboto Black) and System Monospace.
- [ ] Map pins should not be standard teardrops; they should be glowing orbs or sharp, technical squares.
- [ ] Use dark mode as the *only* mode. There is no light mode in this design system.
