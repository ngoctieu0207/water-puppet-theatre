# Hý Thủy: development notes

An interactive 3D water puppet theatre inspired by Vietnamese múa rối nước. It has six puppets: Cậu Bé, Cô Bé, Ông Đồ, Rồng, Phượng Hoàng and Rùa Vàng. There are two ways to perform:
- **Be the puppeteer**: control one puppet with the keyboard.
- **Tell a story**: type a script and the puppets act it out.

English is the main language of the interface, with Vietnamese names and terms as subtitles.

## Story mode (js/story/story.js)
No AI service is involved. Each sentence is scanned with a hand-made English and Vietnamese dictionary of character names and action words; Vietnamese typed without diacritics also works. Each sentence becomes one scene:
- The characters named before the first action word perform those actions in order. With no name, the previous characters carry on, and words like "everyone" or "tất cả" select the whole cast.
- **Interaction**: a character named after the action is the target ("the girl splashes the boy"). The actor swims over, stops about 1.5 m away, turns to face the target, acts, then turns back to the audience.
  - "Fight", "duel" and "tỉ thí" bring two characters face to face for a contest.
  - This is steered live from the puppets' real positions. Since a puppet keeps gliding on the water, it lets go early, allowing for that glide.
- Clauses are split at commas and linking words (then / but / rồi / nhưng), and negations are understood ("không múa" means no dancing). Pronouns ("they", "họ") refer back to the previous characters.
- Before a "show" action, the performers line up at centre stage, 2.8 m apart (3.4 m for a fight). The row slides sideways if someone else is already standing there, and characters swerve around anyone in their path.
- Story-only acting moves live in `js/puppets/emotes.js`, so any puppet can play them:
  - hold hands → the pair moves together
  - forbid / scold
  - love → floating hearts
  - sad, laugh
  - ride → sit on the dragon, turtle or phoenix
  - fly to the sky → flies up and out of sight, carrying any rider
- Every step becomes the same input bitmasks the keyboard produces, so scripted puppets move exactly as a player would move them.
- Characters start hidden under the water and rise the first time the story names them.
- The music follows the mood of the words:
  - fight / tỉ thí → battle
  - night / moon / sad → night
  - festival / dance / happy → festival
  - anything else → calm
- No captions are shown, so the stage stays clear.
- Behind the menus, a short built-in story plays silently.

## Music (js/core/audio.js)
Four original folk-style pieces, generated live with Web Audio:
- **Ao Làng / Village Pond** (80 bpm): đàn bầu lead, used behind the menus.
- **Hội Làng / Village Festival** (112 bpm): sáo lead with lots of mõ, used in free play.
- **Tỉ Thí / The Contest** (138 bpm): war-drum rolls, cymbal crashes, tremolo strings, on an A-centred pentatonic scale.
- **Đêm Trăng / Moonlit Night** (64 bpm): slow đàn bầu with a gong.

Tracks cross-fade when the mode or story mood changes.

## Run locally
ES modules need a local web server (opening `index.html` as a file will not work):

```
npx serve .            # or: python -m http.server 8000
```

Three.js r169 loads from the jsDelivr CDN through an import map, so there is no build step. To deploy, push the folder to GitHub Pages, Netlify or Vercel as a static site.

## Flow
Short intro page ("What is it?" and "Where does it come from?") → "Enter the theatre" → choose a mode:
- **Be the puppeteer**: choose 1 of 6 puppets → hands-on tutorial (skippable) → free performance.
- **Tell a story**: type or pick an example → Perform (or Ctrl+Enter) → end screen.

On-screen buttons: Reset, Sound on/off, Pause. Esc also pauses.

## Structure
| File | Role |
|---|---|
| `js/main.js` | Renderer, fixed-step loop, camera, screens, sound wiring |
| `js/scene/stage.js` | Pavilion (thủy đình), blind, side wings, musician platforms, flags, lights |
| `js/scene/water.js` | Height-field wave simulation + reflective water shader |
| `js/scene/effects.js` | Splash particle pool |
| `js/scene/textures.js` | Procedural canvas textures |
| `js/puppets/children.js` | Boy and girl: shared articulated body, separate costumes, movement styles and signature moves |
| `js/puppets/pose.js` | Pose format + blending helpers |
| `js/puppets/registry.js` | Puppet list (extension point) |
| `js/core/controller.js` | Deterministic movement/action logic at 60 Hz |
| `js/core/input.js` | Keyboard → bitmask |
| `js/core/audio.js` | Generated folk-style music + water sound effects |
| `js/ui/tutorial.js` | Learn-by-doing tutorial |

## Technical exploration and decisions
- **Water**: a 200×120 height-field runs the discrete wave equation on the CPU. Each frame it is uploaded as a half-float texture that displaces the water mesh, and its normals bend a planar reflection (`Reflector`) plus specular glints from the stage lights.
- **Puppets**: built from primitives in a joint hierarchy rather than skinned GLBs. There is no asset licensing, and rigid jointed parts suit wooden puppets.
- **Two movement styles**: each child has its own idle/locomotion layer. The boy bounces, stomps and swings his arms wide. The girl sways, keeps her hands folded, and opens her arms like wings when she glides. They also have different waves, jumps and signature moves:
  - Boy: belly-laugh water slap.
  - Girl: water toss and twirl.
- **Water play**: signature moves emit splashes at set moments, which feed the particles, the ripple simulation and the splash sound.
- **Music**: an original tune composed for this project on the five-note scale C D F G A, scheduled live with Web Audio:
  - lead: đàn bầu-like voice that slides into each note and gains vibrato as it is held
  - accompaniment: đàn tranh-like plucked arpeggios
  - percussion: mõ, song lang and trống
  - a generated reverb for the theatre space
- **Sound effects**: only water sounds:
  - splash on jump, landing and water play
  - plunge with bubbles when the puppet goes under
  - water pouring off when it comes back up
  - a continuous swirl whose loudness follows how fast the puppet spins in the water

## Known limitations
- The water is opaque and murky, so there is no refraction. This fits the art form, where the water hides the mechanism.
- Reflections are planar, distorted only by the ripple normals.
- No puppeteer rods or strings are modelled.
- Desktop/keyboard only.
- Sound starts after the first click or key press, because of browser autoplay rules.
- If the browser tab is hidden, the game pauses.

## Cultural notes (for the report, not shown on the site)
The intro text makes only general claims: Red River Delta village origin, the thủy đình and bamboo blind, puppeteers standing in water using rods and strings under the surface, lacquered wooden puppets, and scenes from village life with live folk music. Check them against the Thang Long Water Puppet Theatre, the Vietnam Museum of Ethnology and Encyclopaedia Britannica ("water puppetry"). The movements, signature moves and music are our own interpretation, not traditional repertoire.

Libraries and fonts: Three.js (MIT), Be Vietnam Pro and Noto Serif (SIL OFL). All models, textures, music and sounds are generated in code.
