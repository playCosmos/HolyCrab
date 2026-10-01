# HolyCrab — Game Design

## 1. Pitch

**HolyCrab** is a short single-player stealth-comedy game about **라먀니 (Ramyani)** sneaking through her family home at night to reconstruct and steal Mom's legendary soy-marinated crab recipe.

The project deliberately targets a compact, polished scope instead of a large unfinished one. A complete run is designed to take roughly 5–12 minutes on the first playthrough and 2–5 minutes once the route is known.

## 2. Player fantasy

The player should feel like a very low-stakes master thief inside a familiar home:

- sneak past Mom rather than fight her;
- inspect suspicious household objects;
- create harmless distractions;
- hide when a patrol gets too close;
- piece together recipe clues;
- solve the final recipe box;
- escape through the front door.

The tone is warm, mischievous, and affectionate rather than threatening.

## 3. Main character

**Name:** 라먀니

The supplied character reference is treated as the canonical visual direction:

- peach/orange hair;
- amber eyes;
- cream knit/cardigan silhouette;
- dark skirt;
- lollipop and crossed hair-pin accents;
- warm night-out color palette.

For gameplay readability, the in-game player is rendered as a small top-down SD/chibi figure. The title screen uses a simplified vector portrait based on the same identifiers, so the implementation does not depend on an external art pipeline.

## 4. Core loop

1. Leave 라먀니's room.
2. Explore the living room and kitchen.
3. Collect four glowing recipe clues.
4. Avoid Mom's vision cone and noise investigation.
5. Use hiding spots or activate household distractions.
6. Open the recipe box after all clues are found.
7. Answer three clue-based questions.
8. Escape through the front door with the recipe.

Being caught does not erase clues. The player is returned to the bedroom and the run records one catch. This keeps failure funny and fast instead of punishing.

## 5. Rules

### Movement

- **WASD / Arrow keys:** move.
- **Shift:** sneak. Movement is slower and almost silent.
- **E:** interact, investigate, hide, or leave a hiding place.
- **Tab:** open/close clue journal.
- **Esc:** close the recipe puzzle.

### Stealth

Mom has two detection systems:

- **Vision:** a directional cone with range and wall/furniture occlusion.
- **Hearing:** normal footsteps create periodic noise pulses. Sneaking reduces the noise radius dramatically.

The suspicion gauge rises while 라먀니 is visible. It decays when line of sight is broken. Reaching 100% suspicion, or physically colliding with Mom, counts as being caught.

### Mom AI

Mom cycles through:

- **Patrol:** fixed household route.
- **Investigate:** walks toward a noise source, then scans the area.
- **Alert:** moves toward the player's last/current visible position.

Harmless distractions can deliberately force the investigate state.

### Hiding

There are three hiding positions:

- bedroom wardrobe;
- living-room sofa;
- kitchen island.

While hidden, 라먀니 cannot move and cannot be visually detected. Pressing **E** exits the hiding place.

## 6. Recipe clues

The four in-game clues are:

1. **Calendar note:** soy sauce : water = 1 : 1.
2. **Fridge magnet note:** sweetness can include maesil syrup.
3. **Pantry note:** onion, green onion, garlic, and ginger are used for aroma.
4. **Secret drawer note:** first rest is 24 hours; remove crab, boil the soy mixture again, cool it completely, then perform a second rest.

These are game-fiction recipe notes, not a food-safety guarantee or a substitute for a tested culinary recipe.

## 7. Final puzzle

The recipe box asks three multiple-choice questions based entirely on the collected notes:

- base soy/water ratio;
- first resting time;
- the post-rest reboil/cool/second-rest step.

A wrong answer does not end the run, but adds a small amount of suspicion as a comic “click” penalty.

## 8. Ending and scoring

The run ends once the player reaches the front door with the recipe.

The game records:

- elapsed time;
- number of catches;
- rank.

Ranks are intentionally lightweight:

- **S — 게장 괴도:** no catches and under 4 minutes.
- **A — 새벽의 집게발:** at most one catch and under 7 minutes.
- **B — 무난한 절도(?)**: at most three catches.
- **C — 엄마가 다 알고 있었음:** anything messier.

The ending reveals that Mom likely knew what 라먀니 was doing and left a note suggesting they make the dish together next time.

## 9. Visual direction

The game uses a warm-night palette:

- deep mauve/charcoal rooms;
- cream UI;
- peach/orange 라먀니 accents;
- amber clue highlights;
- pale blue noise/distraction indicators;
- soft red suspicion feedback.

The entire world is visible in one 16:9 top-down scene. This avoids camera complexity and makes route planning immediately readable.

## 10. Technical implementation

The game is intentionally dependency-free:

- **HTML5 Canvas** for gameplay rendering;
- **plain JavaScript** for game loop and AI;
- **CSS** for UI overlays;
- **Web Audio API** for generated pickup/alert/success tones;
- **SVG** for the title portrait.

No asset server, package installation, or build step is required to play.

### Code structure

- `index.html` — application shell and overlays.
- `style.css` — all UI styling.
- `src/core.js` — pure geometry, collision, line-of-sight, vision, scoring helpers.
- `src/game.js` — game state, input, AI, rendering, interaction, puzzle, endings.
- `assets/ramyani.svg` — bundled character portrait.
- `tests/core.test.js` — deterministic core tests.
- `START_HOLYCRAB.bat` — Windows one-click launcher.

## 11. Windows target

Primary target: current Windows 10/11 with a modern Chromium/Edge/Firefox browser.

The simplest launch path is double-clicking `START_HOLYCRAB.bat`, which opens the local `index.html` in the default browser. The game does not require a network connection after the repository is downloaded.

## 12. Definition of done for v1.0

v1.0 is considered complete when:

- the title screen launches;
- player movement and sneaking work;
- collision prevents walking through walls/furniture;
- Mom patrol/investigate/alert AI works;
- vision is blocked by room geometry;
- hearing responds to movement noise;
- hiding works;
- four clues can be collected;
- the journal reflects collected clues;
- three distraction objects work with cooldowns;
- the recipe box puzzle is solvable;
- the exit is locked until recipe acquisition;
- the ending/rank screen works;
- restart works;
- core tests pass;
- Windows one-click launch works.

## 13. Optional post-v1 directions

These are intentionally outside the completed v1 scope:

- sprite-sheet animation and commissioned character art;
- voiced Mom/라먀니 dialogue;
- multiple house layouts;
- randomized clue placement;
- challenge modes;
- Steam/itch.io packaging through an optional desktop wrapper;
- save data and achievements.

The base game does not depend on any of these to be complete.
