# Ecopin Design System: Neo-Brutalist / Cyber-Matrix 

This document outlines the core design language, aesthetic principles, and technical implementation details for the Ecopin neo-brutalist redesign. This system is designed to be reusable across web, mobile, and any other platforms within the Ecopin ecosystem.

## 1. Core Philosophy
The design bridges the gap between raw civic action and cutting-edge geospatial technology. Moving away from friendly, rounded, "corporate-green" aesthetics, this style embraces a **Cyber-Brutalist** / **Terminal** look. 

It communicates urgency, transparency, and grassroots action. It feels like a high-tech control center combined with a rebellious underground movement.

### Key Characteristics:
*   **High Contrast:** Absolute blacks and blinding neon greens.
*   **Raw & Unapologetic:** Sharp edges, thick borders, no soft drop shadows (except for glowing elements).
*   **System/Terminal Accents:** Monospace typography, code-like brackets `[08]`, and system readouts.
*   **Kinetic & Glitchy:** Overlapping elements, blend modes, and harsh hover interactions.

---

## 2. Color Palette

The color system is highly restricted to maintain maximum impact. Avoid using gradients unless they are used to create structural noise or glowing light effects.

| Role | Hex | RGB | Usage |
| :--- | :--- | :--- | :--- |
| **Deep Black (Base)** | `#000000` | `rgb(0,0,0)` | Primary background, text on neon, heavy borders. |
| **Neon Lime (Primary)** | `#CCFF00` | `rgb(204,255,0)` | Main accent, primary buttons, borders, highlights, glowing orbs. |
| **Pure White** | `#FFFFFF` | `rgb(255,255,255)` | Primary text, secondary borders, secondary accent. |
| **Dark Grey (Surface)**| `#111111` | `rgb(17,17,17)` | Secondary backgrounds (e.g., inside mockups/cards). |
| **Status: Urgent** | `#FF0000` | `rgb(255,0,0)` | Urgent report tags, critical errors. |

---

## 3. Typography

The typography discards modern geometric sans-serifs (like Inter or Outfit) in favor of raw, unpolished, native fonts. 

### Font Families
1.  **Primary/Display:** `Helvetica`, `Arial`, `sans-serif`
    *   *Usage:* Headlines, massive hero text, primary buttons.
    *   *Styling:* Always use the heaviest weight available (`font-black`), tightly tracked (`tracking-tighter`), and often uppercase.
2.  **Secondary/System:** `monospace` (System default like `Courier New` or `SF Mono`)
    *   *Usage:* System readouts, timestamps, small labels, UI chips, footer text.
    *   *Styling:* Small, uppercase, widely spaced (`tracking-widest`).

### Typographic Rules
*   **Headlines:** Keep line-heights extremely tight (e.g., `leading-[0.85]`). Break lines manually for structural effect.
*   **Outline Text:** Use CSS text strokes (`-webkit-text-stroke: 2px #ccff00`) with transparent fills for massive background text or secondary headline lines.
*   **Text Highlights:** Wrap inline text in a solid `#ccff00` block with `#000000` text for immediate emphasis.

---

## 4. UI Elements & Motifs

### A. Borders & Shapes
*   **Thickness:** Use thick, unapologetic borders (`border-4`, `border-8`). 
*   **Corners:** Sharp (`rounded-none`). If rounding is necessary (like on a phone mockup), use exaggerated curves juxtaposed against sharp outer containers.

### B. Interactions & Hover States (Brutalist Shadows)
Avoid soft, blurry drop shadows for standard UI elements. Use **solid, offset shadows**.
*   **Resting State:** Button has a solid shadow, e.g., `box-shadow: 8px 8px 0px 0px #ccff00;`
*   **Hover State:** Button translates to "press down" into the shadow, e.g., `transform: translate(8px, 8px); box-shadow: 0px 0px 0px 0px #ccff00;`

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
The brutalist aesthetic is inherently neon-on-black. When implementing **Light Mode**, follow these inversion rules:
*   **Backgrounds:** Pure white (`#ffffff`).
*   **Text & Borders:** Pure black (`#000000`).
*   **Accents:** Keep Neon Green (`#ccff00`) as the primary punch color for highlights and solid blocks.
*   **Shadows:** In light mode, solid black drop shadows (`shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]`) provide incredible brutalist contrast against white containers.

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
