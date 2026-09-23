# Design — Galaxy Guardians Arcade

Original 3D arcade flight combat. The fantasy is a ragtag cargo tug punching through a neon sector, not a simulation. Numbers below match `src/game/balance.js`.

## Ground battles

The menu shows שומרת, יציאה לסיור, and a second button labeled exactly קרבות קרקע. That button opens יער זוהר, מדבר אדום, and קרח כחול. יער זוהר and מדבר אדום also sit on the menu as open shortcuts. **עולמות** switches fields. Each battle starts with huge squads: three ranks of soldiers on each side, tanks, and combat cars carrying a machine gun, a cannon, or a mortar. In a space sortie, a green ring on the left (about x −36, z −110) opens יער זוהר, and an orange ring on the right (about x 36, z −155) opens מדבר אדום. חזרה לחלל returns to the sortie, or to the menu if the fight was opened from the menu. Each fight is the same easy push. The battle is already on the field when the world opens: friendly soldiers walk and shoot soft light, warriors on the far line brace and shoot back, artillery lobs over them, and tanks plus combat cars are already rolling. Cars mount one of three guns: a twin machine gun, a fat cannon, or a short mortar. Enemy cars on the far line shoot back. The opening lines are large squads, about thirty-six friendlies and thirty defenders, with more joining later. No gore — hits are sparks.

1. Artillery keeps lobbing while both infantry lines trade light.
2. More tanks and gun-cars (קרון ירי) join and break the barricades.
3. A second wave of people comes through and captures the flag. Friendly soldiers wear a world-colored tunic, cream pants, a pale helmet, and a small flag. Warriors wear the enemy color, dark pants, shoulder pads, and a helm crest. They stand, walk, or shoulder the rifle when they fire, then walk back when the line breaks. The field is dressed before the first shell: a painted sky with clouds and a sun, soft hills, a worn path, grass, petal flowers, and rounded trees along both flanks. יער זוהר is a gold dawn with green canopies and lantern fruit. מדבר אדום is a peach sunset with palms and coral blooms. קרח כחול is a pink-and-blue snowfield with snow pines and crystals. Friendly soldiers are rounded toy figures with a smile, rosy cheeks, a sash, and a small flag. Warriors across the field wear shoulder pads and a crest. Entering a world fades in with ברוכים הבאים.
4. **משמיד** drops in for the climax. It is a turquoise tank wearing heavy cannons, a rack of artillery tubes, and fat glowing nuclear guns — the joke is every gun in the world on one hull. It slams onto the field, lobs a ground barrage (no space trails), and flattens a wide stretch of barricades. The world landmark (אורן הנוצץ, תוף המדבר, or כתר הקרח) still arrives off to the side. The Hebrew label is משמיד.
5. The beat ends in ניצחון, or נסיגה if you choose to pull back.

A and D (or the phone side buttons) slide the push. דחיפה or Space hurries the current step. The flight sortie is unchanged.

## Ship

**Shomeret / שומרת**

A ring-wing dart, scaled to 3 so she reads large in the chase view. Symmetric silhouette, all blue:

- One cone nose, not a split beak
- A blue hoop wraps the middle of the spine
- Short canards sit ahead of the hoop, and two small tails sweep aft
- A glass canopy sits on the spine, with blue engines at the tail

The nose points down the mesh's local −Z axis. The whole mesh is scaled by 3. Nothing about the shape is taken from an existing film or comic vehicle.

The menu heading **בחרו ספינה** offers שומרת, נץ, and עוגן with no point cost. The מספנה still spends persistent נקודות on weapons. The לייזר is free. מניפה (900) fires three small tracers. מחט (1400) fires a thinner faster dart. נץ is a narrow dart at scale 1.75. עוגן is a wide hauler at scale 2.35.

## Controls

Third-person chase camera. A fixed crosshair sits at the center of the screen; shots travel along the nose, through that crosshair.

| Action | Input |
| --- | --- |
| Steer yaw / pitch | Mouse offset from center, or arrow keys |
| Speed rush | Hold `W`, Shift, the מהירות על־חלל button on the HUD, or the phone מהירות על־חלל button (420 u/s). Streaks and a soft glow wrap the whole hull, and the view opens to FOV 114 |
| Cruise | Hands off the throttle (24 u/s) |
| Brake | `S` (8 u/s, never a full stop) |
| Strafe | `A` / `D` (20 u/s) |
| Shoot | Space, left click, or the red ירי button. Small cinematic tracers |
| Giant missile | Gold טיל ענק button or `Q`. Fat body, scale 3.4, blooms after 1.7s (about 270 units). Blast 150. Cooldown 3s. Does not touch allies |
| Nuclear missile | Orange טילים גרעיניים button, `F`, or right click. Hairline dart, 32s flight, about 28800 units, then an energy mushroom. No contact fuse. Cooldown 4s |
| Phone move | Left joystick. Horizontal strafes. Up holds מהירות על־חלל, down brakes. Brake wins if both |
| Phone aim | Right joystick. Touch yaw rate is 68% of the mouse rate. The stick value is not passed through the mouse deadzone |
| Aim assist | On a phone, a soft nudge pulls the nose toward a target ahead while the stick is near center. Full stick still overrides it. Touch yaw rate is about 68% of the mouse rate |
| Pause | `Esc` or `P`, or the השהיה button |
| Mute | `M`, the HUD קול button, or the same button on the menu |
| Restart | משימה חדשה, Enter, or `R` on the game-over / pause panel |

Full-stick yaw rate is 1.75 rad/s. Pitch follows the cursor and eases back to level when the cursor is centered, so the nose cannot get stuck off the horizon. Banking is cosmetic and follows yaw rate. There is a small deadzone at the center of the mouse. Mouse steering arms only after the cursor has visited that center, so leaving the start button does not yank the ship.

The play space is a closed sphere of radius **430** that feels open. Stars and dust travel with the ship, so there is no sky wall. From radius **200** a smooth inward current slows a radial boost and eases the ship home. The Hebrew line **המרחב מתעקל** appears only deep in that curve. A last safety keeps the ship inside 430. Gallery rings, portals, and missiles are unchanged. Ground fields are wide planes that fade in fog, so the battle valley is closed without a cliff edge.

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
| Missile | Speed 900. Lifetime 32s, so it travels 28800 units before it blooms. Body radius 0.010 aft and 0.006 at the nose, nose cone radius 0.007, collar radius 0.012, fin thickness 0.004 and fin span about 0.043, plume radius 0.009, scale 1. No contact fuse and no arena-edge fuse. Blast radius 29200 still clears the sector it crossed. Cooldown 4s |

Shields soak damage first. Hull is 160 and shield is 140, and the shield starts refilling after 1.4 seconds. A translucent bubble shows remaining shield. Holding מהירות על־חלל jumps the ship to 420, opens the view to FOV 114, and draws pale streaks plus a glow along the whole hull. A normal shot deals 36, so the softer glints, crates, and flare silos break in one hit. Slabs and Judge Vorak still take a sustained volley, and Vorak waits until wave 5.

Primary fire is a small movie tracer: girth 1.5 and stretch 5.8 on the 0.34×3.4 bolt, so it reads as a bright streak rather than a slab. Damage stays 36.

טיל ענק is the fat special. The mesh is a thick gold body at scale 3.4. It flies for 1.7 seconds at 160 (about 270 units) and only then blooms. Blast radius 150. It does not hurt שומרת, the blue triangles, or the friendly carrier.

טילים גרעיניים are a narrower hairline movie dart (body radius 0.010 aft and 0.006 at the nose, nose cone radius 0.007, collar radius 0.012, fin thickness 0.004 and fin span about 0.043, plume radius 0.009, scale 1, speed 900, life 32s, range 28800). Lifetime fuse only: no contact fuse and no arena-edge fuse, so it cannot pop early. At the end of that flight the bloom is an energy mushroom drawn ahead of the camera so it still fills the view: a wide base, a rising stem of rings, and a bright cap. Family-friendly gold and orange, no gore. The wipe still clears enemies, towers, and the red carrier inside blast 29200, and it still skips allies.

A separate heavy cycle sits beside those two. **E** or the חימוש button fires the selected one. **C** or **הבא** steps אטומים → פגזים → פצצות אולטרה גרעיניות. Atoms are a spinning cluster of pastel beads (speed 175, life 1.35s, blast 78). Shells are short gold rounds (speed 230, life 0.95s, blast 62). Ultra is a glowing orb with two rings that opens into a local festival of light (speed 120, life 2.15s, blast 280), not the sector-wide nuclear wipe. Each has its own cooldown. No gore.

## Enemies

Two factions fill the sector. Blues are triangles and fight with שומרת: 44 fighters at scale 2.5, plus a giant blue triangle carrier (נושאת מטוסים) that keeps launching them. Reds are circles: every enemy hull is a sphere with a ring, and נושאת האויב is a giant red circle that dumps another 14 circles into each wave. The Hebrew menu states it as כחולים: משולשים and אדומים: עיגולים. שומרת stays the all-blue ring-wing dart at scale 3.

Waves arrive as squads of eight. Each squad picks a fixed point ahead of שומרת and orbits that point on a distance band. They do not dive through the player or circle around behind him. The first wave is 32 red circles. Later waves climb slowly, and Judge Vorak stays at one until well after wave 6. Pool caps still hold a second wave (nib 56, glint 36, howler 18, slab 8, vorak 2). Ally shots are blue and share the enemy bolt pool, which is 180. Contact damage only happens if the player flies into a circle. It still respects the invulnerability window.

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

Attacks alternate after a 1.05s windup:

1. **Maul bolt** — one slow amber shot (28 u/s, damage 12, large silhouette).
2. **Arc** — three faster shots in a wide fan (46 u/s, damage 6 each).

The next swing waits 3.6s. Contact damage is 14. A kill is a full explosion and always drops a powerup. The Hebrew name **הדיין ווראק** appears on the wave banner and again as a toast when the escort arrives. The radar draws it as a larger red blip.

## Towers

Structures are already in the sector when the mission starts, including a crate alley straight ahead of the spawn point. They can be destroyed at any time; they do not block wave progress. Every second wave, a few more appear.

| Id | Hebrew | HP | Score | Notes |
| --- | --- | --- | --- | --- |
| Crate | ארגז | 16 | 80 | One shot. Small pop. |
| Echo spire | צריח הד | 48 | 220 | Tall mast, blinking lamp. |
| Flare silo | ממגורת להבה | 32 | 400 | Explodes. See chain reaction below. |
| Spit nest | קן ירי | 60 | 520 | Turret. Tracks the player out to 100 units and fires shots that deal 6. |

### Silo blast

Radius 30. Deals 58 damage to other enemies and towers in range, so depots chain. The player takes 8 and is shoved back if they are inside about 82% of that radius. One invulnerability window means a chain only hurts the player once.

## Powerups

Orbs left by destroyed enemies, plus a gift every 20 seconds ahead of the ship. They drift toward the ship inside 26 units and last 14 seconds.

| Pickup | Effect |
| --- | --- |
| Rapid (ירי מהיר) | Fire interval 0.075s for 11s |
| Spread (ירי מניפה) | Three-shot fan for 11s |
| Shield (המגן הוטען) | +90 shield, capped at 140 |
| Repair (השלדה תוקנה) | +60 hull, capped at 160 |
| Party (חגיגה) | +250 score, +36 shield, a short safe moment |
| Wing (הלהק חוזר) | Launches up to 6 resting blue triangles |

## Scoring

Displayed score is `round(base × combo)`.

- Combo starts at ×1.
- Another score event within 2 seconds adds 0.25, up to ×4.
- Wave-clear bonus does **not** use the combo: `150 × wave` for the wave you just cleared.
- Best score is stored in `localStorage` under `galaxy-guardians-best`.

## Waves

| Wave | Spawns |
| --- | --- |
| 1 | 18 Nib, 14 Glint |
| 2 | 22 Nib, 14 Glint, 6 Howler |
| 3 | 24 Nib, 16 Glint, 8 Howler, 2 Slab |
| 4 | 26 Nib, 16 Glint, 8 Howler, 3 Slab |
| 5 | 28 Nib, 18 Glint, 8 Howler, 3 Slab, 1 Judge Vorak |
| 6 | 30 Nib, 18 Glint, 10 Howler, 4 Slab, 1 Judge Vorak |

After wave 6 the counts climb slowly. A second Vorak waits until three waves past that table. Pools still hold the wave. The next wave begins 2 seconds after the last enemy of the current wave dies. Squads start arriving about 0.4s after the banner.

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
