# Design — Galaxy Guardians Arcade

Original 3D arcade flight combat. The fantasy is a ragtag cargo tug punching through a neon sector, not a simulation. Numbers below match `src/game/balance.js`.

## Ship

**Dustlark / עפרוני־אבק**

A short, blunt freighter with a deliberately lopsided silhouette:

- Cockpit blister offset to port
- Round cargo drum bolted to starboard
- One oversized rear engine and one stub engine
- Uneven fins and a crooked antenna mast
- Teal hull, cream panels, magenta stripe, rust patches

The nose points down the mesh's local −Z axis. Nothing about the shape is taken from an existing film or comic vehicle.

## Controls

Third-person chase camera. A fixed crosshair sits at the center of the screen; shots travel along the nose, through that crosshair.

| Action | Input |
| --- | --- |
| Steer yaw / pitch | Mouse offset from center, or arrow keys |
| Boost | `W` or Shift (48 u/s) |
| Cruise | Hands off the throttle (24 u/s) |
| Brake | `S` (8 u/s, never a full stop) |
| Strafe | `A` / `D` (20 u/s) |
| Shoot | Space or left click |
| Pause | `Esc` or `P`, or the השהיה button |
| Mute | `M` or the קול button |
| Restart | משימה חדשה, Enter, or `R` on the game-over / pause panel |

Full stick turn rate is 1.75 rad/s. Pitch is clamped so the ship cannot loop. Banking is cosmetic and follows yaw rate. There is a small deadzone at the center of the mouse.

The play space is a sphere of radius **430**. Hitting the edge shows **קצה הגזרה** and slides the ship back inside.

## Player

| Stat | Value |
| --- | --- |
| Hull (חיים) | 100 |
| Shield (מגן) | 80 |
| Shield regen | 16 per second, after 2.5s without a hit |
| Invulnerability after a hit | 0.7s (ship blinks) |
| Collision radius | 2 |
| Shot damage | 16 |
| Shot speed / life | 145 u/s, 1.15s |
| Fire interval | 0.15s (0.075s with rapid fire) |

Shields soak damage first. A translucent bubble shows remaining shield. Boost widens the camera field of view slightly.

## Enemies

Waves spawn outside the camera, staggered about 0.38s apart, 125–170 units from the player. Contact damage respects the player's invulnerability window.

| Id | Hebrew | HP | Speed | Score | Behavior |
| --- | --- | --- | --- | --- | --- |
| Glint | גלינט | 30 | 34 | 120 | Fast interceptor. Chases with a wide weave. Contact 10. |
| Nib | ניב | 12 | 44 | 50 | Tiny swarm body. Nearly straight chase. Contact 7. Dies in one shot. |
| Howler | מיילל | 54 | 22 | 280 | Keeps about 38 units away, strafes, and fires. Shots deal 9. Contact 12. |
| Slab | לוח | 140 | 13 | 700 | Slow armored cruiser. Heavy shots deal 16 and are easier to see. Contact 18. |

Drop chances: Glint 22%, Nib 16%, Howler 42%, Slab 70%.

## Towers

Structures are already in the sector when the mission starts, including a crate alley straight ahead of the spawn point. They can be destroyed at any time; they do not block wave progress. Every second wave, a few more appear.

| Id | Hebrew | HP | Score | Notes |
| --- | --- | --- | --- | --- |
| Crate | ארגז | 16 | 80 | One shot. Small pop. |
| Echo spire | צריח הד | 48 | 220 | Tall mast, blinking lamp. |
| Flare silo | ממגורת להבה | 32 | 400 | Explodes. See chain reaction below. |
| Spit nest | קן ירי | 96 | 520 | Turret. Tracks the player out to 100 units and fires shots that deal 11. |

### Silo blast

Radius 30. Deals 58 damage to other enemies and towers in range, so depots chain. The player takes 16 and is shoved back if they are inside about 82% of that radius. One invulnerability window means a chain only hurts the player once.

## Powerups

Orbs left by destroyed enemies. They drift toward the ship inside 18 units and last 14 seconds.

| Pickup | Effect |
| --- | --- |
| Rapid (ירי מהיר) | Fire interval 0.075s for 8s |
| Spread (ירי מניפה) | Three-shot fan for 8s |
| Shield (המגן הוטען) | +48 shield, capped at 80 |
| Repair (השלדה תוקנה) | +30 hull, capped at 100 |

## Scoring

Displayed score is `round(base × combo)`.

- Combo starts at ×1.
- Another score event within 2 seconds adds 0.25, up to ×4.
- Wave-clear bonus does **not** use the combo: `150 × wave` for the wave you just cleared.
- Best score is stored in `localStorage` under `galaxy-guardians-best`.

## Waves

| Wave | Spawns |
| --- | --- |
| 1 | 4 Glint |
| 2 | 7 Nib, 3 Glint |
| 3 | 6 Nib, 3 Glint, 2 Howler |
| 4 | 8 Nib, 2 Glint, 3 Howler, 1 Slab |
| 5 | 10 Nib, 4 Glint, 3 Howler, 1 Slab |
| 6 | 12 Nib, 4 Glint, 4 Howler, 2 Slab |

After wave 6 the counts climb but stay capped (Nib 16, Glint 10, Howler 8, Slab 5) so the pools can hold them. The next wave begins 2 seconds after the last enemy of the current wave dies. The first enemy of a wave arrives about 0.85s after the banner.

## Game flow

- **Menu:** Dustlark spins in front of the sector. Enter, Space, or יציאה לסיור starts.
- **Play:** cruise, shoot, radar in the corner (forward is up).
- **Pause:** simulation freezes. Resume, restart, or return to the menu.
- **Game over:** hull at 0. Restart or menu. Enter restarts.

## Presentation

- Parallax star shells follow the ship at two rates. Nebula sprites sit in the sector.
- A faint grid far below gives a horizon.
- Hits flash the mesh. Kills throw additive sparks and, except for crates, a shockwave ring.
- The camera shakes on hits, kills, and silo blasts. `prefers-reduced-motion` cuts that shake down.
- Sound is WebAudio beeps and noise bursts. There are no audio files.

## UI

All player-facing copy is Hebrew (`src/game/i18n.js`) and rendered in the DOM with Heebo, so right-to-left text is native. Code and this document are English.

## Tech

Three.js and Vite. The production build is a static `dist/` folder with relative asset paths, suitable for GitHub Pages project sites. See README.md.
