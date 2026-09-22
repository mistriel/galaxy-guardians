# שומרי הגלקסיה — Galaxy Guardians Arcade

An original 3D browser arcade game. You pilot **עפרוני־אבק** (Dustlark), a lopsided cargo tug, through a starfield full of enemy ships and destructible structures.

This game is not affiliated with Marvel, Disney, or any other rights holder. The ship, enemies, towers, and insignia are original.

## Play locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build, still fully static:

```bash
npm run build
npm run preview
```

`npm run build` writes `dist/`. That folder is the whole site: HTML, JS, CSS, and the bundled Heebo font. No server runtime and no API keys.

## Deploy on GitHub Pages

The primary deploy path is GitHub Pages via Actions. The workflow is `.github/workflows/pages.yml`.

1. Push this repo to GitHub (`main`).
2. Open **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**.
4. The workflow runs `npm ci` and `npm run build`, then publishes the `dist/` directory.
5. The site is served at `https://<user>.github.io/galaxy-guardians/`  
   For this repository that is `https://mistriel.github.io/galaxy-guardians/`.

`vite.config.js` sets `base: './'`, so script, style, and font URLs are relative and work on a project-site subpath.

You can also run the workflow by hand from the Actions tab (`workflow_dispatch`).

### Manual publish (fallback)

```bash
npm ci
npm run build
```

Push the contents of `dist/` to a `gh-pages` branch and point Pages at that branch. The Actions workflow is the one to use if you have a choice.

## Controls

| Action | Input |
| --- | --- |
| Steer | Mouse (crosshair stays at screen center) or arrow keys |
| Boost / brake | `W` / `S` |
| Strafe | `A` / `D` |
| Shoot | Space or left click |
| Pause | `Esc` or `P` |
| Mute | `M` |
| Restart after game over | Enter, `R`, or the on-screen button |

The ship always cruises forward. Point the mouse away from the center to turn.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Static production build into `dist/` |
| `npm run preview` | Serves `dist/` locally |

Design notes, enemy types, towers, and scoring live in [DESIGN.md](DESIGN.md).

Heebo is bundled under the SIL Open Font License. See `public/licenses/Heebo-OFL.txt`.
