# Design — Galaxy Guardians Arcade

Original 3D arcade flight combat. The fantasy is a ragtag cargo tug punching through a neon sector, not a simulation. Numbers below match `src/game/balance.js`.

## Ship

**Shomeret / שומרת**

A plow-jaw guardian freighter. The silhouette is a wide blade and an open cargo jaw, not the old short tug with a side drum:

- White plow across the bow, with a red chevron
- Two forward cargo prongs (the port jaw is longer and blue, the starboard jaw is shorter with a red tip) plus a short turquoise ram underneath
- Centered white bridge and a blue canopy, not a cockpit stuck on one side
- Green cargo blocks stepped along the spine
- Unequal twin tails (blue port, red starboard) tied by a green crossbar
- Three rear bells: turquoise, red, and green
- Turquoise keel, white castle and plow, blue port jaw and tail, green cargo, red stripe and starboard tail

The nose points down the mesh's local −Z axis. The whole mesh is scaled by 2.25. Shots leave the plow tip. Nothing about the shape is taken from an existing film or comic vehicle.

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

Full-stick yaw rate is 1.75 rad/s. Pitch follows the cursor and eases back to level when the cursor is centered, so the nose cannot get stuck off the horizon. Banking is cosmetic and follows yaw rate. There is a small deadzone at the center of the mouse. Mouse steering arms only after the cursor has visited that center, so leaving the start button does not yank the ship.

The play space is a sphere of radius **430**. Hitting the edge shows **קצה הגזרה** and slides the ship back inside.

## Player

| Stat | Value |
| --- | --- |
| Hull (חיים) | 100 |
| Shield (מגן) | 80 |
| Shield regen | 16 per second, after 2.5s without a hit |
| Invulnerability after a hit | 0.7s (ship blinks) |
| Collision radius | 5.1 |
| Shot damage | 36 |
| Shot hit radius | 2.1 |
| Shot beam | 2.7 thick, about 14 long, with a large muzzle flash |
| Shot speed / life | 145 u/s, 1.15s |
| Fire interval | 0.15s (0.075s with rapid fire) |

Shields soak damage first. A translucent bubble shows remaining shield. Boost widens the camera field of view slightly. A normal shot deals 36, so glints, crates, and flare silos break in one hit. Slabs and Judge Vorak still take a sustained volley.

## Wing

Thirteen helpers launch with Shomeret and fight for the whole mission. The HUD counts them as **להק**. If one is destroyed it returns after a few seconds. They ignore the crate alley, including stray shots. They shoot enemies first, then nests, spires, and silos. Their kills score for the player. Player shots pass through them. Enemy shots and rams do not.

| Id | Hebrew | HP | Role |
| --- | --- | --- | --- |
| Escort | ליווי | 64 | Three ships. Two hold wide of the bow, one rides high. Shots deal 15. |
| Drone | רחפן | 24 | Six turquoise rings orbiting the freighter. Light shots deal 8. |
| Mend | רתך | 46 | Two green welders trail behind and restore 3 hull every 1.35s while inside 28 units. They also fire. |
| Ward | מגןית | 50 | Two discs. They shoot, catch enemy bolts that pass within 4.6 units, and pulse +10 shield every 6.5s. |

Chase and kite enemies peel onto a nearby helper when that helper is closer than the freighter. Slabs sometimes shoot the wing. Nests and spires aim at whichever of the freighter or the wing is closer. Judge Vorak still hunts the player.

## Enemies

Waves spawn outside the camera, staggered about 0.38s apart, 125–170 units from the player. Contact damage respects the player's invulnerability window.

| Id | Hebrew | HP | Speed | Score | Behavior |
| --- | --- | --- | --- | --- | --- |
| Glint | גלינט | 30 | 34 | 120 | Fast interceptor. Chases with a wide weave. Contact 10. |
| Nib | ניב | 12 | 44 | 50 | Tiny swarm body. Nearly straight chase. Contact 7. Dies in one shot. |
| Howler | מיילל | 54 | 22 | 280 | Keeps about 38 units away, strafes, and fires. Shots deal 9. Contact 12. |
| Slab | לוח | 140 | 13 | 700 | Slow armored cruiser. Heavy shots deal 16 and are easier to see. Contact 18. |
| Judge Vorak | הדיין ווראק | 420 | 10 | 1800 | Elite escort. See below. |

Drop chances: Glint 22%, Nib 16%, Howler 42%, Slab 70%, Judge Vorak 100%.

### Judge Vorak

An original capital escort, not a fighter. The hull is a long slate-green battering ship with bone armor plates, a raised citadel, and a forward spar that ends in a blunt energy maul. It is much larger than a Slab (collision radius 6.2) and keeps about 54 units away.

Attacks alternate after a 0.72s windup, while the maul lifts and slams:

1. **Maul bolt** — one slow amber shot (34 u/s, damage 24, large silhouette).
2. **Arc** — three faster shots in a wide fan (56 u/s, damage 12 each).

The next swing waits 2.35s. Contact damage is 28. A kill is a full explosion and always drops a powerup. The Hebrew name **הדיין ווראק** appears on the wave banner and again as a toast when the escort arrives. The radar draws it as a larger amber blip.

## Towers

Structures are already in the sector when the mission starts, including a crate alley straight ahead of the spawn point. They can be destroyed at any time; they do not block wave progress. Every second wave, a few more appear.

| Id | Hebrew | HP | Score | Notes |
| --- | --- | --- | --- | --- |
| Crate | ארגז | 16 | 80 | Drifts and tumbles around its spot. The opening tunnel still reads as an alley. Destroying one throws shrapnel (radius 13, damage 16) into nearby enemies. |
| Echo spire | צריח הד | 48 | 220 | Spins and tracks the nearest ship. Fires a slow cyan bolt (damage 10) out to 120 units. |
| Flare silo | ממגורת להבה | 32 | 400 | Spins. Every 2.45s it vents flame in radius 11 (damage 8) at ships inside it, then chain-blasts when it dies. |
| Spit nest | קן ירי | 96 | 520 | Bobs and tracks the nearest ship out to 100 units. Shots deal 11. |

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
| 5 | 10 Nib, 4 Glint, 3 Howler, 1 Slab, 1 Judge Vorak |
| 6 | 12 Nib, 4 Glint, 4 Howler, 2 Slab, 1 Judge Vorak |

After wave 6 the counts climb but stay capped (Nib 16, Glint 10, Howler 8, Slab 5, Judge Vorak 1) so the pools can hold them. The next wave begins 2 seconds after the last enemy of the current wave dies. The first enemy of a wave arrives about 0.85s after the banner.

## Game flow

- **Menu:** Shomeret (שומרת) spins in front of the sector with the wing orbiting it. Enter, Space, or יציאה לסיור starts. The same name stays on the HUD during flight, next to the living wing count.
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

All player-facing copy is Hebrew (`src/game/i18n.js`) and rendered in the DOM with Heebo, so right-to-left text is native. That includes the menu, HUD, buttons, pause, game over, the ship name שומרת, and the enemy and structure names listed on the menu. Keyboard letters on the help lines are the keycaps themselves. Code and this document are English.

## Tech

Three.js and Vite. The production build is a static `dist/` folder. Asset URLs use the GitHub Pages project-site base `/galaxy-guardians/` (override with `VITE_BASE=/` for a domain root). See README.md.
