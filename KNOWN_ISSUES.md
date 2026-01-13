# Known Issues

This document tracks known bugs, limitations, and technical debt in Showly.

**Last Updated:** January 14, 2026

## Active Issues

### High Priority

None currently identified.

### Medium Priority

None currently identified.

### Low Priority

None currently identified.

## Limitations & Technical Debt

### 1. Legacy Duration Fields

**Impact:** Low
**Status:** Handled

- Old properties in the database may still have `showingDuration` and `bufferTime` fields
- These fields are now ignored in favor of global agent settings
- No action required - system handles gracefully with fallbacks
- Fields marked as optional in TypeScript types

**Resolution:** No migration needed. Legacy fields are ignored. New properties don't include these fields.

---

### 2. Time Zone Handling

**Impact:** Low
**Status:** Working as designed

- Property timezone is auto-detected from state during creation
- No manual timezone override for agents in different locations than property
- Edge case: Agent in one timezone managing property in another may see times differently

**Potential Future Enhancement:** Add manual timezone override in property settings.

---

### 3. Booking Window Edge Cases

**Impact:** Low
**Status:** Acceptable

- Booking window setting (`bookingWindow`) prevents bookings beyond X days
- If agent changes this setting, existing showings beyond the new limit remain valid
- Time slots are recalculated dynamically, so future bookings respect new limit

**Behavior:** Existing bookings are preserved, new bookings follow current settings.

---

### 4. Email Branding Defaults

**Impact:** Low
**Status:** Acceptable

- If agent doesn't configure email branding (logo, colors, footer), emails use defaults
- Default logo: Showly branding
- Default colors: Blue (#2563EB) and Emerald (#10B981)
- Default footer: Generic Showly footer

**Resolution:** Working as intended. Agents can customize in Settings page.

---

### 5. Calendar View Performance with Many Showings

**Impact:** Low
**Status:** Monitor

- Week/Day views calculate positioning for all visible showings
- With 50+ showings in a single day, rendering may slow slightly
- Current implementation is acceptable for typical agent workload (5-15 showings/day)

**Potential Future Enhancement:** Virtualized calendar rendering if needed.

---

## Resolved Issues

### ✅ Google Calendar Invalid Date Error (Fixed: January 14, 2026)

**Problem:** "Invalid Date" error when clicking "Add to Google Calendar"
**Cause:** Missing `duration` field in showing documents created before Phase 8
**Fix:** Added fallback duration (30 minutes) for legacy showings in calendar URL generation
**Code:** `/app/dashboard/calendar/page.tsx:404-409`

---

### ✅ Week View Text Overflow (Fixed: January 14, 2026)

**Problem:** Client names appearing outside colored boxes for 30-minute showings
**Cause:** Insufficient height constraints and no text truncation
**Fix:** Implemented responsive layouts with `overflow-hidden` and `truncate` classes
**Code:** `/app/dashboard/calendar/page.tsx:758-807`

---

### ✅ Duration Settings Conflict (Fixed: January 14, 2026)

**Problem:** Property-level duration (45 min) conflicting with agent setting (60 min)
**Cause:** Duplicate duration fields at both property and agent levels
**Fix:** Made duration a global agent setting only; removed property-level fields
**Code:** `/types/database.ts`, `/app/dashboard/properties/new/page.tsx`, `/app/s/[slug]/page.tsx`

---

### ✅ Dashboard Metrics Ambiguity (Fixed: January 14, 2026)

**Problem:** Unclear what "showings booked" should count
**Cause:** Inconsistent status filtering across different metrics
**Fix:** Clear distinction - "Today" counts `scheduled` only, "Upcoming" counts `scheduled` + `confirmed`
**Code:** `/app/dashboard/page.tsx:86-115`

---

## Browser-Specific Issues

None currently identified.

## Mobile-Specific Issues

None currently identified.

## Reporting New Issues

When reporting a new issue, please include:

1. **Title:** Brief description (e.g., "Time slots not loading on Safari")
2. **Priority:** High / Medium / Low
3. **Impact:** Who is affected and how severely
4. **Steps to Reproduce:** Detailed steps to trigger the issue
5. **Expected Behavior:** What should happen
6. **Actual Behavior:** What actually happens
7. **Environment:** Browser, device, OS version
8. **Screenshots:** If applicable

## Issue Priority Definitions

- **High:** Blocks core functionality, affects all users, requires immediate fix
- **Medium:** Affects some users or specific workflows, workaround available
- **Low:** Minor inconvenience, cosmetic issue, or edge case

---

## Future Enhancements (Not Issues)

These are planned features, not bugs:

- SMS reminders (24h and 1h before showing)
- Email reminders automation
- Google Calendar OAuth auto-sync (bidirectional)
- .ics file download option for clients
- Client-initiated rescheduling with agent approval
- Stripe payment integration for subscriptions
- Multi-agent team support
- Property templates
- Showing feedback collection
- Analytics dashboard

See **FEATURES.md** for complete future enhancement roadmap.
