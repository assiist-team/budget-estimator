### Room Preselection System — Specification

#### 1) Objectives
- **Map** square footage and max guests to a full room configuration (bedrooms + common areas).
- **Centralize** mapping parameters in an admin-controlled ruleset (versioned, editable).
- **Enforce** reasonable sqft/guest combinations in the UI sliders; disallow impossible pairs.
- **Support** manual edits at range level and per-property overrides.

---

### 2) Scope and Definitions
- **Range**: A rule bucket `[min_sqft..max_sqft] × [min_guests..max_guests]`.
- **Bedroom mix**: Counts of bedroom types (`king`, `double`) and optional `bunk` size.
 - **Common areas**: Kitchen and Living are universal; Dining and Rec Room have presence rules; all have size mapping.
- **Admin ruleset**: Authoritative configuration used by the estimator and by UI bounds.

Non-goals (MVP): bathrooms, laundry, outdoor areas, multi-bunk policies beyond 1 bunk per rule.

---

### 3) Data Model (Admin Ruleset)

Stored as a single versioned document. Suggest Firestore path: `config/roomMappingRules`.

```ts
export type BunkSize = "small" | "medium" | "large";
export type CommonSize = "none" | "small" | "medium" | "large";

export interface BedroomMixRule {
  id: string;
  min_sqft: number;
  max_sqft: number;
  min_guests: number;
  max_guests: number;
  bedrooms: {
    king: number;
    double: number;
    bunk: BunkSize | null;
  };
  // Optional manual override for this range (wins over computed common-areas)
  overrides?: Partial<ComputedConfiguration>;
}

export interface BunkCapacities {
  small: number;   // default 4
  medium: number;  // default 8
  large: number;   // default 12
}

export interface SpacePresenceRule {
  // Present if any provided condition evaluates true
  present_if_sqft_gte?: number;
  present_if_guests_gte?: number;
}

export interface SpaceSizeRule {
  thresholds: Array<{
    min_sqft?: number;
    max_sqft?: number;
    min_guests?: number;
    max_guests?: number;
    size: CommonSize;
  }>;
  default: CommonSize; // typically "none" for optional spaces
}

export interface CommonAreaRules {
  kitchen: { size: SpaceSizeRule }; // universal
  dining: { presence: SpacePresenceRule; size: SpaceSizeRule };
  living: { size: SpaceSizeRule }; // universal
  recRoom: { presence: SpacePresenceRule; size: SpaceSizeRule };
}

export interface ValidationEnvelopes {
  legalPairs: Array<{
    min_sqft: number;
    max_sqft: number;
    min_guests: number;
    max_guests: number;
  }>;
  global: {
    min_sqft: number;
    max_sqft: number;
    min_guests: number;
    max_guests: number;
  };
}

export interface AutoConfigRules {
  version: number;
  publishedAt: string;
  description?: string;

  bunkCapacities: BunkCapacities;
  bedroomMixRules: BedroomMixRule[];
  commonAreas: CommonAreaRules;
  validation: ValidationEnvelopes;
}

export interface ComputedConfiguration {
  bedrooms: {
    king: number;
    double: number;
    bunk: BunkSize | null;
  };
  commonAreas: {
    kitchen: CommonSize;
    dining: CommonSize;
    living: CommonSize;
    recRoom: CommonSize;
  };
}
```

Seed values (preserves your bedroom ranges; adds common-areas and validation):

```json
{
  "version": 1,
  "publishedAt": "2025-10-14T00:00:00.000Z",
  "description": "Initial ruleset for auto-configuration",
  "bunkCapacities": { "small": 4, "medium": 8, "large": 12 },
  "bedroomMixRules": [
    { "id": "r1", "min_sqft": 1800, "max_sqft": 2200, "min_guests": 8,  "max_guests": 8,  "bedrooms": { "king": 3, "double": 0, "bunk": null } },
    { "id": "r2", "min_sqft": 1800, "max_sqft": 2200, "min_guests": 9,  "max_guests": 10, "bedrooms": { "king": 2, "double": 2, "bunk": null } },
    { "id": "r3", "min_sqft": 2200, "max_sqft": 2600, "min_guests": 11, "max_guests": 12, "bedrooms": { "king": 2, "double": 2, "bunk": "small" } },
    { "id": "r4", "min_sqft": 2600, "max_sqft": 3000, "min_guests": 13, "max_guests": 14, "bedrooms": { "king": 1, "double": 3, "bunk": "medium" } },
    { "id": "r5", "min_sqft": 3000, "max_sqft": 3400, "min_guests": 15, "max_guests": 16, "bedrooms": { "king": 1, "double": 4, "bunk": "medium" } },
    { "id": "r6", "min_sqft": 3400, "max_sqft": 3800, "min_guests": 17, "max_guests": 18, "bedrooms": { "king": 1, "double": 4, "bunk": "large" } },
    { "id": "r7", "min_sqft": 3800, "max_sqft": 4500, "min_guests": 19, "max_guests": 20, "bedrooms": { "king": 1, "double": 5, "bunk": "large" } }
  ],
  "commonAreas": {
    "kitchen": {
      "size": {
        "thresholds": [
          { "max_sqft": 2000, "size": "small" },
          { "min_sqft": 2001, "max_sqft": 3200, "size": "medium" },
          { "min_sqft": 3201, "size": "large" }
        ],
        "default": "small"
      }
    },
    "dining": {
      "presence": { "present_if_sqft_gte": 1600 },
      "size": {
        "thresholds": [
          { "max_sqft": 2000, "size": "small" },
          { "min_sqft": 2001, "max_sqft": 3200, "size": "medium" },
          { "min_sqft": 3201, "size": "large" }
        ],
        "default": "none"
      }
    },
    "living": {
      "size": {
        "thresholds": [
          { "max_sqft": 2000, "size": "small" },
          { "min_sqft": 2001, "max_sqft": 3200, "size": "medium" },
          { "min_sqft": 3201, "size": "large" }
        ],
        "default": "small"
      }
    },
    "recRoom": {
      "presence": { "present_if_sqft_gte": 2600 },
      "size": {
        "thresholds": [
          { "min_sqft": 2600, "max_sqft": 3200, "size": "small" },
          { "min_sqft": 3201, "max_sqft": 3800, "size": "medium" },
          { "min_sqft": 3801, "size": "large" }
        ],
        "default": "none"
      }
    }
  },
  "validation": {
    "global": { "min_sqft": 1000, "max_sqft": 6000, "min_guests": 2, "max_guests": 24 },
    "legalPairs": [
      { "min_sqft": 1600, "max_sqft": 2200, "min_guests": 6,  "max_guests": 10 },
      { "min_sqft": 2200, "max_sqft": 2800, "min_guests": 10, "max_guests": 12 },
      { "min_sqft": 2800, "max_sqft": 3600, "min_guests": 12, "max_guests": 16 },
      { "min_sqft": 3600, "max_sqft": 4500, "min_guests": 16, "max_guests": 20 }
    ]
  }
}
```

Assumptions around bedrooms by sq ft (reference):

```text
< 1,600 sqft  -> typically 3 bedrooms
1,600–2,200   -> 4 bedrooms
2,200–2,800   -> 5 bedrooms
2,800–3,600   -> 6 bedrooms
3,600+        -> 7 bedrooms
```

---

### 4) Algorithms

#### Bedroom Selection (refined)
- Input: `squareFootage`, `guestCount`, `rules: AutoConfigRules`.
- Steps:
  1) Filter `bedroomMixRules` on sqft match; if none, choose closest by sqft range center.
  2) Within matches, pick exact guest-range; else the rule with minimal boundary distance to `guestCount`.
  3) Capacity validation: `king=2`, `double=2`, `bunk=bunkCapacities[size]` (if present). Flag rule if capacity < `max_guests`.
  4) Apply `overrides` for the matched rule if provided.
- Policy: Start comfortable (kings), use doubles for density, at most one bunk by default.

#### Common Area Derivation
- Presence: Dining and Rec Room use OR semantics (sqft OR guests); Kitchen and Living are always present.
- Size: First matching ordered threshold wins; else `default`.

#### Slider Validation (UI)
- Use `validation.legalPairs` rectangles to derive permitted guests for the current sqft:
  - Union intersecting rectangles → overall `[minGuestsAllowed..maxGuestsAllowed]`.
  - Clamp the guest slider, show reason if out-of-range (e.g., “20 guests requires ≥ 3600 sqft”).
- Apply `validation.global` hard bounds in all cases.

---

### 5) Admin UI and Workflows

Location: extend `client/src/pages/AdminPage.tsx` with a new section "Size & Capacity Rules" (tabs).

- **Bedrooms**
  - Edit bunk capacities (small/medium/large).
  - CRUD range rules with visual timeline bars (sqft and guests). Overlap detection on save.
  - Display computed capacity vs `max_guests`; warn if insufficient.

- **Common Areas**
  - Presence rule editor for Dining and Rec Room (sqft/guests thresholds). Kitchen and Living are always present.
  - Ordered size thresholds editor (drag to reorder).

- **Slider Ranges**
  - Global min/max for sqft/guests.
  - Legal pair rectangles editor with a live tester: “Is (sqft, guests) valid?”

- **Versioning**
  - Draft vs Published; change log; revert to prior version.
  - Import/Export JSON with schema validation.

- **Manual Overrides**
  - Range-level overrides for common areas.
  - Per-property adjustments after auto-compute (saved to the project instance only).

---

### 6) Integration Touchpoints

- **Storage**
  - Primary: Firestore `config/roomMappingRules` (published version).
  - Fallback: `client/public/autoconfig.json` (cache for fast boot/offline).

- **Client Additions**
  - `client/src/types/config.ts`: Types in Section 3.
  - `client/src/store/configStore.ts`: Load, cache, publish/draft handling.
  - `client/src/hooks/useAutoConfiguration.ts`: Compute bedroom/common areas; helpers for slider clamping.
  - `client/src/components/admin/AutoConfigEditor/*`: Editors for bedrooms, common areas, validation.

- **Existing Pages**
  - `PropertyInputPage.tsx`: Clamp sliders via `validation.legalPairs`; help text for out-of-range.
  - `ResultsPage.tsx`: Display computed configuration.
  - `AdminPage.tsx`: New "Size & Capacity Rules" section.

- **Pricing Integration**
  - `client/src/utils/calculations.ts`: Accept `ComputedConfiguration` to derive item counts via `roomTemplates.json`.
  - Prefer template keys by `(roomType, size)`.

---

### 7) Pseudocode (client-side)

```ts
function getBedroomRule(squareFootage: number, guestCount: number, rules: AutoConfigRules) {
  const sqftMatches = rules.bedroomMixRules.filter(r => squareFootage >= r.min_sqft && squareFootage <= r.max_sqft);
  if (sqftMatches.length === 0) return null;

  const exact = sqftMatches.find(r => guestCount >= r.min_guests && guestCount <= r.max_guests);
  if (exact) return exact;

  return sqftMatches.reduce((prev, curr) => {
    const prevDist = Math.min(Math.abs(prev.min_guests - guestCount), Math.abs(prev.max_guests - guestCount));
    const currDist = Math.min(Math.abs(curr.min_guests - guestCount), Math.abs(curr.max_guests - guestCount));
    return currDist < prevDist ? curr : prev;
  });
}

function deriveCommonAreas(squareFootage: number, guestCount: number, rules: AutoConfigRules) {
  const compute = (presence: SpacePresenceRule, size: SpaceSizeRule): CommonSize => {
    const present =
      (presence.present_if_sqft_gte !== undefined && squareFootage >= presence.present_if_sqft_gte) ||
      (presence.present_if_guests_gte !== undefined && guestCount >= presence.present_if_guests_gte);
    if (!present) return size.default;

    for (const th of size.thresholds) {
      const sqftOk = (th.min_sqft === undefined || squareFootage >= th.min_sqft) &&
                     (th.max_sqft === undefined || squareFootage <= th.max_sqft);
      const guestOk = (th.min_guests === undefined || guestCount >= th.min_guests) &&
                      (th.max_guests === undefined || guestCount <= th.max_guests);
      if (sqftOk && guestOk) return th.size;
    }
    return size.default;
  };

  const kitchenSize = compute(rules.commonAreas.kitchen.presence, rules.commonAreas.kitchen.size);
  const diningSize = compute(rules.commonAreas.dining.presence, rules.commonAreas.dining.size);
  const livingSize = compute(rules.commonAreas.living.presence, rules.commonAreas.living.size);
  const recRoomSize = compute(rules.commonAreas.recRoom.presence, rules.commonAreas.recRoom.size);

  return {
    kitchen: kitchenSize,
    dining: diningSize,
    living: livingSize,
    recRoom: recRoomSize
  };
}

function clampGuestsForSqft(squareFootage: number, desired: number, rules: AutoConfigRules) {
  const rects = rules.validation.legalPairs.filter(r => squareFootage >= r.min_sqft && squareFootage <= r.max_sqft);
  if (rects.length === 0) return Math.min(Math.max(desired, rules.validation.global.min_guests), rules.validation.global.max_guests);
  const min = Math.min(...rects.map(r => r.min_guests));
  const max = Math.max(...rects.map(r => r.max_guests));
  return Math.min(Math.max(desired, min), max);
}
```

---

### 8) Acceptance Scenarios
- 2,800 sqft, 14 guests → Bedrooms `{ king: 1, double: 3, bunk: "medium" }`; common areas typically kitchen=medium, dining=medium/large, living=medium, recRoom=small/medium; guests slider clamped to allowed window (e.g., 12–16).
- 1,500 sqft, 20 guests → Disallowed by envelope; clamp guests to max allowed for 1,500 sqft (e.g., 8–10) with helper text.
- 3,600 sqft, 18 guests → Bedrooms `{ king: 1, double: 4, bunk: "large" }`; common areas generally large; rule capacity must cover 18.

---

### 9) Risks and Policies
- Overlapping ranges create ambiguity → editor prevents or enforces deterministic tie-break.
- Ensure each bedroom rule’s capacity ≥ `max_guests`; show warnings in admin before publish.
- Bunk policy: default to at most one bunk per rule; can extend later (add `maxBunks`).

---

### 10) Rollout
- **MVP**: Types, rules loader, bedroom/common computation, slider clamping, seed rules stored and consumed on client.
- **V2**: Admin editor (draft/publish, overlap detection), previews, version history, import/export.

---

### 11) Notes and Feedback Hooks
- We can add bathrooms and outdoor areas with the same presence/size threshold model.
- If you want to densify >20 guests, extend policy to multiple bunks and/or add `queen` rooms.


