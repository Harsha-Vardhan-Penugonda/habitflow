# HabitFlow

A clean, beginner-friendly habit tracker built with **React**, **TypeScript**, **Vite**, **Tailwind CSS** and **Supabase** (Auth + PostgreSQL).

Each person who clones this repository connects it to **their own** free Supabase project. Nothing here depends on the original developer's account.

## Features

- **Accounts:** simple email + password sign-up and login (no confirmation email), persistent sessions and logout.
- **Guided setup:** first-time visitors are asked whether they are new. New users type their Supabase details into a form, and **Check & connect** validates them, connects to Supabase, creates the database tables (runs `schema.sql`) and saves `.env.local` for them.
- **Habits:** create, edit, archive/restore and delete habits with a name, description, category, color and optional daily goal.
- **Tracking:** tick habits off for today, click any past day in the history grid to add or remove a check-in, and undo mistakes.
- **Dashboard:** active habits, completed today, remaining, today's percentage, and a 7-day progress chart, all calculated from your real data.
- **Habit details:** current streak, best streak, total check-ins, 30-day success rate, a 14-week history grid and recent check-ins.
- **Security:** Row Level Security on every table, so users can only ever see and change their own data.
- **Friendly setup:** if your environment variables are missing or wrong, the app shows a setup screen instead of crashing.

---

## 1. Prerequisites

| Tool | Version | Check with |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 20 or newer (22 LTS recommended) | `node -v` |
| npm | comes with Node.js | `npm -v` |
| [Git](https://git-scm.com/) | any recent version | `git --version` |
| A [Supabase](https://supabase.com/) account | free plan is fine | |

## 2. Get the code

```bash
git clone https://github.com/Harsha-Vardhan-Penugonda/habitflow.git
cd habitflow
npm install
```

## 3. Create your Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Pick a name (for example `habitflow`), set a database password (save it somewhere safe) and choose a region near you.
3. Wait a minute or two for the project to finish setting up.

## 4. Connect HabitFlow to your project

You can let the app do this for you (recommended), or do it by hand.

### Option A: the setup form (recommended)

1. Start the app with `npm run dev` and open [http://localhost:5173](http://localhost:5173).
2. Choose **"Yes, I'm new"**. If no settings exist yet, the setup form opens automatically.
3. Fill in the form. You can find these values by clicking **Connect** at the top of your Supabase project:

   | Field | Where to find it |
   | --- | --- |
   | **Project URL** | Project Settings → Data API, e.g. `https://abcdefghijklmnop.supabase.co` |
   | **Publishable key** | Project Settings → API Keys (starts with `sb_publishable_`; older projects can use the **anon** key) |
   | **Database connection string** | Connect → **Session pooler**, pasted exactly as shown, including `[YOUR-PASSWORD]` |
   | **Database password** | The password you chose when creating the project |

4. Click **Check & connect**. HabitFlow then:
   1. checks that the values are in the right format,
   2. connects to Supabase to prove the URL and key are correct,
   3. checks that **Confirm email** is off (see step 6),
   4. checks the database tables and, if they are missing, runs [`supabase/schema.sql`](supabase/schema.sql) for you,
   5. saves the URL and key to `.env.local`.

   Each step shows ✓ or an explanation of what to fix. When everything passes, you'll see **"Your Supabase values are correct and HabitFlow is connected!"**. The dev server then restarts by itself and takes you to the sign-up page.

**How this works:** a web page can't write files on your computer, but the Vite dev server can. The form sends your values to a small helper that runs only inside `npm run dev` ([`dev/setupApi.ts`](dev/setupApi.ts)), and the helper does the checking, table creation and saving.

**About the database password:** creating tables needs more permission than the publishable key has, so it needs your database password. The password goes only to your own dev server, is used once to run `schema.sql`, and is **never saved** to `.env.local` or included in the app. You only need it the first time, so leave those two fields empty if your tables already exist.

### Option B: by hand

1. **Create the tables.** In Supabase open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You should see "Success. No rows returned". The script is safe to run again.
2. **Create `.env.local`.** A web page can't create this file, so copy the template:

   ```bash
   cp .env.example .env.local
   ```

   On Windows Command Prompt, use `copy .env.example .env.local` instead.

3. **Fill in your values:**

   ```env
   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
   ```

4. **Restart** `npm run dev`, because Vite only reads env files when it starts.

### What `schema.sql` creates

The `profiles`, `habits` and `habit_completions` tables, plus:

- their indexes and constraints,
- the trigger that creates a profile for each new user,
- the Row Level Security policies.

> ⚠️ **Never** use a **secret** key (`sb_secret_...`) or a **service_role** key as the publishable key. Every `VITE_` variable is bundled into the JavaScript that browsers download, so anyone could read it. The publishable key is designed to be public, and your data is protected by Row Level Security. Both the form and the app refuse secret keys.

## 5. Optional: check `.env.local` is ignored

`.env.local` is listed in `.gitignore`, so Git never commits it. See [Publishing to GitHub safely](#publishing-to-github-safely).

## 6. Turn off email confirmation

HabitFlow keeps sign-up simple: an email and a password, and you're in. New Supabase projects ask users to confirm their email first, so switch that off:

1. In your project, go to **Authentication → Sign In / Providers**.
2. Open **Email** and switch off **Confirm email**.
3. Click **Save**.

The setup form checks this setting. If it's still on, it shows a button that opens this page.

## 7. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). On your first visit you will be asked **"Is this your first time here?"**:

- **Yes, I'm new** opens the setup form (see step 4).
- **No, I've already set up Supabase** takes you straight to log in.

Your answer is remembered in this browser. You can reopen the setup form from the **Setup guide** link on the login page, for example to switch to a different Supabase project.

> Changed `.env.local`? **Stop the server (Ctrl + C) and run `npm run dev` again.** Vite only reads environment files at startup.

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and build a production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run all tests once |
| `npm run test:watch` | Re-run tests as you edit |
| `npm run typecheck` | Type-check without building |

## Tests

`npm test` runs everything **without** a Supabase project or `.env.local`:

- **Database tests** ([`supabase/schema.test.ts`](supabase/schema.test.ts)): run the real `schema.sql` in an in-memory PostgreSQL ([PGlite](https://pglite.dev/)) and prove that users cannot read, change or complete each other's habits, that a habit can only be completed once per day, that future dates are rejected, and that deleting a habit removes its history.
- **Logic tests** for date handling (local dates, month and leap-year boundaries), statistics and streaks, form validation, environment validation and error messages.
- **Setup helper tests** ([`dev/setupApi.test.ts`](dev/setupApi.test.ts)) for checking the values, detecting wrong keys and missing tables, handling the connection string, and making sure only the URL and publishable key are written to `.env.local`.
- **Component tests** for the setup screen, the welcome screen, the setup form and the habit form.

---

## How it works

### Project structure

```
habitflow/
├── supabase/
│   ├── schema.sql          # Tables, constraints, indexes, trigger, RLS policies
│   └── schema.test.ts      # Security tests for the schema
├── dev/
│   └── setupApi.ts         # Dev-server helper behind the setup form (never in the built app)
├── src/
│   ├── main.tsx            # Entry point
│   ├── App.tsx             # Setup gate + routes
│   ├── index.css           # Tailwind + a few animations
│   ├── lib/                # Plain TypeScript, no React
│   │   ├── env.ts          # Reads & validates VITE_* variables
│   │   ├── supabase.ts     # The one Supabase client
│   │   ├── api.ts          # Every database query lives here
│   │   ├── dates.ts        # Local-date helpers
│   │   ├── stats.ts        # Dashboard numbers & streaks (pure functions)
│   │   ├── validation.ts   # Form rules (mirror the DB constraints)
│   │   ├── errors.ts       # Turns errors into helpful messages
│   │   ├── onboarding.ts   # Remembers the welcome-screen answer
│   │   └── types.ts        # Shared types
│   ├── context/            # AuthContext (session), ToastContext (notifications)
│   ├── hooks/              # useHabits, useCompletions, useToday
│   ├── components/         # Reusable UI (buttons, modal, charts, forms…)
│   └── pages/              # Welcome, Login/Signup, Dashboard, Habits, Habit detail, Setup
├── .env.example            # Template for your .env.local
└── README.md
```

### Data model

| Table | Purpose | Key rules |
| --- | --- | --- |
| `profiles` | One row per user (display name) | Created automatically by a trigger on sign-up |
| `habits` | A user's habits | `user_id` defaults to the logged-in user; name 1–60 chars; fixed category/color lists |
| `habit_completions` | "Habit X was done on date Y" | Unique `(habit_id, completed_on)`; composite foreign key `(habit_id, user_id) → habits(id, user_id)` |

### Security

Security is enforced **in the database**, not just in the UI:

- **Row Level Security** is on for every table. Each policy checks `user_id = auth.uid()`.
- Logged-out visitors (`anon`) have **no** table privileges at all.
- The composite foreign key on `habit_completions` means a completion's owner must be the habit's owner. Combined with RLS, nobody can record a completion against another user's habit, even with hand-written API requests.
- Completions cannot be edited, only created or deleted, and cannot be dated in the future.

### Dates and statistics

- Completions are stored as plain calendar **dates**, using the user's **local** date. This way "today" matches the user's clock, and doing a habit at 11 pm doesn't count for tomorrow in UTC.
- The weekly chart only counts a habit on days after it was created, so adding a new habit doesn't make last week look worse. Archived habits are left out of the dashboard.
- A streak stays alive through today: if you did the habit yesterday but not yet today, the streak isn't broken until the day ends.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| **"Let's connect your Supabase project" screen** | No valid settings were found. Fill in the form on that screen, or fix `.env.local` by hand: it must sit next to `package.json`, then **restart** `npm run dev`. |
| **"Confirm email" is turned on** (setup form), or **"still requires email confirmation"** on sign-up / log in | Follow [step 6](#6-turn-off-email-confirmation). If you signed up while it was still on, delete that user under **Authentication → Users** and sign up again. |
| **"Supabase rejected the key"** (setup form) | Copy the publishable key again. Make sure it comes from the same project as the URL. |
| **"The database tables don't exist yet"** | Fill in the database connection string and password in the setup form, or run `supabase/schema.sql` in the SQL Editor yourself. |
| **"Could not reach the database"** | Use the **Session pooler** connection string. The "Direct connection" needs IPv6, which many home and school networks don't have. |
| **"Wrong database password"** | Reset it under Project Settings → Database, then try again. |
| **"The setup helper is not running"** | The form only works with `npm run dev`, not with a built or deployed app. Use the manual steps there. |
| **Page didn't reload after a successful setup** | Refresh it yourself. If the setup screen is still shown, restart `npm run dev`. |
| **I edited `.env.local` but nothing changed** | Restart the dev server. Vite reads env files only at startup. |
| **"Your database needs one more step" / "Could not find the table"** | You haven't run `supabase/schema.sql` yet (step 4), or you ran it in a different project from the one in `.env.local`. |
| **"Could not reach Supabase"** | Check your internet connection and the URL in `.env.local`. Free projects **pause** after a period of inactivity, so restore yours from the Supabase dashboard. |
| **"Supabase rejected the API key"** | Copy the publishable/anon key again. Make sure it belongs to the same project as the URL and has no extra spaces or quotes. |
| **"is a SECRET key"** | You pasted a secret or service_role key. Use the publishable key instead. If the secret key was ever committed or shared, **rotate it** in the Supabase dashboard. |
| **`npm install` fails** | Update Node.js to version 20 or newer (`node -v`). |
| **Port 5173 is already in use** | Stop the other dev server, or run `npm run dev -- --port 5174`. |
| **I want to see the welcome screen again** | Click **Setup guide** on the login page, or open `/welcome`. |

---

## Publishing to GitHub safely

1. Make sure `.env.local` is **not** tracked. It is listed in `.gitignore`, and you can check with:

   ```bash
   git status --ignored
   ```

   `.env.local` should appear under "Ignored files", never under "Changes to be committed".

2. Only `.env.example` (with placeholder values) belongs in the repository.
3. Create the repository and push:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: HabitFlow"
   git branch -M main
   git remote add origin https://github.com/<your-username>/habitflow.git
   git push -u origin main
   ```

4. If you ever commit a key by accident, deleting the file isn't enough because it stays in Git history. A publishable key is meant to be public, so that's low risk. A **secret/service_role** key must be **rotated** immediately in the Supabase dashboard.

## Ideas for practice

Good next steps for learning Git and full-stack development:

- Add a "Forgot password" flow (`supabase.auth.resetPasswordForEmail`).
- Let users edit their display name on a profile page.
- Support habits that only repeat on certain weekdays.
- Add dark mode with Tailwind's `dark:` variant.
- Turn email confirmation back on and add a "check your email" screen.
- Deploy to Vercel or Netlify (set the two `VITE_` variables in the host's settings).

## License

MIT. Use it, change it, learn from it.
