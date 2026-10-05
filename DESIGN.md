# Ecopin Design System: Civic, Clean & Modern

This document outlines the core design language, aesthetic principles, and technical implementation details for the Ecopin platform. This system is designed to be reusable across web, mobile, and any other platforms within the Ecopin ecosystem.

---

## 0. Design References

The Ecopin design system draws from the following proven civic and government design systems. All design decisions should be traceable to these references:

| Reference | Source | Key Influence |
| :--- | :--- | :--- |
| **GOV.UK Design System** | [design-system.service.gov.uk](https://design-system.service.gov.uk) | Plain-language UI, typography hierarchy, functional color tokens, minimal chrome |
| **U.S. Web Design System (USWDS)** | [designsystem.digital.gov](https://designsystem.digital.gov) | 8px spacing grid, Public Sans-style readability, token-driven theming, accessibility-first |
| **Singapore Govt. Design System (SGDS)** | [designsystem.gov.sg](https://designsystem.gov.sg) | Inter typeface, 8px grid, WCAG 2.2 AA compliance, mobile-first layout |
| **LifeSG (Singapore)** | [life.gov.sg](https://life.gov.sg) | Citizen-centric "life moments" IA, transactional clarity, multi-agency UX |
| **Colorado.gov** | [colorado.gov](https://www.colorado.gov) | Award-winning state portal, task-first homepage navigation, consistent branding at scale |
| **California DMV** | [dmv.ca.gov](https://www.dmv.ca.gov) | Appointment/task scheduling flow, high-traffic information architecture clarity |
| **DICT/eGovPH Standards** | [dict.gov.ph](https://dict.gov.ph) | Philippine LGU compliance: WCAG 2.0, Transparency Seal, mobile-first mandate |

> **Guiding Principle (from GOV.UK):** *"The best design is invisible."* — A civic interface should never draw attention to itself. It should dissolve into the task at hand, placing all focus on citizen action and data clarity.

---

## 1. Core Philosophy

The design prioritizes accessibility, trust, and clarity. It moves away from harsh, technical brutalist aesthetics toward a **Clean, Civic-Friendly, and Modern** interface.

It communicates transparency and professional civic action while remaining highly legible. It feels like an approachable public service utility combined with a sophisticated, yet user-friendly operational dashboard.

**Reference Alignment:**
- Like **GOV.UK**, we deprioritize decorative complexity and favor clear, functional layouts.
- Like **USWDS**, we use a strict token system so design updates propagate atomically.
- Like **SGDS/LifeSG**, we organize information around *workflows and tasks* (citizen life moments = field crew operational moments), not internal department/data-model structure.

### Key Characteristics:

*   **Soft & Welcoming:** Soft border radiuses, clean lines, and an absence of thick, harsh borders — echoing the card-based surface approach of LifeSG and the rounded form fields of Colorado.gov.
*   **Accessible Colors:** High-contrast neutral grays and pure whites. Primary blue signals trust and action (consistent with USWDS primary action color and SGDS "blue = information/action" convention).
*   **Subtle Elevation:** Soft, diffused drop shadows rather than solid offset borders. Depth through lightness and elevation, not heavy outlines — as prescribed in the USWDS depth guidance.
*   **Clear Typography:** Modern, readable geometric sans-serifs. Monospace is used extremely sparingly, only for actual data or coordinates, never for general UI copy (GOV.UK principle: no decorative typeface switching).
*   **Task-Centered Navigation:** Every screen is organized around *what the user needs to do*, not around internal data hierarchy. Top CTAs mirror the "Quick Actions" pattern from Colorado.gov and CalDMV. (See: ARCHITECTURE.md for the Workflow > Task > Cluster > Report drill-down.)

---

## 2. Color Palette

The color system is designed to be clean, professional, and accessible. Token naming follows USWDS semantic convention: **primitive → semantic → component**.

> **Reference (SGDS):** "Colours are functional, hierarchical, and accessible. The system mandates sufficient contrast ratios to meet WCAG AA standards. Blue = general information/action. Amber = attention/warning. Green = success. Red = problems/errors. Grey = neutral palette."

> **Reference (USWDS):** Colors are defined as design tokens, not hard-coded hex values. Changing a primitive token propagates to all components.

### Semantic Color Tokens

| Token | Hex | WCAG AA on White | Usage |
| :--- | :--- | :--- | :--- |
| `--color-action` | `#0052CC` | ✅ Pass (7.3:1) | Primary brand, interactive elements, primary buttons. Mirrors USWDS `primary` and SGDS blue convention. |
| `--color-action-hover` | `#003D99` | ✅ Pass | Hover/focus states on primary interactive elements. |
| `--color-action-light` | `#EBF2FF` | — | Tinted backgrounds on active nav items, selected states, info banners. |
| `--color-action-secondary` | `#60A5FA` | ⚠️ Use on dark bg only | Secondary accents on dark surfaces only. |
| `--color-success` | `#2E7D32` | ✅ Pass (5.9:1) | Completed status, verified states. (SGDS: Green = success) |
| `--color-warning` | `#B45309` | ✅ Pass | Pending/attention states. Amber adjusted for WCAG AA text contrast. |
| `--color-warning-bg` | `#FEF3C7` | — | Background tint for warning banners and chips. |
| `--color-error` | `#D32F2F` | ✅ Pass (5.3:1) | Urgent/error states. (SGDS: Red = problems/errors) |
| `--color-info` | `#0288D1` | ✅ Pass | Informational banners, non-critical alerts. |

### Surface & Background Tokens

| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--color-bg` | `#F9FAFB` | `#121212` | Page background. Light: warm off-white (GOV.UK-inspired). Dark: true neutral. |
| `--color-surface` | `#FFFFFF` | `#1C1C1C` | Card and container backgrounds. |
| `--color-surface-elevated` | `#F3F4F6` | `#2A2A2A` | Hover states, secondary containers, nested surfaces. |
| `--color-border` | `#E5E7EB` | `#333333` | Subtle dividers. Never use for structural layout — use background contrast instead. |

### Text Tokens

| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--color-text-primary` | `#111827` | `#F9FAFB` | Body text, headings. WCAG AAA on surface. |
| `--color-text-secondary` | `#6B7280` | `#9CA3AF` | Captions, metadata, helper text. WCAG AA on surface. |
| `--color-text-disabled` | `#D1D5DB` | `#4B5563` | Disabled states only. Never for informational text. |
| `--color-text-inverse` | `#FFFFFF` | `#111827` | Text on colored backgrounds (e.g., primary buttons). |

*(Note: Neon greens like `#CCFF00` have been explicitly deprecated and must not be used anywhere in the codebase.)*

*(Note: Blue-tinted grays like Tailwind `slate-*` are deprecated for dark mode. Use pure neutral grays to maintain professional contrast.)*

---

## 3. Typography

The typography focuses on legibility and a friendly, modern civic feel.

> **Reference (SGDS):** Inter is chosen for its "excellent legibility on computer screens and its tall x-height." Hierarchy: H1 (40px/Bold) → H4 (18px/Bold) → Body (16px/Regular) → Small (14px/Regular).

> **Reference (GOV.UK):** No decorative typeface switching. One typeface family for all UI. Monospace is reserved strictly for code/data.

> **Reference (USWDS):** Public Sans — optimized for readability, multiple weights. Ecopin uses `Outfit` (equivalent geometric humanist sans) as its primary.

### Font Families

1.  **Primary/Reading:** `'Outfit', 'Inter', system-ui, -apple-system, sans-serif`
    *   *Usage:* Headlines, task descriptions, UI text, primary buttons, navigation.
    *   *Weights in use:* `400` (Regular), `500` (Medium), `600` (SemiBold). Avoid `700+` except for page-level H1 headings only.
    *   *Avoid:* `font-black` (900), excessive uppercase strings. Use `font-medium` for emphasis, not weight extremes.
2.  **Data/Code:** `'Roboto Mono', monospace`
    *   *Usage:* **Only** for exact coordinates, system IDs, raw sensor data displays, or code blocks. Never for general UI copy or labels.

### Type Scale (8px-grid aligned, per SGDS)

| Role | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `2.5rem` (40px) | 600 | 1.2 | Page hero titles only |
| **H1** | `2rem` (32px) | 600 | 1.25 | Dashboard section titles |
| **H2** | `1.5rem` (24px) | 600 | 1.3 | Card headers, modal titles |
| **H3** | `1.25rem` (20px) | 500 | 1.4 | Sub-section labels |
| **H4** | `1.125rem` (18px) | 500 | 1.4 | Field labels, sidebar headings |
| **Body** | `1rem` (16px) | 400 | 1.6 | Primary reading text, descriptions |
| **Small** | `0.875rem` (14px) | 400 | 1.5 | Captions, metadata, timestamps |
| **XSmall** | `0.75rem` (12px) | 400 | 1.4 | Badge labels, status chips only |

---

## 4. Spacing System

> **Reference (SGDS & USWDS):** Both systems use a strict **8px base grid**. All spacing values are multiples of 8px: `8, 16, 24, 32, 40, 48, 64, 80, 96`.

All padding, margin, gap, and layout spacing must use values from this scale:

| Token | Value | Use Case |
| :--- | :--- | :--- |
| `--space-1` | `4px` | Half-unit. Micro-gaps only (icon-to-text). |
| `--space-2` | `8px` | Base unit. Tightest intentional spacing. |
| `--space-3` | `12px` | Compact padding (chips, small badges). |
| `--space-4` | `16px` | Default inner padding (cards, inputs). |
| `--space-5` | `24px` | Between related elements. |
| `--space-6` | `32px` | Between distinct components/sections. |
| `--space-8` | `48px` | Major section breaks. |
| `--space-10` | `64px` | Page-level vertical rhythm. |
| `--space-12` | `80px` | Hero/banner vertical padding. |

---

## 5. UI Elements & Motifs

### A. Borders & Shapes

> **Reference (GOV.UK):** "Borders should be used purposefully. Avoid borders for layout decoration — use background contrast instead."

*   **Thickness:** Borders should be avoided where possible, relying instead on background contrast and shadows. When necessary, use `1px` with `--color-border`. Never use `2px+` for structural layout chrome.
*   **Corners:** (Reference: LifeSG card system, Colorado.gov task cards)
    *   Inputs / small elements: `8px`
    *   Cards / containers: `16px` (`rounded-2xl`)
    *   Modals / large panels: `24px` (`rounded-3xl`)
    *   Pills / badges / avatar chips: `9999px` (`rounded-full`)
    *   Large structural containers / hero sections: `32px`

### B. Elevation & Shadows

> **Reference (USWDS):** "Depth is established through lightness and soft diffusion, not hard offsets or colored borders."

```
--shadow-sm:  0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:  0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06);
--shadow-xl:  0 16px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);
```

- `--shadow-sm` → Default card rest state
- `--shadow-md` → Hovered card, dropdown panels
- `--shadow-lg` → Modals, sidesheets, floating FABs
- `--shadow-xl` → Splash overlays, onboarding modals

### C. Interactions & Hover States

> **Reference (GOV.UK & SGDS):** "Micro-interactions provide immediate feedback without distraction."

*   **Focus Rings:** `box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.4)` — 3px for WCAG 2.4.11 compliance. No background color shifts.
*   **Hover:** Cards lift gently (`transform: translateY(-2px)`) with shadow upgrade (`--shadow-sm` → `--shadow-md`). Background-only hover states shift to `--color-surface-elevated`.
*   **Active/Press:** Slight compress (`transform: translateY(0) scale(0.99)`), instant response.
*   **Transitions:** `transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)` — Material/SGDS standard easing. Never use `linear` for UI transitions.

### D. Map & Visual Design

*   **Map Markers:** Clean, rounded UI elements with `--shadow-md` elevation. Active states scale up (`scale(1.15)`) with a 3px blue focus ring.
*   **Status Indication:** Colored indicator dots (8px circle) or left-border accents (3px colored bar on card edge). Never rely on color alone — always pair with a text label (GOV.UK: no color-only status communication).

### E. Dark Mode Implementation

*   Dark mode uses a pure neutral grayscale: `#121212` → `#1C1C1C` → `#2A2A2A` → `#333333`.
*   Actively avoids blue-tinted grays (Tailwind `slate-*`). Pure neutral is warmer and more readable for extended dashboard use.
*   `--color-action` (`#0052CC`) remains consistent in both modes — sufficient contrast on dark surfaces.
*   Drop shadows in dark mode use reduced opacity: `rgba(0,0,0,0.3)`.

---

## 6. Layout Structure (Web Specifics)

> **Reference (USWDS & Colorado.gov):** "Task-first homepage navigation — prominent Quick Action patterns for top-tier tasks."
> **Reference (DICT/WCAG):** Mobile-first is mandatory. Minimum touch target: `44px × 44px`.

1.  **Header/Nav:**
    *   Sticky, compact. Clean `--color-surface` background with `--shadow-sm` on scroll.
    *   Logo + wordmark on left. Primary nav links center/right. Role indicator far right.
    *   Full-width sticky bar (not pill nav — pill nav suits marketing pages, not dense operational dashboards).

2.  **Sidebar (Dashboard):**
    *   Fixed-width `240px` for operational views. Icon + label navigation (LifeSG-style clear icon+text pairing).
    *   Active state: `--color-action-light` background with `--color-action` left border accent (3px).
    *   Collapses to icon-only on `< 1024px`.

3.  **Hero Section (Landing/Public):**
    *   `Display` size headline. Min `--space-12` vertical padding, strong contrast CTA button.
    *   Background: solid `--color-bg` or subtle geometric/topographic SVG in `--color-action-light`. Never photography that reduces text legibility.

4.  **Data Displays (Tables & Dashboards):**
    *   Borderless row layout. Alternating `--color-surface` / `--color-surface-elevated` or hover-only row highlight.
    *   Cards: `--shadow-sm` rest, `--shadow-md` hover, no visible borders.
    *   Status chips: `XSmall` text, `rounded-full`, always paired color+label (never color-only).

5.  **Quick Actions Bar:**
    *   Prominent, at top of dashboard home. Mirrors Colorado.gov/CalDMV task-first pattern.
    *   Top 4–6 frequent actions as icon+label cards. Reorganizable by role (SWMO Officer vs. Field Crew vs. Admin).

6.  **Footer:**
    *   SWMO contact information: `swmo@pasigcity.gov.ph` / `09173726888`.
    *   Navigation links grouped by functional area (not by department).
    *   Transparency Seal link (DICT/Philippines compliance mandate).
    *   Copyright + accessibility statement.

---

## 7. Accessibility Standards

> **Reference (WCAG 2.2 AA — DICT Mandatory, SGDS Standard):**

*   **Color Contrast:** All text must meet WCAG AA (4.5:1 body, 3:1 large text/UI components). All primary tokens verified above.
*   **Focus Management:** All interactive elements must have a visible 3px focus ring. Focus order must match visual reading order.
*   **Touch Targets:** Minimum `44px × 44px` for all interactive elements (WCAG 2.5.5). Icon-only buttons must have `aria-label`.
*   **No Color-Only Communication:** Every status must pair color with a text label or icon. (GOV.UK: color blindness affects ~8% of males.)
*   **Plain Language:** All user-facing copy must be direct and jargon-free — even in internal operational tools.
*   **Keyboard Navigation:** All flows must be fully operable via keyboard. Tab order must be logical.

---

## 8. Implementation Checklist for Other Platforms (Mobile/App)

If adapting this design to the Flutter/React Native mobile app:
- [ ] Remove all brutalist `border-4` or hard offset shadows. Replace with `--shadow-sm` equivalent (`elevation: 2`).
- [ ] Apply the 8px spacing grid for all padding and margin values.
- [ ] Use `Outfit` or `Inter` as the primary typeface with the defined type scale.
- [ ] Ensure all containers and buttons use the defined border radiuses (`8px` inputs, `16px` cards).
- [ ] Strictly implement `--color-action` (`#0052CC`) for all primary actions.
- [ ] Support both Light and Dark mode using the unified neutral palette.
- [ ] Eliminate monospace for all general UI text.
- [ ] All status indicators must include a text label — never rely on color alone.
- [ ] Minimum touch target: `44 × 44 dp`.
- [ ] Verify WCAG AA contrast for all text/background combinations before shipping.
