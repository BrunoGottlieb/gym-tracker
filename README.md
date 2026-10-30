# Gym Tracker

A personal, offline-first workout tracker with a light interface in Brazilian Portuguese. Built with React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), and a service worker.

## Ivan and Sunday-first calendars

The saved plan keys remain `original` and `sheet`; only their visible labels change to **Bruno** and **Nick**, preserving installed users' current selection and customized routines. The additive `ivan` plan contains Push Monday, Pull Tuesday, Legs Wednesday, Upper Friday and Lower Saturday. Thursday and Sunday are suggested rest days; browsing and recording any workout remains unrestricted.

Ivan's per-exercise counts are preserved exactly, giving totals **19/19/18/21/21**; the supplied Legs total of 16 and Lower total of 18 disagree with their itemized series. Repetition targets are 12. Confirmed: “flexora / stiff” uses flexora with stiff as an explicit alternative, Upper's unilateral cable raise is lateral, and plank uses 60 seconds. Roman chair is represented as lumbar extension. An idempotent correction upgrades only the identifiable provisional 30-second plank default in installed Ivan routines/saved configurations and unstarted active entries; customized targets, completed entries and history remain intact. Rest defaults to an editable 90 seconds because none was supplied. These assumptions do not modify Bruno or Nick.

The catalog adds missing entries, reuses existing matching images for machine chest/shoulder presses, machine row, hammer curl and stiff, and adds seven independent built-in generated illustrations (58–64) for machine triceps, cable lateral raise, hip thrust, Roman chair extension, conventional deadlift, Smith squat and hip abduction. Original PNGs and exact prompts are in `assets/ivan-catalog/`; optimized WebP files are precached offline.

Both the home weekly strip and monthly history calendar start Sunday. The weekly completed total uses the same Sunday-to-Sunday local date range. `scripts/ivan-smoke.cjs` verifies an actual Sunday/month boundary, exclusion of the previous Saturday, exact series/schedule, original-plan preservation, edited-plan recovery, offline exercise images and phone widths.

## Local choice of training sheet

**Ajustes → Escolher ficha de treino** offers **Bruno** (the existing configuration, unchanged and selected by default), **Nick** (five routines transcribed from the supplied sheet) and **Ivan** (the supplied Push/Pull/Legs/Upper/Lower plan). There are no accounts or shared server records: each device/browser chooses independently and keeps its own loads and history. This is a routine selector for separate devices, not multiple isolated people on one device. Loads, notes and history remain on that device when switching sheets.

Choosing a different sheet requires confirmation and is blocked while a session is active. `src/routinePlans.ts` saves the current workout configuration before switching; returning restores its customized names, order, exercises and targets. The first switch never reseeds an existing user's routine. The selected sheet and saved configurations are included in JSON backups, validated on import and retained in IndexedDB/offline.

The photographed sheet has 8/9/8/7/8 exercises in A/B/C/D/E, with the printed 3/4 series, repetition pyramids, MAX, drop sets, 45-second rest, bi-set/tri-set descriptions and timed holds. Combinations are shown as instructions; the timer is still operated per exercise. The photo does not specify the machine model for “Remada no aparelho”, so that entry has a generic existing illustration and an explicit editable note. Weekdays are editable suggestions. No personal names, registration details or photograph are bundled. Sheet exercises preserve and allow editing their planned series; the original routine still starts each exercise at three.

`node scripts/plans-smoke.cjs` checks two isolated browser contexts, unchanged original routines and loads, sheet confirmation/cancellation, prescribed series, edited configurations, blocked switching during training, history, reload, narrow layouts and offline illustrations. Use the same environment settings as the main smoke checks.

## Searchable exercise catalog

The workout editor has an alphabetical preset catalog with name, illustration, primary muscle, three initial sets, target, repetition/time type and rest. Search ignores accents/case and also matches muscle labels and common aliases from the training sheet. Select a preset to add it or replace an existing exercise, then adjust any details before saving. Exercises already in the draft are disabled to prevent duplicate identities. Custom exercises and a separately alphabetized illustration selector remain available.

`src/exerciseLibrary.ts` is bundled static catalog data. Catalog expansion does not migrate or modify existing routines, loads, active sessions, notes or history. Selection changes only the editor draft until Save; Cancel discards all draft changes. New variants have distinct IDs so machine Scott, barbell Scott, seated/lying curls and calf variations do not share progression accidentally. The full catalog and illustrations are available offline after the updated service worker is installed.

The additions include all missing variants identified from the supplied training sheet, reusing the existing pull-up and articulated chest-press illustrations and adding 21 distinct illustrations (`exercise-37.webp` through `exercise-57.webp`). Source images and exact prompts are in `assets/exercise-catalog/`. The supplied personal training-sheet photograph is excluded from version control and deployment.

Catalog browser checks: `node scripts/catalog-smoke.cjs` using the same `PLAYWRIGHT_MODULE`, `CHROME_PATH` and `APP_URL` settings as the main smoke checks. Covers search, alphabetical order, full metadata, duplicate prevention, cancellation, replacement, saving, unchanged routines/loads/history, narrow screens and offline images.

## Light blue interface

Series completion is cumulative: tapping an uncompleted series marks it and every preceding series complete, for any session count. Tapping a completed series unmarks only that series, allowing corrections. This applies both to an ongoing workout and to the first series action that starts or confirms replacing a session. Batch completion triggers automatic rest once, and existing historical records are not rewritten.

The interface follows the approved minimalist mockup: an almost-white canvas, navy typography, blue primary actions, soft white workout tiles and coral/mint/yellow/lilac identity badges. The weekly blue panel derives its completed-session count from actual local-week history and retains the existing date buttons and muscle markers; no demonstration statistics are shown. Completed exercises and workout tiles remain pale green.

`src/theme.css` applies the shared visual system across training, progression, calendar, settings and dialogs without changing stored routines or data. Exercise illustrations, enlarged viewing, series adjustment, active-session browsing, rest controls and offline behavior remain available. The web page and installable app manifest share the new blue theme color.

## Extra series and rest vibration

**−1** and **+1** are grouped below the horizontally scrolling series buttons, with 44 px touch targets so the controls remain accessible on narrow phones. −1 removes the last uncompleted series only, never a completed entry, and leaves at least one series. Unmark a completed series before removing it. The session may have fewer than the default three series; its count survives reload, backups and history while the next session still starts at three. Removing a series while browsing a different workout uses the existing confirmation before replacing the active session.

Every exercise starts with three planned series. **+1** appends one uncompleted series to the current session only, preserving previous completion, load and timer. The added count survives reload and backup/restore, contributes to progress and remains in finished-session history. New sessions start from the usual three series. A horizontal series scroller keeps the page within the phone width, while the +1 button stays accessible; newly added series scroll into view. Session series are bounded at 100 per exercise for backup validation.

Adding a series while previewing a different workout uses the same explicit replacement confirmation as starting a series. Canceling leaves the original session untouched. Confirming adds the extra series to the new session without marking any series done or starting automatic rest.

Rest completion requests one 180 ms vibration independently of optional sound, guarded for unavailable or blocked browser APIs. Existing end-time deduplication avoids repeated pulses. Physical vibration depends on device/browser support and settings; a web timer cannot guarantee an alarm while the app is closed or suspended. Unsupported devices still get the on-screen completion notice.

## Browsing workouts while training

The app always opens on the workout grid, including after reload or restoring a backup with an active session. Opening a card only previews its routine: it does not create or replace a session. A sticky banner on other pages shows the active workout, completed-series count and a return action. The active session retains its load snapshots, marked series and rest timer while other routines are viewed.

Use **Iniciar treino**, or mark a series, to start a session. When another workout is active, the replacement confirmation appears only on these actions. Canceling preserves the original session. Confirming a series-triggered replacement starts the chosen workout and marks that pending series and all preceding series, including automatic rest when enabled. Updating a remembered load in a different workout preview does not rewrite the active session's load snapshot, even for shared exercise IDs.

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

## Approved application icon

Option A (white geometric dumbbell with mint accent on blue) is the installed PWA, browser tab and Apple home-screen icon. The approved source is `assets/app-icon-source.png`; its built-in image generation prompt is `assets/app-icon-prompt.txt`. PNG exports are 192/512 px for the manifest, 180 px for Apple and 32 px for the favicon. Versioned icon filenames make the artwork change discoverable by browser/launcher caches. No training data or application behavior changes.

## Seated leg curl illustration correction

`public/images/exercise-14.webp` now depicts a seated hamstring curl in side view: lap restraint above the thighs, legs extended forward in the starting position, with posterior calf/Achilles resting on top of the moving ankle roller. This replaces the ambiguous extension-like illustration for all existing references, including Ivan Legs/Lower and the catalog, without modifying exercise identities, series, loads, active sessions or history. Built-in generated source and final correction prompt: `assets/seated-leg-curl-straight.png` and `assets/seated-leg-curl-straight-prompt.txt` (earlier bent-knee artwork is retained as a source variant).

## Automatic completion prompt

Marking the last outstanding series opens the existing finish confirmation automatically when all exercises are complete, including cumulative taps, extra series, a one-series routine started by its first tap, and an explicitly confirmed session switch. Removing the final unfinished extra series also opens it. The session is saved to history only after **Salvar e finalizar**. Dismissing/continuing does not repeatedly reopen the dialog on timer ticks, load edits, navigation or reload; making the routine incomplete and completing it again can prompt again. Hydration and backup restoration do not trigger this prompt. `scripts/auto-finish-smoke.cjs` verifies these transitions in Chrome.

## Editing recorded sessions and Bruno Wednesday machines

Open a completed/partial record from History, calendar or progression and choose **Editar este treino**. The draft supports workout/exercise names, start/end local date and time, snapshot loads and targets, cumulative series completion, 1–100 series per exercise, and adding/replacing/removing exercises through the predefined catalog. Save validates the historical snapshot, retains session/workout identity, sorts history by corrected finish time and updates progression and calendar from the revised record. Cancel discards the draft. The current workout plans, remembered loads and ongoing session are kept unchanged. Dates retain their original seconds when their displayed minute inputs were not edited. A saved record must contain at least one completed series. Backups include the corrected history; this works offline.

Bruno's Wednesday routine now has six leg exercises. The default decline and military sit-ups are replaced by **Leg press horizontal com banco móvel** (fixed vertical footplate, moving seat) and **Agachamento no squat articulado** (pivoting lever with shoulder pads, distinct from sliding hack squat), each initially three series of 8–12. Both new exercises are also in the alphabetic catalog with distinct load identities and new images 65/66. The idempotent upgrade also updates an inactive saved Bruno plan; Nick/Ivan plans and active/finished session snapshots are preserved. The abdominals remain in the catalog. Only the known default name “Pernas + abdômen” changes to “Pernas”.

Source PNGs and built-in image generation prompts are in `assets/leg-machines/`. Unit checks cover record identity/validation, load isolation, progression/date corrections, backups and preservation during the Bruno migration. `scripts/history-edit-smoke.cjs` exercises cancellation, validation, editing, catalog selection, reload, calendar/progression updates, offline saving, image loading and 320/390/1280 px layouts.

## Clear cable movement illustrations and Friday Scott

The images for straight-arm pulldown (9) and bar triceps pushdown (23) show distinct starting poses and blue movement arrows. Pulldown reaches forward with nearly straight elbows and a shoulder-centered sweep toward the thighs; pushdown keeps upper arms near the torso and bends the elbows before extending the forearms downward. New built-in edited PNG sources and exact prompts are in `assets/pulley-movements/`; the existing WebP image indices are retained so all exercise/history references and offline caches receive the clearer artwork.

Bruno Friday replaces incline dumbbell curls with the same bar/EZ-bar Scott exercise used Tuesday (`preacher-curl`, image 10), and its cover is now Scott. The existing Scott load is shared, never copied from incline curls. Retired incline curls remain selectable in the catalog and archived history. A one-time `brunoFridayRevision: 1` upgrade also covers saved inactive Bruno routines, avoids duplicate Scott entries, preserves active/finished session snapshots and all stored loads, and leaves Nick/Ivan routines untouched. Subsequent custom cover edits are not overwritten.

`src/fridayUpdate.test.ts` verifies default/reloaded/saved-plan migrations, load identities, duplicates and preservation. `scripts/friday-scott-smoke.cjs` verifies installation upgrades from a legacy backup, correct cover/exercise/load, intact active and historical snapshots, image zoom and offline access.

## Weekly muscle overview and actual completed-series chart

Below the home workout grid, **Sua semana por grupo muscular** counts primary-muscle exercise appearances across every workout in the current plan. Repeated exercises on different workout days count each time; this is an exercise count, independent of planned/completed series. Existing anatomical icons are reused. All seven named groups are shown, including zeroes; custom/unknown exercises add an Other group when needed. Counts react to plan changes and edits.

Below the history calendar, **Séries realizadas por dia da semana** stacks actual completed-series averages by primary muscle, Sunday through Saturday, across the entire saved history. Only true `done` entries count, including extra series and partial sessions. The denominator is the number of distinct recorded local calendar dates for that weekday, not sessions, calendar weeks or scheduled workout days. Multiple sessions on the same date are summed first. Each group's sum is divided by the same weekday date count, including zeroes when that group wasn't performed on a recorded date. Days without records are excluded and displayed as dashes. Active/unfinished sessions are excluded. An explicitly recorded zero-series day counts as a zero observation. Historical snapshot muscle metadata is used; current plan edits cannot reclassify past sessions.

Tap/click or keyboard-activate a weekday bar to see total mean, each muscle's mean and the recorded-date sample size. Colors match the new home summary, with a labeled icon legend. Historical edits recalculate values and move observations between weekdays when finish dates change. These are read-only derived views; no database schema, workout, weight, timer or history changes are introduced. Calculations are memoized on plan/history references to avoid rescanning on rest timer ticks. Empty history, narrow phones, desktop and offline loading are supported.

Implementation: `src/trainingStats.ts`, `src/TrainingOverview.tsx`. Unit checks cover repeat exercise counts, completed flags, sample denominators, multiple sessions per date, snapshots, empty/zero records, immutability and historical corrections. `scripts/training-stats-smoke.cjs` checks placement, icons, means/segments/colors, details, live edits, saved-data preservation, 320–1280 px layouts and offline reload.
