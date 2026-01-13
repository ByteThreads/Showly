# Showly Features

Complete list of all implemented features in Showly - The Calendly for Real Estate Showings.

## Core Functionality

### 🏠 Property Management
- Create property listings with photos, details, and pricing
- Auto-generated unique booking slugs (`/s/[slug]`)
- Property status management (active, pending, sold, inactive)
- Property photo carousel with multiple images
- Automatic timezone detection based on state
- Property details: beds, baths, sqft, price, MLS number, description
- Copy booking link with one click
- Enable/disable booking per property

### 📅 Booking System
- **Public booking pages** at `/s/[slug]` (no login required for clients)
- Visual-first design inspired by Airbnb
- Property photo carousel
- Calendar picker with 7-day grid
- Available time slots displayed in 4-column grid
- Two-step booking form (Select Time → Your Info)
- Pre-approval checkbox
- Notes field for special requests
- SMS opt-in (TCPA compliant with timestamp)
- Email reminder opt-in
- Booking confirmation emails (sent to client + agent)
- Social proof: "X showings scheduled this week"
- Staggered fade-in animations on page load
- Responsive mobile-first design

### 📆 Calendar Views
**Three view modes:**

#### Month View
- Traditional calendar grid (7 columns x weeks)
- Color-coded showing status
- Click date to jump to day view
- Showing count per day
- Smooth month transitions with slide animations

#### Week View
- 7-day column layout with time grid
- Working hours range (8 AM - 5 PM by default)
- Responsive showing cards that adapt to duration:
  - Compact: Time only (< 31 minutes)
  - Medium: Time + address (31-65 minutes)
  - Full: Time + address + client (65+ minutes)
- Handles overlapping showings (Google Calendar style)
- Color-coded by status
- Truncated text to prevent overflow

#### Day View
- Single day timeline
- Larger showing cards with more detail
- Responsive cards based on duration:
  - Compact: One line with bullets (< 80px height)
  - Medium: Two lines (80-120px height)
  - Full: Multi-line with icons (120px+ height)
- Icons: Clock, MapPin, User
- Status badges
- Click showing to view full details modal

### 🎯 Dashboard Overview
**Stats Cards:**
- Active Properties count
- Upcoming Showings (scheduled + confirmed)
- This Month showings count
- Personalized greeting based on time of day

**Today you have X showings booked:**
- Shows count of `scheduled` status only (pending confirmations)
- Action-oriented metric

**Today's & Tomorrow's Schedule:**
- Side-by-side view on desktop, stacked on mobile
- Color-coded: Blue for Today, Emerald for Tomorrow
- Date labels with day name
- Count badges
- Empty states with calendar icon
- Timeline with time, client, property, status
- Truncated text for long addresses/names

**Pending Confirmations:**
- List of showings awaiting agent confirmation
- One-click "Confirm" and "View" buttons
- Shows client name, property, date/time
- Carousel navigation for multiple confirmations

**Quick Actions:**
- Add New Property button
- View All Showings button

## Agent Features

### 👤 Authentication
- Email/password sign up and login
- Google OAuth sign-in
- Apple OAuth sign-in
- Account linking support
- Password reset via email
- Protected routes (dashboard requires authentication)
- Stale auth data cleanup on app version change

### ⚙️ Settings
**Working Hours:**
- Customize availability for each day of the week
- Set start and end times per day
- Enable/disable specific days
- Default: Mon-Fri 9AM-5PM

**Showing Duration:**
- Quick select: 15, 30, 45, 60 minutes
- Custom duration input (5-180 minutes)
- Global setting applies to all properties
- Default: 60 minutes

**Buffer Time:**
- Quick select: No buffer, 15, 30 minutes
- Custom buffer input (0-180 minutes)
- Global setting applies to all properties
- Default: 30 minutes
- Prevents back-to-back bookings

**Booking Window:**
- How many days ahead clients can book
- Prevents last-minute bookings
- Default: 14 days

**Email Branding:**
- Custom brand logo URL
- Primary color (headers/buttons)
- Accent color (links/highlights)
- Custom footer text
- Applies to all notification emails

### 📊 Showing Management
**Statuses:**
- `scheduled` - Client booked, awaiting agent confirmation
- `confirmed` - Agent approved, definitely happening
- `completed` - Showing finished
- `cancelled` - Showing cancelled
- `no-show` - Client didn't attend

**Actions:**
- Confirm showing (changes status to confirmed)
- Cancel showing
- Reschedule showing with time slot picker
- Mark as completed
- Mark as no-show

**Details Modal:**
- Client information (name, email, phone)
- Property details
- Date and time
- Duration
- Notes from client
- Pre-approval status
- SMS consent status
- Status badge
- **Add to Google Calendar** button

### 📧 Email Notifications
**Booking Confirmation:**
- Sent to client and agent when booking created
- Includes property details, date/time, agent contact
- Custom branding support

**Status Change Notifications:**
- **Confirmed**: Sent when agent confirms showing
- **Cancelled**: Sent when showing is cancelled
- **Rescheduled**: Shows old time (crossed out) and new time
- **Completed**: Thank you message after showing

**Email Features:**
- HTML templates with inline CSS
- Responsive design
- Custom branding (logo, colors, footer)
- Reply-to set to agent's email
- Powered by Resend API

### 🗓️ Google Calendar Integration
- "Add to Google Calendar" button in showing details modal
- Pre-fills event with:
  - Title: "Property Showing - [Address]"
  - Location: Full formatted property address
  - Date/Time: Showing scheduled time
  - Duration: Agent's default showing duration
  - Description: Client details, property info, agent contact
- Opens in new tab
- Handles Firestore Timestamp conversion
- Fallback duration for legacy showings

## Technical Features

### 🏗️ Architecture
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Email**: Resend API
- **Analytics**: PostHog
- **Deployment**: Vercel

### 🎨 Design System
**Centralized Constants:**
- All UI strings in `lib/constants/strings.ts`
- All styles in `lib/constants/styles.ts`
- Helper function `cn()` for conditional classes
- Consistent color palette throughout

**Color Scheme:**
- Primary Blue: `#2563EB` (trust, professionalism)
- Success Emerald: `#10B981` (action, confirmation)
- Accent Amber: `#F59E0B` (urgency, highlights)
- Status colors: Blue (scheduled), Emerald (confirmed), Red (cancelled), Yellow (pending)

**Animations:**
- Staggered fade-in on page loads
- Smooth transitions (300-700ms)
- Hover effects (scale, shadow, translate)
- Carousel transitions
- Month slide animations
- No animation stacking

### 🔒 Security
- Protected routes with ProtectedRoute component
- Authentication required for dashboard
- Firestore security rules (defined in DATABASE_SCHEMA.md)
- Public read access only for properties (booking pages)
- TCPA compliance for SMS consent (timestamp tracking)
- Environment variables for secrets

### 📱 Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Sticky sidebar on desktop
- Collapsible mobile menu
- Touch-friendly tap targets (48px minimum)
- Optimized image loading
- Full-width cards on mobile
- Side-by-side layouts on desktop

### ⚡ Performance
- Real-time Firestore listeners for live updates
- Memoized time slot calculations
- Debounced search inputs
- Lazy loading for images
- Client-side routing (SPA feel)
- GPU-accelerated animations (CSS transforms)
- Optimized bundle size

### 🧪 Data Management
**Time Slots Generation:**
- Calculates available slots based on:
  - Agent's working hours
  - Existing showings (scheduled + confirmed)
  - Showing duration setting
  - Buffer time setting
  - Booking window (how far ahead)
- Groups slots by date
- Filters out past times
- Handles timezone conversion

**Showing Duration Logic:**
- **Global setting** from `agent.settings.defaultShowingDuration`
- Copied to showing document at creation time
- Legacy properties with old duration fields ignored
- Fallback to 30 minutes for legacy showings

**Status Tracking:**
- Automatic status badges with color coding
- Status change triggers email notifications
- Reschedule history tracked (`rescheduledFrom` field)
- Trial showing counter for agents

## User Experience

### 🎯 Agent Workflow
1. Sign up / Login
2. Set working hours and preferences in Settings
3. Create property listings with photos
4. Copy booking link and share with clients
5. Clients book showings via public booking page
6. Agent receives email notification
7. Agent confirms showing from dashboard
8. Client receives confirmation email
9. Agent adds to Google Calendar
10. Showing appears in Today's/Tomorrow's schedule
11. Agent marks as completed after showing

### 👥 Client Experience
1. Receives booking link from agent
2. Views property photos and details
3. Sees agent info and contact
4. Selects date from calendar
5. Chooses available time slot
6. Fills in contact information
7. Optionally adds notes
8. Opts in to reminders (email/SMS)
9. Clicks "Book Showing"
10. Receives confirmation email
11. Optionally downloads .ics file for personal calendar

## Future Enhancements

### Planned Features
- SMS reminders (24h and 1h before showing)
- Email reminders automation
- Google Calendar OAuth auto-sync
- .ics file download option
- Client-initiated rescheduling (requires agent approval)
- Stripe payment integration for subscriptions
- Multi-agent team support
- Property templates
- Showing feedback collection
- Analytics dashboard

### Integration Roadmap
- Twilio for SMS (TCPA compliant)
- Google Calendar API for bidirectional sync
- Stripe for subscription billing
- Zapier webhooks
- MLS data imports
- CRM integrations

## Metrics & Analytics

### Dashboard Metrics
- Active properties count
- Upcoming showings (scheduled + confirmed)
- This month showings
- Pending confirmations count
- Weekly activity chart (future)

### PostHog Events Tracked
- User sign up (by method: email, Google, Apple)
- Dashboard section viewed
- Property created
- Showing booked
- Showing confirmed
- Add to calendar clicked
- And more...

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Deployment
- **Production**: Vercel (auto-deployment from `main` branch)
- **Environment**: Node.js 18+
- **Build**: `npm run build`
- **Dev**: `npm run dev` (localhost:3000)
