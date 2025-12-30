# Showly

**The Calendly for Real Estate Showings**

Schedule property showings without the back-and-forth. No app downloads required.

---

## 🎯 What is Showly?

Showly is a showing scheduler built specifically for real estate agents. Unlike ShowingTime which requires clients to download an app, Showly works with simple shareable links - just like Calendly.

**Key Features:**
- ✅ Create showing links in 30 seconds
- ✅ Clients book instantly (no app download)
- ✅ Automatic SMS & email reminders
- ✅ Collect feedback after showings
- ✅ Google Calendar integration
- ✅ Mobile-first design

**Pricing:** $25/month per agent

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase account (free tier)

### Installation

1. **Clone & Install**
```bash
npm install
```

2. **Set up Firebase**
   - Follow instructions in [SETUP.md](./SETUP.md)
   - Create Firebase project
   - Get API keys

3. **Configure Environment**
```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials
```

4. **Run Development Server**
```bash
npm run dev
```

Visit http://localhost:3000

---

## 📁 Project Structure

```
showly/
├── app/                    # Next.js pages (App Router)
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Agent dashboard
│   ├── s/[slug]/          # Public booking pages
│   └── api/               # API routes
├── components/            # React components
├── lib/
│   └── firebase.ts        # Firebase config
├── types/
│   └── database.ts        # TypeScript types
├── DATABASE_SCHEMA.md     # Database design
└── SETUP.md              # Setup instructions
```

---

## 🗄️ Tech Stack

**Frontend:**
- Next.js 15 (React)
- TypeScript
- Tailwind CSS
- Vercel (hosting)

**Backend:**
- Firebase Firestore (database)
- Firebase Auth (authentication)
- Firebase Cloud Functions (background jobs)

**Integrations:**
- Twilio (SMS reminders)
- Resend (email)
- Stripe (payments)
- Google Calendar API

---

## 📊 Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

**Main Collections:**
- `agents` - Real estate agent profiles
- `properties` - Property listings
- `showings` - Showing appointments
- `feedback` - Post-showing feedback

---

## 🔐 Environment Variables

See `.env.local.example` for all required environment variables.

**Required for MVP:**
- Firebase credentials (6 keys)
- Twilio (for SMS)
- Resend (for email)

**Optional:**
- Stripe (for payments - add later)
- Google Calendar (for sync - add later)

---

## 🛠️ Development Roadmap

### Week 1: Foundation ✅
- [x] Project setup
- [x] Firebase configuration
- [x] Database schema design
- [x] TypeScript types

### Week 2: Core Features
- [ ] Agent authentication (login/signup)
- [ ] Agent dashboard layout
- [ ] Create property form
- [ ] Property list view

### Week 3: Booking Flow
- [ ] Public booking page (`/s/[slug]`)
- [ ] Display available time slots
- [ ] Book showing
- [ ] Send confirmation emails/SMS

### Week 4: Advanced Features
- [ ] Reminder system (Cloud Functions)
- [ ] Feedback forms
- [ ] Google Calendar sync
- [ ] Stripe billing integration

### Week 5: Launch Prep
- [ ] Landing page
- [ ] Beta testing with 10 agents
- [ ] Bug fixes
- [ ] Deploy to production

---

## 🎨 Design Philosophy

**Keep it simple.**

- Agents should be able to create a showing link in < 30 seconds
- Clients should book a showing in < 60 seconds
- Zero learning curve for either party

---

## 🧪 Testing

```bash
# Run tests (when we add them)
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

---

## 🚢 Deployment

**Automatic with Vercel:**

1. Push to GitHub
2. Connect repo to Vercel
3. Vercel auto-deploys on every push to `main`
4. Add environment variables in Vercel dashboard

**Manual:**
```bash
npm run build
npm start
```

---

## 📝 License

Private - All Rights Reserved

---

## 🤝 Contact

**Email:** hello@showly.io
**Website:** https://showly.io (coming soon)

---

## 💡 Why Showly?

**The Problem:**
- ShowingTime requires clients to download an app (most don't)
- Back-and-forth texts are time-consuming
- Full CRMs are overkill for solo agents

**The Solution:**
- Simple shareable links (like Calendly)
- No app downloads required
- Just $25/month (vs $200-500 for full CRMs)

---
