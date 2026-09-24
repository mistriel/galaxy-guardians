# שומרי הגלקסיה — Galaxy Guardians Arcade

An original 3D browser arcade game. You pilot **שומרת** (Shomeret), a lopsided cargo tug, through a starfield full of enemy ships and destructible structures. From wave 5 an elite escort joins the fight: **הדיין ווראק** (Judge Vorak), a heavy armored ship with a hammer-like energy maul.

This game is not affiliated with Marvel, Disney, or any other rights holder. The ship, enemies, towers, and insignia are original.

## Play locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/galaxy-guardians/`.

The dev server uses the same project-site base as production, so asset URLs match GitHub Pages.

Production build, still fully static:

```bash
npm run build
npm run preview
```

Open `http://localhost:4173/galaxy-guardians/`.

`npm run build` writes `dist/`. That folder is the whole site: HTML, JS, CSS, and the bundled Heebo font. No server runtime and no API keys.

## Deploy on GitHub Pages

GitHub Pages is the primary way to put the game online. The workflow is `.github/workflows/deploy-pages.yml`. It runs on every push to `main` (and can be started by hand with `workflow_dispatch`).

1. Push this repo to GitHub (`main`).
2. Open **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**. Do not use **Deploy from a branch**. That path runs Jekyll on the repository root and publishes the dev `index.html`, whose script is `/src/main.js` and 404s on Pages.
4. The workflow checks out the repo, runs `npm ci` and `npm run build`, checks that `dist/index.html` points at `/galaxy-guardians/assets/`, uploads only `dist/` with `actions/upload-pages-artifact`, and publishes it with `actions/deploy-pages`.
5. When the **Deploy GitHub Pages** workflow succeeds, the game is at:

   **https://mistriel.github.io/galaxy-guardians/**

`vite.config.js` sets `base` to `/galaxy-guardians/`, which is the project-site path for `mistriel/galaxy-guardians`. There is no custom domain. Built script, style, and font URLs all start with that prefix.

To build for a host that serves the game at the domain root instead, set `VITE_BASE=/` before `npm run build`.

### Manual publish (fallback)

If Actions is unavailable:

```bash
npm ci
npm run build
```

Push the contents of `dist/` to a `gh-pages` branch and point Pages at that branch. The Actions workflow above is the path to use when you can.

## Render (optional)

Pages is the primary host. A [Render](https://render.com) static site can publish the same `dist/` folder:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`

Because the default base is `/galaxy-guardians/`, that host must serve the files under `/galaxy-guardians/`, or you build with `VITE_BASE=/` so assets load from the site root. Use this only as a secondary option.

## Controls

| Action | Input |
| --- | --- |
| Steer | Mouse (crosshair stays at screen center) or arrow keys |
| Speed rush / brake | Hold `W`, Shift, or the מהירות על־חלל button / `S` |
| Strafe | `A` / `D` |
| Lasers | Space, left click, or the red ירי button. Hold to fire. The ship does not shoot on its own. Small bright tracers |
| Giant missile | Gold טיל ענק button or `Q` |
| Nuclear missile | Orange טילים גרעיניים button, `F`, or right click. Narrower hairline dart, body radius 0.010 aft and 0.006 at the nose, fin span about 0.043, scale 1, speed 900, 32s flight, range 28800, then an energy mushroom. No contact fuse |
| Factions | Blues are triangles (your army). Reds are circles that loiter on rings in their sector so you can shoot them. The menu says כחולים: משולשים · אדומים: עיגולים |
| Phone | Left stick moves (up מהירות על־חלל, down brake, sideways strafe). Right stick aims |
| Hangar | בחרו ספינה on the menu: שומרת, נץ, and עוגן are free. מספנה spends נקודות on מניפה and מחט |
| Ground battles | קרבות קרקע drops into יער זוהר. עולמות also opens מדבר אדום, קרח כחול, יער מחושף (purple forest, ghost warriors), and ים (blue sea, boats, coral warriors). Pick קל, בינוני, or קשה before the fight. The stage is ten waves, one at a time, and ends when wave 10 is cleared. The next beat arrives only after the current goal is met. The march road is wide (36 by 150). Walk with arrows or WASD, shoot with Space. חייל, טנק, and המשמיד each send that unit into the fight. מטח טילים or `X` fires a heavy missile ring that knocks out warriors in each burst. Aim view is `V`, and a grenade is `B`. נסיגה pulls back. Score and a streak show on the battle. Sending all three units and letting each role land a blow, with a streak, banks a gold cup for the next boss trophy. Every three wins, שומר החומה arrives; beating him raises a trophy cup (גביע) with a gift for later battles |
| Sortie threats | One red squad at a time. Clear it and the next squad arrives. After wave 6 the banner is הגזרה נקייה and no further wave starts |
| Pause | `Esc` or `P` |
| Mute | `M`, or קול on the HUD and the menu |
| Restart after game over | Enter, `R`, or the on-screen button |

The ship always cruises forward. Point the mouse away from the center to turn. Fire as soon as the mission starts: a tunnel of destructible crates sits straight ahead.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server at `/galaxy-guardians/` |
| `npm run build` | Static production build into `dist/` |
| `npm run preview` | Serves `dist/` locally at `/galaxy-guardians/` |

Design notes, enemy types, towers, and scoring live in [DESIGN.md](DESIGN.md).

Heebo is bundled under the SIL Open Font License. See `public/licenses/Heebo-OFL.txt`.
