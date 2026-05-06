# Vocabulary Builder

A local-first vocabulary quiz app. Your spreadsheet is the source of truth; learning progress lives in the browser (IndexedDB). No backend, no cloud sync, no AI calls during use.

## Run locally

Requires Node.js 18+ (Node 20 recommended).

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: <http://localhost:5173>). Click **Import spreadsheet** and pick a CSV/XLSX file.

### Preview the production build locally

To verify the GitHub Pages build before pushing — i.e. serve the built `dist/` under the same base path the live site uses:

```bash
npm run build
npm run preview:pages
```

Then open **<http://localhost:4173/vocabulary-builder-app/>** (note the trailing slash and the `/vocabulary-builder-app/` segment — that's the GH Pages base path baked into the build).

> Going to `http://localhost:4173/` directly will 404. That's expected: the production build's asset URLs include the base path. If you want to preview without the base, use `npm run dev` instead.

`preview:pages` also exposes the server on your local network (`--host`). The terminal prints a `Network:` URL like `http://192.168.1.42:4173/vocabulary-builder-app/` — open that on your phone (same Wi-Fi) to test the production build on a real device before deploying.

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) that builds and deploys on every push to `main`.

The Vite `base` is set to `/vocabulary-builder-app/` for production builds, so the deployed URL is:

```
https://<your-github-username>.github.io/vocabulary-builder-app/
```

> If you fork or rename the repo to something other than `vocabulary-builder-app`, update the `base` in [`vite.config.ts`](vite.config.ts) to match the new repo name.

### One-time setup

1. **Create the GitHub repo.** Go to <https://github.com/new>:
   - Repository name: `vocabulary-builder-app`
   - Visibility: your choice (public or private — Pages works on both for free accounts now)
   - Do **not** initialize with a README, .gitignore, or license — your local repo already has them.
2. **Push your local project to GitHub.** Run from the project folder:

   ```bash
   git remote add origin https://github.com/<your-github-username>/vocabulary-builder-app.git
   git branch -M main
   git push -u origin main
   ```

   (Use the SSH URL `git@github.com:<user>/vocabulary-builder-app.git` instead if you've set up SSH.)

3. **Enable GitHub Pages with Actions as the source.**
   - In your repo on GitHub: **Settings → Pages**.
   - Under **Build and deployment → Source**, choose **GitHub Actions**.
   - You don't need to pick a branch; the workflow handles deployment.

4. **Wait for the first deploy.**
   - Go to the **Actions** tab.
   - You should see a run named *Deploy to GitHub Pages* triggered by your push.
   - The first build takes ~1–2 minutes.
   - When the *Deploy* job turns green, your site is live.

5. **Find the URL.**
   - In **Settings → Pages**, you'll see *Your site is live at* `https://<user>.github.io/vocabulary-builder-app/`.
   - The Actions run will also show this URL on the *Deploy* step.

### Subsequent deploys

Every push to `main` re-runs the workflow and republishes the site. You can also trigger a deploy manually from the **Actions** tab → workflow → **Run workflow**.

## Test on your phone

1. Open the deployed URL on **iPhone Safari** or **Android Chrome**.
2. Tap **Import spreadsheet** and pick the same CSV/XLSX file you use on desktop. (Tip: AirDrop / Google Drive / iCloud Drive can move it from your computer to the phone.)
3. Optional, iPhone: tap the **Share** button → **Add to Home Screen** to install as a standalone app with its own icon. The app will run in fullscreen with no browser chrome.
4. Optional, Android Chrome: tap the **⋮** menu → **Install app** (or Chrome may prompt automatically).

### Important: progress does NOT sync between devices

The app stores everything in your browser's local **IndexedDB**. There is **no cloud backend**, so:

- Your vocabulary list and learning progress on your **Mac browser** are completely separate from your **phone browser**.
- You'll need to **import the spreadsheet on each device the first time**. Re-imports are safe — they merge by word ID and preserve any progress already on that device.
- If you clear your browser's site data, you lose progress on that device.
- Mac and phone progress will not stay in sync unless we add an export/import feature or a cloud sync layer later.

If you want to keep them roughly in sync, the practical workflow today is: import the same spreadsheet on each device and treat each as an independent practice session. (A future *Export progress / Import progress* JSON file would make this cleaner — say the word and we'll add it.)

## How it works

- **Source of truth:** your XLSX/CSV file. Required columns are documented in [`src/import/parser.ts`](src/import/parser.ts).
- **Progress:** spaced repetition (SM-2) state lives in IndexedDB, never written back to your spreadsheet.
- **Re-imports:** new words are added; existing rows have content updated; missing rows are archived (not deleted) so progress survives if you re-add them later.
- **No network calls during normal use.** The app is fully offline-capable once loaded.

## Project layout

```
src/
├── main.tsx, App.tsx, index.css       # shell
├── db/                                # Dexie schema + progress helpers
├── import/                            # XLSX/CSV parsing + merge logic
├── lib/                               # hash, normalize, shuffle, sortWords
├── quiz/                              # SM-2, builders, hints, cloze, types, pool
├── components/                        # WordCard, FilterBar, ImportButton, PersonalSentenceEditor
│   └── quiz/                          # McCard, TypedCard, ClozeCard, FlashcardCard, Hints, Reinforcement
└── views/                             # Library, Quiz, Settings
```
