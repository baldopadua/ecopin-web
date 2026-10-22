# Admin Optimization Settings Layout Architecture

## 1. Overview
The Admin Optimization Settings page (`/dashboard/admin/optimization-settings`) has been redesigned into a tabbed layout adhering to `DESIGN.md` Section 21 tokens and standards.

### Primary Goals
1. **Fit Everything into Screen (No Scrolling)**: The page occupies `100%` viewport height without outer page scrollbars on `#workspace-content`.
2. **Tabbed Organization**:
   - **Tab 1: "SWMO Depot Location"**: Interactive map location picker, depot name, coordinates, and depot save controls.
   - **Tab 2: "Field Crew Configuration"**: Field crew cards, capability tags, shift schedules, new crew creation drawer, and crew save controls.
3. **Design System Alignment (`DESIGN.md` Section 21)**:
   - Primary Civic Blue (`#0052cc`) for active tabs, primary actions, and highlights.
   - Pill tabs (`border-radius: 9999px`) with count badges.
   - Clean 16px corner radii on the main panel container.
   - Preserved `PageHeader` with title, subtitle, breadcrumb navigation, and civic border divider.
   - Accessible tabs (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`).

---

## 2. Component Structure

```
<OptimizationSettingsContent> (styles.page)
├── <PageHeader>
│   ├── Breadcrumbs: Admin / Optimization settings
│   ├── Title: Optimization settings
│   └── Subtitle: Configure depot location, crew schedules, and operational parameters.
├── <TabSwitcher> (styles.tabList)
│   ├── [Tab 1] SWMO Depot Location
│   └── [Tab 2] Field Crew Configuration (Badge: count)
└── <TabContent> (styles.tabContent)
    ├── If Tab 1: <DepotSection> (styles.panel)
    │   ├── Header: "SWMO Depot" + description
    │   └── Body (styles.panelBody):
    │       ├── Map View (<LocationPickerMap>)
    │       └── Meta Info (Name, Coordinates, Edit/Save actions)
    └── If Tab 2: <CrewSection> (styles.panel)
        ├── Header: "Field Crew Configuration" + "+ Add crew" button
        └── Body (styles.panelBody, scrollable):
            ├── Optional New Crew Drawer
            └── List of Crew Cards (<FleetCapabilities>, shifts, max tasks)
```

---

## 3. Viewport & Overflow Management

| Container | Height / Overflow Rule | Purpose |
|---|---|---|
| `.page` | `height: 100%; overflow: hidden;` | Prevents outer container scroll on `#workspace-content` |
| `.tabContent` | `flex: 1; min-height: 0; overflow: hidden;` | Flex container allocating remaining vertical space |
| `.panel` | `flex: 1; min-height: 0; overflow: hidden; border-radius: 16px;` | Styled card container for active tab content |
| `.panelBody` | `flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;` | Independent scroll container for long crew lists |
| `.mapWrapper` | `flex: 1; min-height: 280px; height: 100%;` | Fills available height cleanly without overflowing |
