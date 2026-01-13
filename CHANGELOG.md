# Changelog

All notable changes to Showly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added - January 14, 2026

#### Google Calendar Integration
- **Add to Google Calendar** button in showing details modal
- Generates Google Calendar event URL with pre-filled showing details
- Includes property address, client info, and showing duration
- Opens in new tab for quick calendar addition
- Supports agent's custom showing duration from settings

#### Tomorrow's Schedule Dashboard Widget
- Side-by-side "Today" and "Tomorrow" schedule views on dashboard
- Color-coded: Blue theme for Today, Emerald theme for Tomorrow
- Shows date labels (e.g., "Wed, Jan 14")
- Count badges showing number of showings
- Empty state with calendar icon when no showings
- Responsive: Side-by-side on desktop, stacked on mobile
- Timeline view with time, client name, property address, and status

#### Duration Management System
- **Global duration settings**: Removed property-level duration in favor of agent-level settings
- All properties now use `agent.settings.defaultShowingDuration` dynamically
- Changed showing duration to 60 minutes globally (configurable in Settings)
- Buffer time to 30 minutes (configurable in Settings)
- Duration field automatically added to all new showings created via booking page
- Legacy properties with old duration fields gracefully handled (marked as optional)

#### Dashboard Metrics Refinement
- **"Today you have X showings booked"**: Now counts only `scheduled` status (pending confirmations)
- **"Upcoming Showings"**: Counts `scheduled` + `confirmed` statuses (all future showings)
- **"This Month"**: Counts `scheduled` + `confirmed` statuses from current month
- Clear distinction between action items vs. full schedule view

#### Calendar View Improvements - Day View
- **Responsive showing cards** that adapt to duration height:
  - Compact (< 80px): Single line with all info separated by bullets
  - Medium (80-120px): Two lines (time + address, client name)
  - Full (>= 120px): Multi-line with icons (Clock, MapPin, User)
- All text properly truncates with ellipsis to prevent overflow
- Added `overflow-hidden` to all card containers

#### Calendar View Improvements - Week View
- **Responsive showing cards** that adapt to duration height:
  - Compact (< 50px / < 31 min): Time only
  - Medium (50-70px / 31-65 min): Time + property address
  - Full (>= 70px / 65+ min): Time + address + client name
- Fixed text overflow issue where client names appeared outside colored boxes
- All text truncates properly with ellipsis
- Removed hover scale effect to prevent overflow on interaction

### Changed

#### Type System Updates
- `Property.showingDuration` and `Property.bufferTime` changed from required to optional
- Added comments noting these are legacy fields no longer used
- Backward compatible with existing properties in database

#### Booking Page Updates
- Time slot generation now uses `agent.settings.defaultShowingDuration`
- Time slot generation now uses `agent.settings.bufferTime`
- Calendar event (.ics) generation uses agent's duration setting
- Removed hardcoded property-level duration references

#### Property Creation Updates
- New properties no longer store `showingDuration` or `bufferTime` fields
- Removed hardcoded values (was 30 min duration, 15 min buffer)
- Added comment explaining settings come from agent profile

### Fixed

#### Google Calendar Integration Fixes
- Fixed "Invalid Date" error caused by missing `duration` field in showings
- Fixed date conversion from Firestore Timestamp to JavaScript Date
- Fixed address object being passed as `[object Object]` in calendar event
  - Now correctly uses `property.address.formatted` string
- Added fallback duration (30 minutes) for legacy showings without duration field
- Fixed end time calculation for calendar events

#### Calendar Display Fixes
- Fixed text overflow in day view showing cards
- Fixed text overflow in week view showing cards
- Fixed client names appearing outside colored boxes in week view
- Added proper text truncation throughout all calendar views
- Improved responsive layouts for different showing durations

### Technical Details

#### Files Modified
- `/types/database.ts` - Updated Property interface
- `/app/dashboard/properties/new/page.tsx` - Removed hardcoded duration fields
- `/app/s/[slug]/page.tsx` - Updated to use agent settings for duration
- `/app/dashboard/calendar/page.tsx` - Multiple improvements:
  - Google Calendar URL generation
  - Day view responsive cards
  - Week view responsive cards
  - Tomorrow's schedule component
- `/app/dashboard/page.tsx` - Dashboard metrics and Tomorrow's schedule
- `/lib/auth-context.tsx` - Agent settings management

#### Database Schema Notes
- Legacy `showingDuration` and `bufferTime` fields on properties are now ignored
- All time calculations use `agent.settings.defaultShowingDuration`
- All buffer calculations use `agent.settings.bufferTime`
- New showings include `duration` field copied from agent settings at creation time

---

## Version History

### Phase 8 - Calendar & Schedule Management (January 2026)
- Google Calendar integration
- Tomorrow's schedule view
- Global duration management
- Responsive calendar improvements
- Dashboard metrics refinement

### Phase 7 - Showing Management (Completed)
- Reschedule functionality
- Status change notifications
- Showing history tracking

### Phase 6 - Agent Settings (Completed)
- Working hours customization
- Duration and buffer time settings
- Booking window configuration
- Email branding customization

### Phase 0-5 - Foundation (Completed)
- Authentication system
- Property management
- Booking page
- Dashboard overview
- Email notifications
- Calendar views (month/week/day)
