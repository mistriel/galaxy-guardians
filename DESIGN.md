# Design — Galaxy Guardians Arcade

Original 3D arcade flight combat. The fantasy is a ragtag cargo tug punching through a neon sector, not a simulation. Numbers below match `src/game/balance.js`.

## Ground battles

The menu shows שומרת and offers both יציאה לסיור and קרבות קרקע. **עולמות** switches fields. **קרבות קרקע** on the menu opens three fields: יער זוהר, מדבר אדום, קרח כחול. Each fight is the same easy push, staged so the units do not all appear at once:

1. Artillery lobs light shells and softens the line.
2. Tanks and gun-cars (קרון ירי) roll in, staggered, and break the barricades.
3. Infantry floods through and captures the flag.
4. **משמיד** drops in for the climax. It is a turquoise tank wearing heavy cannons, a rack of artillery tubes, and fat glowing nuclear guns — the joke is every gun in the world on one hull. It slams onto the field, lobs a ground barrage (no space trails), and flattens a wide stretch of barricades. The world landmark (אורן הנוצץ, תוף המדבר, or כתר הקרח) still arrives off to the side. The Hebrew label is משמיד.
5. The beat ends in ניצחון, or נסיגה if you choose to pull back.

A and D (or the phone side buttons) slide the push. דחיפה or Space hurries the current step. The flight sortie is unchanged.

## Ship

**Shomeret / שומרת**

A long cargo freighter, scaled to 3 so she reads large in the chase view. Lopsided silhouette:

- Cockpit blister offset to port
- Round cargo drum bolted to starboard
- One oversized rear engine and one stub engine
- Uneven fins and a crooked antenna mast
- Turquoise hull, white nose, blue port fin and cockpit, green cargo drum, red stripe and starboard fin

The nose points down the mesh's local −Z axis. The whole mesh is scaled by 3. Nothing about the shape is taken from an existing film or comic vehicle.

The מספנה spends persistent נקודות (separate from the run score and the best score). שומרת and the movie לייזר are free. נץ costs 1200 and is a narrow dart at scale 1.75. עוגן costs 2200 and is a wide hauler at scale 2.35. מניפה (900) fires three small tracers. מחט (1400) fires a thinner faster dart.

## Controls

Third-person chase camera. A fixed crosshair sits at the center of the screen; shots travel along the nose, through that crosshair.

| Action | Input |
| --- | --- |
| Steer yaw / pitch | Mouse offset from center, or arrow keys |
| Turbo | Hold `W`, Shift, the טורבו button on the HUD, or the phone טורבו button (240 u/s) |
| Cruise | Hands off the throttle (24 u/s) |
| Brake | `S` (8 u/s, never a full stop) |
| Strafe | `A` / `D` (20 u/s) |
| Shoot | Space, left click, or the red ירי button. Small cinematic tracers |
| Giant missile | Gold טיל ענק button or `Q`. Fat body, scale 3.4, blooms after 1.7s (about 270 units). Blast 150. Cooldown 3s. Does not touch allies |
| Nuclear missile | Orange טילים גרעיניים button, `F`, or right click. Thin dart, 6.4s flight, then an energy mushroom. Cooldown 4s |
| Phone move | Left joystick. Horizontal strafes. Up holds turbo, down brakes. Brake wins if both |
| Phone aim | Right joystick. Touch yaw rate is 68% of the mouse rate. The stick value is not passed through the mouse deadzone |
| Aim assist | On a phone, a soft nudge pulls the nose toward a target ahead while the stick is near center. Full stick still overrides it. Touch yaw rate is about 68% of the mouse rate |
| Pause | `Esc` or `P`, or the השהיה button |
| Mute | `M`, the HUD קול button, or the same button on the menu |
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
| Collision radius | 4.6 |
| Shot damage | 36 |
| Shot hit radius | 2.1 |
| Shot bolt | About 0.5 thick and 20 long, bright tracer, small muzzle flash |
| Shot speed / life | 145 u/s, 1.15s |
| Fire interval | 0.15s (0.075s with rapid fire) |
| Missile | Speed 250. Lifetime 6.4s, so it travels about 1600 units before it blooms. No contact fuse and no arena-edge fuse. Blast radius 1900 still clears the sector it crossed. Cooldown 4s |

Shields soak damage first. A translucent bubble shows remaining shield. Holding טורבו jumps the ship to 240 and opens the view so the rush reads. A normal shot deals 36, so glints, crates, and flare silos break in one hit. Slabs and Judge Vorak still take a sustained volley.

Primary fire is a small movie tracer: girth 1.5 and stretch 5.8 on the 0.34×3.4 bolt, so it reads as a bright streak rather than a slab. Damage stays 36.

טיל ענק is the fat special. The mesh is a thick gold body at scale 3.4. It flies for 1.7 seconds at 160 (about 270 units) and only then blooms. Blast radius 150. It does not hurt שומרת, the blue triangles, or the friendly carrier.

טילים גרעיניים stay the thin needle (body radius under 0.14, scale 1, speed 250, life 6.4s, no contact fuse). At the end of that flight the bloom is an energy mushroom: a wide base, a rising stem of rings, and a bright cap. Family-friendly gold and orange, no gore. The wipe still clears enemies, towers, and the red carrier inside blast 1900, and it still skips allies.

## Enemies

Two factions fill the sector. Blues are triangles and fight with שומרת: 32 fighters at scale 2.5, plus a giant blue triangle carrier (נושאת מטוסים) that keeps launching them. Reds are circles: every enemy hull is a sphere with a ring, and נושאת האויב is a giant red circle that dumps another 14 circles into each wave. The Hebrew menu states it as כחולים: משולשים and אדומים: עיגולים. שומרת stays the five-color freighter at scale 3.

Waves arrive as squads of eight. Each squad picks a fixed point ahead of שומרת and orbits that point on a distance band. They do not dive through the player or circle around behind him. The first wave is 50 red circles. Later waves climb toward the pool caps (nib 56, glint 36, howler 18, slab 8, vorak 2) so a second wave can still spawn. Ally shots are blue and share the enemy bolt pool, which is 180. Contact damage only happens if the player flies into a circle. It still respects the invulnerability window.

| Id | Hebrew | HP | Loiter | Score | Behavior |
| --- | --- | --- | --- | --- | --- |
| Glint | גלינט | 30 | 14 | 120 | Red circle. Orbits a band about 20 ahead of its anchor. Contact 10. |
| Nib | ניב | 12 | 14 | 50 | Small red circle. Tighter band, about 14. Contact 7. Dies in one shot. |
| Howler | מיילל | 54 | 11 | 280 | Larger red-orange circle. Band about 26. Fires if the player is inside range. Shots deal 9. Contact 12. |
| Slab | לוח | 140 | 8 | 700 | Heavy dark-red circle. Wide band about 34. Shots deal 16. Contact 18. |
| Judge Vorak | הדיין ווראק | 420 | 6 | 1800 | Biggest red circle. Slow ring. See below. |

Drop chances: Glint 22%, Nib 16%, Howler 42%, Slab 70%, Judge Vorak 100%.

### Judge Vorak

The largest red circle (collision radius 6.2), still on the red team. It loiters on a slow ring around its squad anchor (band about 30) and shoots from there. It does not chase שומרת.

Attacks alternate after a 0.72s windup:

1. **Maul bolt** — one slow amber shot (34 u/s, damage 24, large silhouette).
2. **Arc** — three faster shots in a wide fan (56 u/s, damage 12 each).

The next swing waits 2.35s. Contact damage is 28. A kill is a full explosion and always drops a powerup. The Hebrew name **הדיין ווראק** appears on the wave banner and again as a toast when the escort arrives. The radar draws it as a larger red blip.

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
| 1 | 12 Glint, 12 Nib |
| 2 | 16 Nib, 10 Glint, 6 Howler |
| 3 | 18 Nib, 12 Glint, 8 Howler, 3 Slab |
| 4 | 18 Nib, 12 Glint, 8 Howler, 4 Slab, 1 Judge Vorak |
| 5 | 20 Nib, 14 Glint, 10 Howler, 4 Slab, 2 Judge Vorak |
| 6 | 22 Nib, 14 Glint, 10 Howler, 5 Slab, 2 Judge Vorak |

After wave 6 the counts climb but stay capped (Nib 28, Glint 18, Howler 12, Slab 6, Judge Vorak 2) so the pools can hold them. The next wave begins 2 seconds after the last enemy of the current wave dies. Squads start arriving about 0.4s after the banner.

## Game flow

- **Menu:** Shomeret (שומרת) spins in front of the sector. Enter, Space, or יציאה לסיור starts. The same name stays on the HUD during flight.
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
