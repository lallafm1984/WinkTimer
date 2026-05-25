# Wink Timer Product Design

## Purpose

Wink Timer is a general-purpose timer app with optional camera and sensor control modes. The product must feel like a reliable normal timer first, then become distinctive through look, wink, and flip controls.

This app is not a focus-only timer. Focus, study, cooking, exercise, accessibility, and hands-free timing are use cases. The product category remains a timer.

## Current Technical Baseline

The current Android prototype already supports the core detection loop:

- Front-camera detection through CameraX and ML Kit Face Detection.
- Looking at the screen can pause the timer in LOOK PAUSE mode.
- Looking away can resume the timer in LOOK PAUSE mode.
- One-eye wink detection can trigger configured timer actions when both eyes are detectable and exactly one eye is closed.
- Device posture detection supports FLIP TIMER behavior.
- Head roll is accepted up to about 45 degrees.
- Standalone APK builds through `npm run apk:android`.

## Product Identity

App name: **Wink Timer**

Product sentence:

> A normal timer with look, wink, and flip controls.

Positioning:

- 70% practical timer utility.
- 30% playful camera/sensor interaction.
- The app should be cute, but not feel like a toy.
- The default experience should be understandable even if the user never enables the camera.
- Camera features are the differentiator, not the entire category.

Non-goal:

- Do not describe the whole app as a focus timer or concentration timer.
- Do not make focus/study the only primary use case.
- Do not require camera permission for BASIC TIMER.

## Visual Theme

Theme name: **Arcade Ghost Console**

Core elements:

- Monochrome white, gray, and black palette.
- Minimal accent color for warnings, progress, and beta labels.
- Pixel/arcade HUD details: thin frame lines, scan labels, small status modules, score-like timer display.
- Ghost mascot as a state indicator, not a decorative mascot only.

Reference direction:

- A soft ghost-like character with a dark face panel.
- Rounded rectangular eyes and tiny mouth.
- Expressions are shown by changing eyes, mouth, sweat pixels, and progress indicators.

Important rule:

Text expressions such as `^_^`, `>_^`, `^_<`, and `^_^;` are internal expression aliases only. The actual UI should show the ghost character making those expressions, not render those strings as text.

## Expression System

The mascot expression reflects timer and detection state.

| State | Internal Alias | UI Expression |
| --- | --- | --- |
| Ready / idle | `^_^` | Default calm ghost face with two small open eyes |
| Looking / paused | `^_^;` | Shy ghost expression with softened eyes and a small sweat pixel |
| Left wink | `>_^` | Ghost closes its left eye, right eye open |
| Right wink | `^_<` | Ghost closes its right eye, left eye open |
| Wink hold charging | directional wink | Same wink face plus a hold progress gauge |
| Reset completed | reset blink | Short arcade flash or glitch animation |

## Time Display

Timer display should include two digits below seconds:

- Format: `MM:SS.CS`
- Example: `24:18.42`
- `CS` means centiseconds, 1/100 second.

The centisecond display reinforces the arcade score/timer feel and makes gesture response feel precise.

## Main Modes

The app ships as a normal timer with optional enhanced modes. Each mode is a preset over the same timer action system.

### 1. BASIC TIMER

Default baseline mode.

- Start: button
- Pause: button
- Resume: button
- Reset: button
- Lap: button
- Camera: not required

This mode must remain usable without camera permission and without premium camera features.

### 2. LOOK PAUSE

Camera-assisted mode.

- Start: button
- Pause: look at screen
- Resume: look away
- Reset: button or deliberate wink-hold if enabled
- Camera: required

### 3. WINK CONTROL

Camera-assisted hands-free mode.

- Start: wink or button, depending on preset
- Pause/resume: wink gesture
- Reset: deliberate wink hold or button
- Lap: wink gesture if enabled
- Camera: required

Single wink behavior is useful but accuracy-sensitive. It should remain hideable or beta-labeled before public launch if validation is not acceptable.

### 4. FLIP TIMER

Sensor-assisted mode.

- Start: device face down
- Pause: device face up
- Resume: device face down
- Reset: button
- Camera: not required

## Gesture Mapping

Users may eventually customize timer actions, but the default product should not depend on advanced mapping.

Timer actions:

- Start
- Pause
- Resume
- Reset
- Lap

Gesture inputs:

- Button
- Look
- Look away
- Left wink hold
- Right wink hold
- Any-eye wink hold
- Left single wink
- Right single wink
- Any-eye single wink
- Device face down
- Device face up

Wink hold options:

- Duration configurable in seconds.
- Suggested range: 1.0s to 5.0s.
- Suggested default: 3.0s.
- Eye side: left, right, or any.

Single wink options:

- Eye side: left, right, or any.
- Marked as Beta until accuracy is validated.
- Should be controllable by feature flag or app-level setting before launch.

## Safety Rules

Camera and gesture control are powerful, so the app needs guardrails.

- BASIC TIMER must always work without camera permission.
- Default presets must always be usable without configuration.
- If a mapping is ambiguous, show a warning before saving.
- If the same gesture is mapped to different actions, the UI must explain the state-based behavior.
- Single wink mappings should show a Beta label.
- Single wink can be hidden before release without affecting BASIC TIMER, LOOK PAUSE, or FLIP TIMER.
- Reset gestures should remain deliberate, preferably wink hold or button rather than single wink.

## App Menu Structure

### Timer

Main execution screen.

Must show:

- Large centisecond timer.
- Active mode name.
- Ghost expression state.
- Current action hint, such as `Button = Start`, `Look = Pause`, or `Wink = Lap`.
- Quick access to mode selection.

### Modes

Preset selector.

Includes:

- BASIC TIMER
- LOOK PAUSE
- WINK CONTROL
- FLIP TIMER

Each mode can be used as-is. Custom mapping may be added later, but it is not required for the baseline product.

### Gesture Mapping

Advanced configuration screen.

Includes:

- Action-to-gesture mapping rows.
- Wink hold duration control.
- Eye-side selector.
- Beta labels for single wink.
- Conflict warnings.

### Calibration

Gesture confidence and reliability test area.

Includes:

- Face detected / not detected.
- Looking / not looking.
- Left wink / right wink / both closed.
- Wink hold timer preview.
- Single wink test count and success rate.

### History

Session record screen.

Tracks:

- Timer duration.
- Look-paused duration when LOOK PAUSE is used.
- Reset count.
- Lap records when available.
- Mode used.
- Optional future metric: wink interactions.

## Monetization Implication

The free baseline should be BASIC TIMER. Premium or rewarded-ad access should be attached to optional advanced modes and comfort features:

- LOOK PAUSE
- WINK CONTROL
- FLIP TIMER if chosen as premium
- Advanced calibration
- Custom gesture mapping
- Ad removal

The paid value proposition should be "unlock enhanced timer controls and remove ads," not only "remove ads."

## Design System First

The visual system remains useful because it makes camera/sensor state readable and memorable.

Reasoning:

- The app's differentiator is not only gesture logic, but the feeling of controlling a normal timer through look, wink, and flip interactions.
- The same mascot state component can reflect actual detection states.
- A stable design system will reduce churn when adding modes, mapping, and calibration.

First build slice:

1. Ghost mascot component with expression states.
2. Arcade timer display with centiseconds.
3. Main timer screen restyle using Arcade Ghost Console theme.
4. Mode cards for BASIC TIMER, LOOK PAUSE, WINK CONTROL, and FLIP TIMER.
5. Gesture mapping screen shell with static rows.

Functional mapping behavior can follow after the visual language is established.

## Open Product Decisions

These are intentionally deferred:

- Whether `Single Wink` ships publicly.
- Exact single-wink accuracy threshold.
- Whether calibration is mandatory before enabling single wink.
- Final icon and store branding.
- Final monetization split between rewarded ads, one-time purchase, and possible subscription.
