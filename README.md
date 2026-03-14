# 🎲 DiceBet — Prediction Markets

A full-stack **parimutuel prediction market** platform where users post YES/NO questions, bet on outcomes, and earn dynamic payouts based on crowd consensus.

## Features

- 🎯 **Post prediction questions** — Create YES/NO markets with expiry dates and categories
- 📊 **Dynamic parimutuel odds** — More money on YES = lower YES multiplier (just like horse racing)
- 💰 **Live odds preview** — See how *your specific bet* changes the odds before confirming
- 🏆 **Payouts on resolution** — Creator resolves the question and winners share the pool
- 👤 **Authentication** — JWT-based, sessioned via HTTP-only cookies
- 🪙 **Starting balance** — Every new user gets 1,000 coins
- 📈 **My Bets page** — Track all bets, win/loss stats, profit/loss
- ⚡ **Auto-refresh** — Markets update every 10-15 seconds

## How the Odds Work (Parimutuel)

1. Initially both YES and NO are at **2.00x** (50/50)
2. As more money flows to one side, that side's multiplier **decreases**
3. Example: If 80% of the pool is on YES → YES pays ~1.25x, NO pays ~4.75x
4. Formula: `multiplier = (totalPool / sideAmount) × 0.95` (5% house edge)
5. On resolution, winners split the **entire pool** proportionally to their bet size

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, CSS Custom Properties
- **Backend**: Next.js API Routes
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + HTTP-only cookies, bcrypt password hashing

---

## Setup

### Option A: MongoDB Atlas (Free Cloud — Recommended)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Get your connection string
4. Update `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dicebet
   ```

### Option B: Docker (Local)

```bash
docker-compose up -d
```
This starts MongoDB on port 27017. Your `.env.local` is already configured for this.

### Option C: Install MongoDB Community Server

Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

---

## Running the App

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Seed Demo Data (optional)

```bash
npm run seed
```

Creates test accounts and sample questions with bets:
- `alice@example.com` / `password123` (balance: 5000)
- `bob@example.com` / `password123` (balance: 2500)
- `charlie@example.com` / `password123` (balance: 1200)

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/         # login, register, logout, me
│   │   ├── questions/    # CRUD + [id]/bet
│   │   └── bets/mine     # user bet history
│   ├── questions/[id]/   # question detail page
│   ├── create/           # post new question
│   ├── my-bets/          # bet history
│   └── page.tsx          # homepage market list
├── components/
│   ├── Navbar.tsx
│   ├── AuthModal.tsx
│   ├── QuestionCard.tsx
│   ├── OddsBar.tsx
│   └── ToastProvider.tsx
├── models/
│   ├── User.ts
│   └── Question.ts       # includes parimutuel odds methods
├── lib/
│   ├── mongodb.ts        # connection singleton
│   └── auth.ts           # JWT utilities
└── context/
    └── AuthContext.tsx   # React auth state
```
