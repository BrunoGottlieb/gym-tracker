# Gym Tracker

A personal, offline-first workout tracker with a light interface in Brazilian Portuguese. Built with React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), and a service worker.

## Extra series and rest vibration

Every exercise starts with three planned series. **+1** appends one uncompleted series to the current session only, preserving previous completion, load and timer. The added count survives reload and backup/restore, contributes to progress and remains in finished-session history. New sessions start from the usual three series. A horizontal series scroller keeps the page within the phone width, while the +1 button stays accessible; newly added series scroll into view. Session series are bounded at 100 per exercise for backup validation.

Adding a series while previewing a different workout uses the same explicit replacement confirmation as starting a series. Canceling leaves the original session untouched. Confirming adds the extra series to the new session without marking any series done or starting automatic rest.

Rest completion requests one 180 ms vibration independently of optional sound, guarded for unavailable or blocked browser APIs. Existing end-time deduplication avoids repeated pulses. Physical vibration depends on device/browser support and settings; a web timer cannot guarantee an alarm while the app is closed or suspended. Unsupported devices still get the on-screen completion notice.

## Browsing workouts while training

The app always opens on the workout grid, including after reload or restoring a backup with an active session. Opening a card only previews its routine: it does not create or replace a session. A sticky banner on other pages shows the active workout, completed-series count and a return action. The active session retains its load snapshots, marked series and rest timer while other routines are viewed.

Use **Iniciar treino**, or mark a series, to start a session. When another workout is active, the replacement confirmation appears only on these actions. Canceling preserves the original session. Confirming a series-triggered replacement starts the chosen workout and marks exactly that pending series, including automatic rest when enabled. Updating a remembered load in a different workout preview does not rewrite the active session's load snapshot, even for shared exercise IDs.

The framing fixes in `assets/lateral-raise-corrected.png`, `assets/reverse-fly-corrected.png` and `assets/bar-pushdown-corrected.png` replace `public/images/exercise-19.webp`, `exercise-20.webp` and `exercise-23.webp`. Each now has a complete subject with clean edges, also in zoom and history. They were edited with the built-in image generation tool.

Shared edit prompt (exercise name and subject substituted per image): “Edit this exercise illustration: [exercise name]. Correct the broken atlas crop: REMOVE the stray fragments from a different illustration at the BOTTOM edge. Reframe with the ENTIRE athlete, full head, both feet, both hands, relevant equipment and machine completely inside the picture with generous clean margins, nothing cut off at top or bottom. Subject: [subject]. Preserve the same single adult man, sage green tank top, dark green shorts, thin dark outlines, cream background and flat illustrated gym app style. No text, borders, diagrams, extra objects, duplicated body parts or fragments from other exercises. Keep its exercise unmistakable and make the corrected asset suitable for a rectangular app thumbnail.”

Exact substitutions: “Standing dumbbell lateral raise” / “man facing front, both arms out sideways at shoulder height holding one complete dumbbell in each hand, both feet visible”; “Seated reverse pec deck rear delt fly” / “rear three-quarter view of man seated facing the machine chest pad, arms out gripping the two machine handles, full machine and both feet visible”; “Standing straight bar cable triceps pushdown” / “side view of man facing a cable machine, upper arms beside torso, both hands holding a complete straight bar near hips, taut high-pulley cable attached to middle of bar, full body including both feet visible”.

## Included

- Five editable workouts seeded from the supplied routine.
- Local illustrated exercise library, bundled for offline access.
- One load per exercise, with independent set completion buttons on one row.
- Load memory between sessions, resumable active workout, progress and session history.
- Clickable exercise illustrations in the workout, progression and history, with an enlarged viewer and additional zoom. Workout covers always open the workout directly.
- Named primary muscle group badges, editable in each exercise.
- A weekly calendar on the home screen and monthly calendar in history show the actual workouts performed on each local date, with chest/back/legs/shoulders markers and clickable daily records. Suggested weekdays never restrict which workout can be completed.
- Load progression per exercise: current remembered load, last completed session, personal maximum, date-based graph and session list. Unperformed exercises are excluded from progression.
- Personal machine/bank setup notes in the illustration viewer, saved per exercise and included in backups.
- Rest timer with 60/90/120/180 second presets, pause, resume, restart, and +30 seconds. A timestamp is used so backgrounding or reloading does not reset the countdown.
- Optional automatic rest after completing a set and an optional sound when the open app notices the timer has ended.
- Editing workout names, weekdays, exercise order, targets, rest times, exercise type, muscle group and illustration. Every exercise starts with three series; extra series can be added within a session. New exercises can be added and removed.
- Versioned JSON backup export, strict validation, and confirmed replacement on import.
- Installable PWA, with local images and application assets cached after the first successful online visit.
- GitHub Actions workflow for free GitHub Pages hosting, including repository subdirectory paths.

Per-set weights and actual repetition entry are intentionally omitted in favor of the approved simplified design. Targets remain visible; timed calisthenics exercises show their target in seconds. Body measurements are outside this version. Progress graphs show recorded loads, not estimated strength or training recommendations.

## Development

No development software is required on the user's phone. Development/build commands can be run in GitHub Codespaces or another cloud environment. This checkout was built with the runtime already provided by Codex; no system-wide Node or editor installation is needed.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
```

Use Node 24 and pnpm 11. `pnpm-lock.yaml` pins the resolved dependency graph. Only the esbuild build script is allowed by `pnpm-workspace.yaml`.

`BASE_PATH` defaults to `/`. Set it to `/repository-name/` when building for a GitHub Pages project URL. Application images, service worker scope, manifest, icons, and generated assets use this base. The Pages workflow computes it automatically.

## GitHub Pages deployment

1. Put this project in a dedicated GitHub repository.
2. In **Settings → Pages**, choose **GitHub Actions** as the build/deployment source.
3. Push to `main` or `master`, or dispatch **Deploy Gym Tracker to GitHub Pages**.
4. Open the URL returned by the deployment. On Android Chrome, use **Install app** or **Add to Home screen**.

Repository: https://github.com/BrunoGottlieb/gym-tracker

Public application URL: https://brunogottlieb.github.io/gym-tracker/

The Pages workflow publishes the current `main` branch after its tests and build pass. No paid service, account system, or backend is used. Personal loads and session history stay in the device's IndexedDB and are not committed to the repository.

## Data and offline behavior

Data lives in IndexedDB under the origin of the installed app. New workouts begin with **0 kg**, since initial loads have not been supplied. Zero can also represent bodyweight with no additional load. The last entered load is reused the next time an exercise is opened. Completing a partial workout saves only the sets actually marked; unmarked sets stay visible as incomplete in history.

Writes are queued in order and persistence failures are displayed. The app keeps the in-memory state available for backup export when a write fails. Finishing a session preserves snapshots of exercise names and loads, so editing a routine later does not rewrite historical records.

Changing the hosting origin, clearing browser data, uninstalling in some browsers, or device storage pressure can remove access to local data. Export regular JSON backups from **Ajustes → Seus dados**. Import validates the full schema and asks before replacing existing records. A backup includes the current session and rest timer.

Service worker activation is offered as an explicit update. Offline assets become available after the worker finishes its first cache. Sound is optional and subject to browser policies; an OS notification or alarm while the app is closed is not guaranteed. Countdown timing is recomputed on reopening.

## Validation

`pnpm test` checks timer timestamps, completion/snapshot behavior, corrupt or incompatible backups, and IndexedDB persistence with fake-indexeddb. `pnpm build` typechecks and produces the production PWA.

`scripts/smoke-test.cjs` exercises the production app in a real browser: mobile layout, one load per exercise, completion persistence, reload, timer pause/resume, history, backup restoration and offline reload. It expects a preview at `http://127.0.0.1:4173` (override `APP_URL`) and an existing Playwright Chromium installation. `PLAYWRIGHT_MODULE` and `CHROME_PATH` can point to an already-provided runtime/browser, without installing a new browser.

## Illustrations

`assets/exercise-atlas.png` is the source illustration sheet generated with the built-in image generation tool for this project. `public/images/` contains the individual optimized WebP tiles. No remote images are needed at runtime. The illustrations are visual identifiers, not technical instruction for exercise execution.

Generation brief: “A six-column, five-row exercise illustration atlas, consistent sage green sportswear, cream background, thin charcoal outlines, one illustrated exercise per tile, no labels or photos; exercises in the same order as the seeded five-day routine.”

Source responsibilities: `data.ts` seeds editable routines; `domain.ts` handles validation, timing and session snapshots; `storage.ts` owns IndexedDB; `App.tsx` renders the application and queues state changes; `styles.css` controls the responsive light design.

## Version 1.1 updates

The corrected routine uses barbell incline bench press, pulley instead of pullups, chest-supported Hammer row, and a low-cable rope curl instead of dumbbell hammer curls. Tuesday and Friday pulley entries share a canonical exercise ID and remembered load. Replacing a distinct exercise does not import the old exercise's weight automatically. Archived exercise records remain browsable in **Evolução**.

Every current exercise has exactly three series, including custom exercises. An exercise row turns pale green as soon as all three are marked, and returns to normal when one is unmarked. A workout cover turns green and shows **Concluído** after a fully completed session is finalized on that local date; finishing a partial session does not mark the whole workout complete.

The chest day also includes **Supino articulado na máquina**, a seated chest press with independent machine levers. The leg day contains four leg exercises followed by **Abdominal no banco declinado** (head below feet, lying on the back) and **Abdominal militar (TAF)** (traditional bent-knee sit-up with feet on the floor). Stiff and hanging knee raises are removed from the current leg plan. Historical performed exercises and their recorded loads are retained.

The Thursday workout replaces the machine shoulder press with **Dips livres nas paralelas**. Dips are labeled as triceps, use three series, and store additional external load (0 kg means bodyweight alone). The old shoulder press load remains in storage and historical records; it is not copied to the dips load. The workout cover uses the new dips illustration.

Friday is now **Costas + bíceps**, with pulley, Hammer row, low cable row, straight-arm pulldown and two biceps exercises. Front lever and L-sit are removed from the current gym routine; no new home routine is created automatically. Historical calisthenics sessions remain available. Back exercises reused on different days share their existing load memory and progression.

The Friday cover intentionally uses the dips illustration, as requested, without adding dips to Friday's exercise list. In the shoulders/chest/triceps workout, dips and bar triceps pushdown are consecutive at the end, after the shoulder and chest movements. Existing active session logs are reordered by identity without changing load or completed-series data; historical session ordering is retained.

Primary muscle markers use custom local anatomical SVGs for chest, back, legs and shoulders, with the relevant muscle regions filled. The same markers are reused in exercise badges, the weekly strip, monthly calendar and legend. Text labels remain alongside the icons.

The home weekday is a suggestion only. Any selected workout can be completed on any day. Calendar records are derived from each saved session's actual local finish date and historical exercise snapshots, so editing the weekly plan does not move previous records. Multiple sessions on a date remain separately accessible. Completed whole-workout green states are independent of the suggested weekday. Partial sessions appear in the calendar with their actual completed set count.

`migrations.ts` upgrades existing installations and old version-1 backups without resetting loads or historical session snapshots. Known original entries are renamed; custom names remain untouched. Current plans and active sessions are normalized to three series; the past series counts in history remain unchanged. Already performed replaced exercises in an active session retain their snapshot, while unstarted removed exercises are replaced. New exercises are added to an ongoing matching session. The incline and Hammer corrections keep their existing identities because they clarify the exercise the user already intended. Tuesday and Friday Hammer rows share the same remembered load, notes and progression; the older Friday identifier remains readable.

`catalog.ts` supplies named muscle groups and the image catalog. `progression.ts` derives chronologically ordered session loads; `ProgressionView.tsx` draws the graph and current load library. A current load is saved immediately, even when that session has not been completed. Historical graph points are added only when a session is finished with at least one completed series for that exercise.

Additional local illustration sources: `assets/incline-barbell.png`, `assets/hammer-row.png`, `assets/rope-curl.png`. Optimized, offline-cached versions are `public/images/exercise-30.webp`, `exercise-31.webp`, and `exercise-32.webp`.

Further local sources: `assets/articulated-chest-press.png`, `assets/decline-situp.png`, `assets/military-situp.png`, optimized to `public/images/exercise-33.webp`, `exercise-34.webp`, and `exercise-35.webp`.

`assets/parallel-bar-dips.png` is optimized to `public/images/exercise-36.webp`. Prompt: “Free bodyweight triceps dips, adult athlete in sage sportswear supported on two simple parallel bars, near-upright torso, elbows around 90 degrees, knees bent behind with feet off the floor, complete station visible, flat illustration with cream background, no labels or photos.”

The incomplete preacher-curl bar illustration was replaced in `public/images/exercise-10.webp`, so the correction also appears when viewing previous session images. Source: `assets/preacher-curl-corrected.png`. Built-in image editing prompt: “Front three-quarter preacher curl, both upper arms on the pad, complete symmetrical EZ bar centered in both hands, both ends fully visible with matching round weight plates on the left and right, preserve the sage/cream flat illustration style.”

These illustrations were made with the built-in image generation tool. Shared prompt: “One full-body flat editorial fitness illustration matching the original sage sportswear, charcoal equipment and cream backdrop, thin outlines, no text or photographs, all equipment in frame.” Individual prompts: “Incline free-barbell bench press, visible 30-degree backrest and barbell rack”; “Seated plate-loaded Hammer row with chest supported and elbows drawn backward”; “Standing low-cable rope biceps curl at a crossover station, cable rising from floor to hands.”

## Navigation and illustration corrections (routine revision 10)

The **Treinos** navigation button always opens the home workout grid, including when a session is active. The resume banner returns to that session with its loads and marked series intact.

Workout A replaces articulated chest press with parallel-bar dips, after the voador and immediately before the two cable triceps exercises. It still has six exercises of three series. Dips share remembered additional load with workout D, and never inherit the machine chest-press load. History is preserved. A machine press already performed in the active session retains its snapshot; the replacement applies fully to the next session. The wider routine proposal discussed in chat is not applied.

The known overhead cable extension name is now **Tríceps francês na polia**. Its identity, remembered load and personal notes are unchanged; custom names and historical text remain intact.

Corrected local source assets, edited with the built-in image generation tool, are `assets/french-triceps-corrected.png` and `assets/calf-raise-cleaned.png`. The optimized app assets replace `public/images/exercise-4.webp` and `public/images/exercise-16.webp`, respectively, so old sessions also display the corrected artwork. Images are cached offline with revised precache fingerprints.

French triceps edit prompt: “Edit target: the attached exercise illustration. Create a corrected flat gym exercise illustration matching its cream background, sage tank top, dark green shorts, fine dark outlines. Show a clear full body SIDE PROFILE of an adult male performing standing rope overhead cable triceps extension (French press on cable), facing RIGHT into empty space, with the cable machine BEHIND his back on the LEFT. His face and eyes point to the RIGHT, away from the machine. Low pulley behind him at shin height; taut cable runs diagonally upward behind his back to the rope ends held just BEHIND his head. Both upper arms point upward beside ears, elbows bent, hands gripping both ends of one rope. Split stance, stable torso. Complete feet, head, hands, cable path and compact weight stack visible with generous margins. No cable crossing through body. Anatomically coherent two arms and two hands. No text, arrows, labels, borders, artifacts or other exercises. Keep the established simple illustrated app style, no photo.”

Calf illustration edit prompt: “Precise object removal edit of this seated calf raise gym illustration. Remove ONLY the stray black marks / cropped fragments along the TOP edge above the man's head and the stray fragments at the bottom border, replacing these with the same smooth pale cream background. Preserve the seated man, exact pose, sage clothes, complete seated calf raise machine with thigh pads and weights, outlines, shadows, framing, colors and style. Do not add text or objects. Keep the entire image otherwise identical.”

Additional prompts: “Seated articulated chest press, pushing two independent machine handles forward at chest height”; “Supine decline-bench abdominal sit-up with feet secured at the high end and head at the low end”; “Traditional military sit-up, feet planted, knees bent, arms across chest, torso lifting toward knees.”
