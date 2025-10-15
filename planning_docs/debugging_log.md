# Debugging Log: Rec Room & State Persistence Issues

This document tracks the investigation into UI state management on the Room Configuration page.

## 1. Initial Problem: "Rec Room" Not Displaying

- The auto-configuration logic correctly suggested a "Rec Room" for larger properties, but it was not visible on the page.

## 2. Investigation & Fix for Initial Problem

- **Discovery**: We traced the issue to the data-loading layer. The Firestore query for `roomTemplates` used an `orderBy('sortOrder')` clause. This caused the query to return zero results because at least one document in the collection was missing the `sortOrder` field.
- **Fix**: The `orderBy` clause was removed from the query in `client/src/hooks/useRoomTemplates.ts`. This allowed all room templates to be loaded correctly, making the "Rec Room" (and all other rooms) appear on the page.

## 3. Regression: Manual Selections Lost on Navigation

After fixing the data loading, a new state management issue appeared.

- **Problem**: When a user manually unchecks a room, navigates to the Results page, and then returns to the Room Configuration page, their manual changes are lost. The component reverts to the original auto-generated suggestions.

- **Root Cause**: The component's `useEffect` hook was re-applying the auto-generated suggestions every time the page was loaded, even if the input parameters (square footage and guest count) hadn't changed. This incorrectly overwrote the user's manual selections stored in the global state.

- **Attempted Solution (Unsuccessful)**: I attempted to fix this by introducing a `useRef` to store the last-applied configuration. The goal was to prevent the suggestions from being re-applied if the configuration object hadn't changed. This did not work. The likely reason is that `computedConfiguration` is a new object on each render cycle, so a simple reference or string comparison isn't sufficient to detect that the underlying *data* is the same, causing the logic to still overwrite the user's state.

## 4. Current Status

- The original bug preventing the "Rec Room" from appearing has been **resolved**.
- A new **regression bug** has been introduced: the `RoomConfigurationPage` does not correctly preserve the user's manual room selections when they navigate away from and back to the page. The state is being overwritten by the initial suggestions.
- The immediate next step is to correctly handle this state persistence logic so that manual changes are not lost.
