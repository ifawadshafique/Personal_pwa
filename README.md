# Meri Budget — your monthly budget PWA

Pre-loaded with the plan we built together:
- Committee: Rs 20,000 · Loan: Rs 10,000 (shown as informational chips)
- Flexible budget: Rs 27,510 across Food, Transport, Rent, Books, Personal care, Utilities, Mobile, Laundry
- Everything is editable from the Settings screen inside the app.

## What it does
- Tracks daily expenses against category budgets
- Warns you the moment a category — or your whole month — goes over
- Reminds you at night if you haven't logged anything that day
- Works offline once installed (it's a real installable app, not just a bookmark)

## Step 1 — put it online (free, ~5 minutes)

You need it served from a real URL for "Add to Home Screen" to work — phones won't install a PWA straight from a folder on your computer.

**Easiest option: Netlify Drop**
1. Go to https://app.netlify.com/drop
2. Drag this whole `budget-pwa` folder onto the page
3. You'll get a live URL like `https://random-name.netlify.app` instantly — that's it, no account needed for a quick test (create a free account if you want it to stay permanently).

**Alternative: GitHub Pages**
1. Create a new GitHub repo, upload all these files to it
2. Repo Settings → Pages → set source to the `main` branch, root folder
3. Your app will be live at `https://yourusername.github.io/reponame`

**Alternative: Vercel**
1. Go to https://vercel.com, "Add New Project", drag/import this folder
2. Deploy — you get a live URL immediately

## Step 2 — install it on your phone
1. Open the live URL in Chrome (Android) or Safari (iPhone)
2. **Android/Chrome:** tap the menu → "Install app" (or you'll see an install banner)
3. **iPhone/Safari:** tap the Share icon → "Add to Home Screen"
4. Open it from your home screen icon — it now runs full-screen, like a real app

## Step 3 — turn on reminders
1. Inside the app, tap the settings (gear) icon
2. Set your reminder time (defaults to 10:00 PM)
3. Tap "Enable notifications" and allow permission when your phone asks

## Honest limitations, so there are no surprises
- **iPhone:** notifications for installed web apps need iOS 16.4 or later, and only work after you've installed it to your home screen (not from a regular Safari tab).
- **Exact-time delivery:** true "fires at exactly 10:00 PM even if you never open the app" needs a small server sending the notification (called Web Push) — browsers don't allow websites to wake themselves up at a precise clock time on their own. This app uses two layers instead: (1) Android/Chrome's Periodic Background Sync, which wakes the app roughly once a day in the background, and (2) a check every time you open the app — if it's past your reminder time and you haven't logged anything, it notifies you right then. In practice this is reliable if you open your phone in the evening, which most people do anyway.
- **Data lives on your phone only** — it's stored locally (IndexedDB), not synced to any server. If you switch phones you'd need to rebuild the categories (export/import isn't built in, but I can add it if useful).

## Phase 2 (optional, if you want true exact-time push later)
This would need a tiny backend — for example a free Cloudflare Worker or a Node script — that:
1. Runs on a daily cron trigger at 10:00 PM Pakistan time
2. Sends a real Web Push message to your subscribed device using the Push API + VAPID keys
3. Requires the app to register a push subscription and send it to that backend to store

I kept this out of v1 to avoid needing you to manage server hosting/costs — happy to build it if you want the extra reliability.

## File overview
- `index.html` — screens (home, settings, add-expense sheet)
- `style.css` — visual design
- `app.js` — UI logic and event handling
- `db.js` — IndexedDB storage (expenses, budget plan, settings)
- `notifications.js` — permission request + reminder scheduling
- `service-worker.js` — offline caching + background reminder check
- `manifest.json` — makes the app installable
- `icons/` — app icons
