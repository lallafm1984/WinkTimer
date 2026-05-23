# Focus Wink Product Design

## Purpose

Focus Wink is a hands-free focus timer controlled by gaze and wink gestures. The app should feel like a serious productivity timer first, with a memorable arcade ghost interaction layer that makes the gesture controls understandable and distinctive.

## Current Technical Baseline

The current Android prototype already supports the core detection loop:

- Front-camera detection through CameraX and ML Kit Face Detection.
- Looking at the screen pauses the timer.
- Looking away resumes the timer.
- One-eye wink hold for 3 seconds resets the active timer when both eyes are detectable and exactly one eye is closed.
- Head roll is accepted up to about 45 degrees.
- Standalone APK builds through `npm run apk:android`.

## Product Identity

Working name: **Focus Wink**

Product sentence:

> A retro arcade focus timer controlled by gaze and wink gestures.

Tone:

- 70% calm productivity tool.
- 30% playful wink interaction.
- The app should be cute, but not feel like a toy.
- Visual language should resemble a monochrome arcade console, score panel, or diagnostic HUD.

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

The mascot expression reflects detection state.

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

The app ships with three default modes. Each mode is a preset over the same gesture mapping system.

### 1. Look Pause

Default stable mode.

- Start: button
- Pause: look at screen
- Resume: look away
- Reset: wink hold

### 2. Wink Start

Hands-free mode for cooking, exercise, or situations where touching the phone is inconvenient.

- Start: wink hold
- Pause: look at screen
- Resume: look away
- Reset: wink hold

### 3. Wink Control

Experimental wink-first mode.

- Start: wink hold
- Pause/resume: single wink
- Reset: wink hold

`Single Wink` is included in development scope but should remain removable or hideable before launch if accuracy is not acceptable.

## Gesture Mapping

Users can freely map timer actions to gesture inputs.

Timer actions:

- Start
- Pause
- Resume
- Reset

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

Free mapping is powerful, so the app needs guardrails.

- Default presets must always be usable without configuration.
- If a mapping is ambiguous, show a warning before saving.
- If the same gesture is mapped to different actions, the UI must explain the state-based behavior.
- Single wink mappings should show a Beta label.
- Single wink can be hidden before release without affecting the rest of the app.
- Reset gestures should remain deliberate, preferably wink hold rather than single wink.

## App Menu Structure

### Timer

Main execution screen.

Must show:

- Large centisecond timer.
- Active mode name.
- Ghost expression state.
- Current gesture hint, such as `Look = Pause` or `Wink Hold = Reset`.
- Quick access to mode and mapping.

### Modes

Preset selector.

Includes:

- Look Pause
- Wink Start
- Wink Control

Each mode can be used as-is or customized.

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

- Focus duration.
- Look-paused duration.
- Reset count.
- Mode used.
- Optional future metric: wink interactions.

## Design System First

The next implementation phase should start with the visual system before expanding gesture mapping.

Reasoning:

- The app's differentiator is not only gesture logic, but the feeling of controlling a timer through a shy arcade ghost.
- The same mascot state component can later reflect actual detection states.
- A stable design system will reduce churn when adding modes, mapping, and calibration.

First build slice:

1. Ghost mascot component with expression states.
2. Arcade timer display with centiseconds.
3. Main timer screen restyle using Arcade Ghost Console theme.
4. Mode cards for the three presets.
5. Gesture mapping screen shell with static rows.

Functional mapping behavior can follow after the visual language is established.

## Open Product Decisions

These are intentionally deferred:

- Final app name in Korean.
- Whether `Single Wink` ships publicly.
- Exact single-wink accuracy threshold.
- Whether calibration is mandatory before enabling single wink.
- Final icon and store branding.

