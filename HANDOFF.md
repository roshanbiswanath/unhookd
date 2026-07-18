# Unhookd Handoff

Updated: 2026-07-18

## Product

Unhookd is a responsive PWA for reducing unwanted digital habits. A user can discuss their habits or upload Digital Wellbeing screenshots, select hooks and support windows, receive a neutral nudge, complete a short real-world activity, and record the outcome.

The core pitch is:

> Unhookd discovers the apps that pull you in, lets you choose when you want support, and turns those moments into AI-guided real-world actions.

V1 is intentionally focused on digital habits. It does not diagnose or treat addiction.

## Implemented

- TypeScript, React, Vite, Fastify, and MongoDB Atlas persistence.
- Clerk email/password integration boundary.
- Shared Zod contracts for drafts, usage candidates, activities, progress, notifications, and outcomes.
- MongoDB collections and startup indexes for user data, drafts, hooks, windows, sessions, progress events, protected windows, push subscriptions, and deliveries.
- Authenticated Fastify routes for onboarding, screenshot extraction, activation, dashboard, activity sessions, progress, push subscriptions, and data deletion.
- OpenAI service for multimodal screenshot extraction, conversational onboarding, and activity contracts.
- Gemini service that creates restricted Live API ephemeral tokens and configures a cumulative progress tool.
- Dual Conversation / My Plan onboarding interface.
- Screenshot upload support for up to six images, validated and normalized in memory.
- Today, Progress, Plan, Settings, and camera-first Live session React pages.
- Manual fallback for denied camera or failed Gemini Live connection.
- Browser service worker and Web Push API surface.
- Initial README with setup, security, challenge alignment, and demo flow.
- Public landing page at `/` that opens Clerk only after an explicit visitor action.
- `npm run typecheck` currently passes.

## Current Files

```text
src/client/                 React application
src/server/                 Fastify API, database, AI, scheduling
src/shared/contracts.ts     Shared runtime schemas and types
README.md                   Project setup and submission context
.env.example                Environment template
HANDOFF.md                  This document
```

## Configuration Status

`.env` exists and is gitignored.

Present and format-checked:

- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `VAPID_SUBJECT`

Configured model IDs:

```text
OPENAI_MODEL=gpt-5.6-terra
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
```

Still absent:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Generate these when Web Push needs to be tested:

```powershell
npx web-push generate-vapid-keys
```

The current server makes VAPID optional and disables the scheduler when the pair is absent. It does not provide a fake notification fallback.

Provider model-list calls were attempted but were blocked by the active network boundary. Model availability must be verified with live smoke calls once Fastify is running.

## Current Gaps

1. Ensure the MongoDB Atlas URI is reachable. Collections and indexes initialize when the server starts.
2. Add API integration tests and Playwright responsive tests.
3. Perform real OpenAI extraction and Gemini Live smoke calls with the configured model IDs.
4. Complete Heroku deployment verification after a Heroku app is created and its config vars are set.
5. Update README implementation checklist as each item completes.

## Required Next Steps

### 1. Verify visual system

The application styling and public landing page are present. Verify the live landing page at desktop and mobile sizes:

- Warm off-white canvas, charcoal text, muted semantic green/blue/yellow accents.
- Geist Sans, no negative letter spacing.
- No gradients, glassmorphism, decorative orbs, or heavy shadows.
- Maximum card radius of 8px.
- Compact desktop sidebar and mobile bottom navigation.
- Full-screen camera-first Live session.
- 44px touch targets, focus states, reduced motion, responsive 375px and 1440px layouts.

Higher-priority product requirements override `minimalist-ui` conflicts: use Lucide icons, avoid huge editorial whitespace, and use dense operational layouts.

### 2. Verify notification scheduling

`isWindowDue(window, timezone, now)` now exists with unit coverage. Confirm production notification delivery with real VAPID keys.

- Convert `now` into each user timezone through `Intl.DateTimeFormat`.
- Compare weekday and `HH:mm` exactly.
- Compute `scheduledFor` rounded to the minute in UTC.
- Use the existing unique constraint on `(windowId, scheduledFor)` to guarantee at-most-once delivery.
- Skip sending when no push subscriptions exist.
- Add unit tests for normal days, timezone conversion, daylight-saving transitions, and duplicate prevention.

### 3. Start and verify runtime

Run:

```powershell
npm run dev
```

Verify:

```powershell
Invoke-WebRequest http://localhost:3001/api/health
```

If Fastify fails, inspect its terminal output first. Do not print secret values.

### 4. Database

Set `MONGODB_URI` to the MongoDB Atlas connection string. The application creates its collections and indexes automatically when it starts.

### 5. Real provider validation

Use authenticated server-side smoke routes or a small non-committed script to check:

- OpenAI accepts `gpt-5.6-terra` for a tiny structured response.
- Gemini accepts `gemini-3.1-flash-live-preview` for ephemeral token creation.

Do not add canned responses if either fails. Return a clear service-configuration error in the interface.

### 6. Tests

Add Vitest tests for:

- `mergeDraft`
- `mergeObservedProgress`
- activity contract validation
- scheduler timing and idempotency

Add API tests for auth ownership, bad screenshot uploads, plan activation, session completion, and user deletion.

Add Playwright tests for:

- Onboarding Conversation/Plan switching
- Screenshot candidate review
- mobile navigation
- camera denied fallback
- manual completion and Progress update

### 7. Quality gate

Run and resolve all failures:

```powershell
npm run typecheck
npm test
npm run build
```

Inspect the deployed interface at mobile and desktop widths. Ensure no overlapping text, broken layouts, or static/fake AI output.

## Architecture Decisions to Preserve

- Server is the source of truth for the onboarding draft; Conversation and My Plan are two views of the same persisted state.
- No raw screenshots, video frames, audio, or browser history are stored.
- Screenshots are user-optional and are processed only during onboarding.
- Gemini Live reports cumulative observation rather than `+1` events so retries cannot inflate the count.
- Live completion is AI-observed plus user-confirmed, not strict surveillance or proof.
- Any physical activity can be generated as long as it has a safe, constrained activity contract.
- Notifications never name the selected app or directly ask about an urge.
- Do not add MediapPipe in v1; Gemini Live supports arbitrary activities, and user confirmation handles model uncertainty.
- Do not add Google My Activity or Takeout import in v1 due privacy and lack of device-wide usefulness.

## Submission Checklist

- [ ] Public deployed URL
- [ ] Evaluator Clerk credentials
- [ ] Real OpenAI and Gemini Live calls demonstrated
- [ ] Privacy and security claims verified
- [ ] README has current deployment instructions
- [ ] Challenge submission states which GenAI service powers each feature
- [ ] Three-minute demo rehearsed end to end
