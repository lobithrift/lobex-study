# Lobex-Study Project Documentation

**Tagline:** Learn Smarter. Practice Better. Achieve More.  
**Document type:** Product and technical project specification  
**Project category:** AI-powered personalized learning platform with an interactive browser game  
**Audience:** Students, project developers, reviewers, and administrators

---

## 1. Project overview

Lobex-Study is a responsive web application that helps students understand difficult topics, prepare for examinations, and study more effectively. It combines an AI tutor, AI-generated practice materials, study planning, progress tracking, and a short interactive browser game called **Brain Blitz**.

The product is an AI Fundamentals capstone. The implementation should prioritize a useful, functional MVP and a professional presentation. Primary navigation, forms, buttons, quizzes, flashcards, planner actions, and game controls should work; the product should not be a static mockup.

### Product promise

Students can bring a topic or their own notes, get a clear explanation, practice with generated questions and flashcards, plan study sessions, and see how their learning is progressing.

### MVP principles

- Keep the experience simple and usable for students with a range of technical abilities.
- Make AI outputs easy to review, retry, and correct.
- Keep the planner and Brain Blitz playable without requiring a database account.
- Use server-side routes for any LLM or email provider secrets.
- Treat Supabase's publishable key as public client configuration; enforce data access with Row Level Security (RLS).

---

## 2. Problem statement

Students often encounter explanations that are too complex, struggle to turn notes into useful practice, and lack a realistic study plan. Generic study tools may separate tutoring, quizzes, revision cards, schedules, and progress into different experiences. Students need a straightforward place to understand a topic, practice it, organize revision, and stay motivated.

---

## 3. Objectives and success indicators

### Objectives

1. Explain difficult topics in simple, adjustable language.
2. Generate useful quizzes and flashcards from a topic or student-provided notes.
3. Help students create and maintain a personalized study timetable.
4. Provide an AI tutor chatbot for follow-up questions.
5. Offer a quick knowledge game that reinforces practice.
6. Show study activity and learning progress in a clear dashboard.
7. Provide a basic admin dashboard for product and content oversight.
8. Protect student content and credentials, and communicate AI limitations clearly.

### Suggested MVP indicators

- A student can complete an explanation or tutoring interaction.
- A student can generate and complete a quiz and review answers.
- A student can create, flip through, and mark flashcards.
- A student can add, edit, complete, and remove planner sessions.
- Brain Blitz can be started, played, and completed using keyboard or touch controls.
- Dashboard progress reflects completed in-app activities where data is available.
- Unauthorized users cannot access another user's stored records.

---

## 4. Target users

- **Secondary and university students** preparing for lessons, assignments, and examinations.
- **Independent learners** who want explanations and structured practice.
- **Teachers or content reviewers** who may review reported AI output or sample learning content.
- **Administrators** who manage platform-level settings and monitor basic usage.

The MVP is designed primarily for individual students. It is not a learning management system and should not claim to replace teachers, textbooks, or professional advice.

---

## 5. Scope and features

### 5.1 AI Tutor

- Chat interface for asking questions about a subject or topic.
- Explain concepts in plain language and allow the student to request a simpler or more detailed explanation.
- Support follow-up questions while preserving only the context needed for that conversation.
- Show loading, retry, empty, and error states.
- Clearly label generated responses as AI-generated and encourage checking important facts against trusted course materials.
- Do not expose provider credentials in browser code.

### 5.2 AI quiz generator

- Accept a topic, pasted notes, and options such as question count and difficulty (easy, medium, difficult).
- Generate multiple-choice questions with answer choices, correct answers, and concise explanations.
- Let students answer questions, submit, and review their score and explanations.
- Allow retry or regeneration. Validate the output before presenting it.
- Avoid implying that generated questions are guaranteed to match a specific examination.

### 5.3 Flashcards

- Generate a set of question-and-answer cards from notes or a topic.
- Flip cards, move next and previous, shuffle, and mark a card as known or needs review.
- Provide a usable empty state and basic set management.
- Where accounts are enabled, persist saved sets under the signed-in user. If persistence is not implemented for the MVP, disclose that cards are session-only.

### 5.4 Personalized study planner

- Ask for subjects, target dates, available days or time, and preferred session length.
- Suggest a timetable the student can review and edit.
- Support creating, editing, completing, and deleting study sessions.
- MVP planner records are stored in browser local storage. They are device- and browser-specific and are not synchronized to Supabase.
- Explain that clearing browser data may remove locally stored sessions. Validate dates and prevent invalid schedules.

### 5.5 Brain Blitz browser game

A short, self-contained browser game that reinforces recall using questions from generated or sample content.

- Include start, pause/resume (if the chosen game loop supports it), answer, and end/replay controls.
- Show rules, score, remaining time or progress, and feedback after each answer.
- Provide keyboard-accessible controls and touch-friendly targets.
- MVP game settings and best score may be stored in local storage. Do not store sensitive student notes in game state.
- Ensure the game remains usable with reduced motion and without sound.

### 5.6 Student dashboard

- Clear links to Tutor, Quiz Generator, Flashcards, Planner, and Brain Blitz.
- Summaries such as recent activity, sessions completed, quizzes taken, and study streak where reliable data exists.
- Useful empty states for new students.
- Avoid presenting estimates as authoritative academic grades.

### 5.7 Progress

- Track completed activities and quiz results only when the student is signed in and persistence is implemented.
- Show simple trends and recent activity with labels explaining what is counted.
- Keep local-only planner/game records distinct from account-synced data so the dashboard does not imply synchronization.
- Provide a way to clear or delete stored personal data.

### 5.8 Settings

- Profile and account settings if authentication is enabled.
- Preferred explanation level and study preferences.
- Privacy controls, sign-out, and data deletion guidance.
- Email notification preferences only if notification features are implemented.
- Admin-only controls must be protected by server-side authorization, not merely hidden in the interface.

### 5.9 Admin dashboard

- Restricted area for authorized administrators.
- Basic user and content oversight, flagged output review, and high-level service status as appropriate to the MVP.
- Do not expose private notes, secrets, or unrestricted user records by default.
- Protect admin routes and all admin API operations with server-side role checks and Supabase policies.

---

## 6. Technology stack

Use the explicitly selected stack:

| Area | Technology |
|---|---|
| Frontend and admin dashboard | Next.js with TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js using Next.js Route Handlers/API routes for the MVP; a separate Node.js service can be introduced if deployment or scaling needs justify it |
| Database and authentication | Supabase (PostgreSQL, Auth, Row Level Security) |
| Email | Resend, called only from a server-side route or trusted backend |
| AI | LLM provider accessed through a server-side adapter; provider and model remain configurable |
| Deployment | Vercel, only after local verification |

Next.js runs on Node.js for server-side routes, so Route Handlers provide the Node.js backend without requiring a separate service in the initial release.

---

## 7. Suggested architecture

### Request flow

1. The browser renders the Next.js application and uses the Supabase project URL and publishable key for approved client operations.
2. Supabase Auth establishes the user's session.
3. The browser calls a Next.js server route for AI or email operations.
4. The route validates input, applies size and rate limits, authenticates/authorizes the user where required, and calls the LLM or Resend using server-only secrets.
5. The route validates and normalizes provider output before returning a safe response.
6. Supabase stores only the records needed for account-backed features, protected by RLS. Planner and Brain Blitz MVP data remain in local storage as specified.

### Suggested application structure

```text
app/
  (public)/
    page.tsx
    login/page.tsx
  (student)/
    dashboard/page.tsx
    tutor/page.tsx
    quizzes/page.tsx
    flashcards/page.tsx
    planner/page.tsx
    brain-blitz/page.tsx
    settings/page.tsx
  admin/
    page.tsx
  api/
    ai/tutor/route.ts
    ai/explain/route.ts
    ai/quiz/route.ts
    ai/flashcards/route.ts
    email/route.ts
components/
  navigation/
  tutor/
  quiz/
  flashcards/
  planner/
  game/
  dashboard/
lib/
  supabase/client.ts
  supabase/server.ts
  ai/provider.ts
  validation/
  auth/
  email/
  storage/
types/
supabase/
  migrations/
```

This is a suggested organization, not a requirement to create every route at once. Keep provider access, validation, authorization, and database operations out of presentation components.

---

## 8. Environment variables and configuration

Create a local `.env.local` file and do not commit it. Add the same required values to the deployment environment only when deploying.

### Client-side Supabase configuration

The project details supplied for this documentation are:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://oaockvuchphqhfblyoke.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_PinS_z1ogNrDS7WCEPG6Zw_9pvGFXaN
```

The Supabase **publishable key is not a secret**. It is intended for client-side configuration. It does not replace authentication, authorization, or RLS. Never place a Supabase service-role key in a `NEXT_PUBLIC_*` variable or browser bundle.

### Server-only configuration

Use placeholders until real credentials are issued. Never invent or commit secrets.

```dotenv
# Server-side LLM provider credential; select a provider and obtain a key securely.
LLM_API_KEY=<YOUR_LLM_PROVIDER_API_KEY>
LLM_MODEL=<YOUR_SUPPORTED_MODEL_NAME>

# Resend server-side credential. Required only if email sending is implemented.
RESEND_API_KEY=<YOUR_RESEND_API_KEY>
EMAIL_FROM=<YOUR_VERIFIED_SENDER_ADDRESS>

# Optional server-side Supabase admin key. Leave unset unless a trusted server operation
# genuinely requires it. It must never be exposed to the client.
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>

# Optional application origin for trusted links and origin checks.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Variable names for LLM provider/model may be adapted to the chosen provider. Keep all provider credentials server-only; do not prefix them with `NEXT_PUBLIC_`. If a feature does not use Resend or an admin service key, omit those variables.

### Local setup

1. Install a current supported Node.js LTS release and a package manager (npm is sufficient).
2. Create the Next.js project with TypeScript and Tailwind CSS.
3. Install the Supabase JavaScript client and any required schema validation library.
4. Copy the configuration above into `.env.local`; replace angle-bracket placeholders only with credentials obtained from the relevant service.
5. Start the local development server with `npm run dev` and open `http://localhost:3000`.
6. Configure Supabase Auth redirect URLs for local development if authentication is enabled.
7. Apply database migrations before using persisted features.
8. Verify each feature locally using the checklist in Section 13 before considering deployment.

Do not paste keys into source files, screenshots, issues, or public repositories. If a secret is exposed, revoke and rotate it at its provider.

---

## 9. Suggested database schema

Use UUID primary keys, timestamps in UTC, foreign keys to `auth.users(id)`, and RLS on every table containing user or administrative data. The schema below is a starting point; only implement tables required by the MVP.

### `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `role text not null default 'student'` — constrain to approved roles; users must not be able to self-assign admin
- `preferred_explanation_level text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `study_sets`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `source_type text` — e.g. topic or notes
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `flashcards`

- `id uuid primary key default gen_random_uuid()`
- `study_set_id uuid not null references study_sets(id) on delete cascade`
- `front text not null`
- `back text not null`
- `position integer not null default 0`
- `created_at timestamptz not null default now()`

### `quiz_attempts`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `topic text not null`
- `difficulty text`
- `question_count integer not null`
- `score integer not null`
- `completed_at timestamptz not null default now()`

Store quiz content only if required and after deciding an appropriate retention policy. Avoid storing pasted notes by default.

### `activity_events` (optional)

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `event_type text not null`
- `metadata jsonb not null default '{}'` — allowlist non-sensitive fields only
- `created_at timestamptz not null default now()`

Avoid collecting unnecessary telemetry or putting note contents, tutor transcripts, or secrets in metadata.

### Data kept locally for MVP

Study planner sessions and Brain Blitz preferences/best score are held in browser local storage. Use versioned storage keys and validate parsed data. Do not treat local storage as secure or synchronized. Offer a clear/reset action and handle malformed or unavailable storage gracefully.

### Row Level Security guidance

- Enable RLS on all user-owned tables.
- Students may select, insert, update, and delete only rows tied to their authenticated user ID.
- Child table policies must verify ownership through the parent study set.
- Admin access must be granted through a trusted role mechanism and checked server-side.
- Test policies with separate users before enabling real student data.

---

## 10. Security, privacy, and responsible AI

- Keep LLM, Resend, and any Supabase service-role credentials on the server.
- Validate request types, lengths, formats, and allowed values on server routes. Limit note size and generation output to manage abuse and cost.
- Apply authentication where needed, per-user authorization, rate limiting, and request timeouts to AI/email endpoints.
- Do not trust role, user ID, score, or ownership values supplied by the browser.
- Enable and verify Supabase RLS. A publishable key is safe to expose only when database policies are correctly configured.
- Collect the minimum data needed. Explain what is stored, where it is stored, and how students can delete it.
- Do not persist pasted notes or AI chat transcripts by default. If persistence is added, make it transparent and provide deletion controls.
- Do not use student content to train an external model unless the provider terms and explicit user consent permit it.
- Treat notes and prompts as untrusted input. Instruct the model not to follow embedded requests that conflict with application instructions, and never let model output execute code or SQL.
- Validate structured AI responses against a schema; escape rendered content and do not render raw HTML from a model.
- Communicate uncertainty, encourage verification against course materials, and avoid fabricated citations or claims of guaranteed exam success.
- Provide a way to report harmful or incorrect output. Consider age-appropriate privacy and consent requirements for the intended audience.

---

## 11. Error handling and reliability

Use consistent, student-readable messages while logging diagnostic detail only on the server.

| Situation | Expected behavior |
|---|---|
| Missing or invalid input | Explain what needs correction; do not call the provider |
| Unauthenticated request | Return an appropriate unauthorized response and prompt sign-in when required |
| Rate limit reached | Ask the student to wait and retry; do not repeatedly retry automatically |
| LLM timeout or provider error | Preserve user input, show a retry action, and avoid presenting a partial answer as complete |
| Invalid LLM output | Reject or safely repair through a bounded validation flow; return a clear error if still invalid |
| Supabase failure | Show a recoverable message and avoid claiming data was saved |
| Resend failure | Report that email could not be sent; do not expose provider diagnostics |
| Local storage unavailable or corrupt | Continue with an in-memory/session fallback where practical and explain persistence may not be available |
| Network interruption | Keep the current screen usable, preserve unsent input locally where appropriate, and offer retry |

Never log API keys, authentication tokens, full student notes, or unnecessary chat contents. Include request IDs in server logs to help trace failures without exposing personal content.

---

## 12. Responsive, accessible design

- Design mobile-first and support narrow phones, tablets, and desktop layouts.
- Use semantic headings, landmarks, buttons, labels, and form controls.
- Support keyboard navigation and visible focus indicators throughout the app and game.
- Ensure adequate color contrast and do not communicate correctness or status through color alone.
- Announce quiz results, tutor loading/completion, and validation errors to assistive technology.
- Give controls accessible names; provide text alternatives for icons.
- Make touch targets comfortably sized and avoid hover-only interactions.
- Respect reduced-motion preferences and do not rely on sound.
- Use plain language, readable line lengths, and clear empty/loading/error states.

---

## 13. Local verification and testing checklist

Complete this checklist locally before deployment. Record issues and resolve critical failures first.

### Setup and navigation

- [ ] App installs and starts locally with documented commands.
- [ ] No required secret is hard-coded or exposed in the browser bundle.
- [ ] Main navigation and primary buttons lead to working screens/actions.
- [ ] Layout works on phone, tablet, and desktop widths.

### AI features

- [ ] Tutor validates input, handles follow-up questions, loading, timeout, and retry.
- [ ] Quiz generation handles easy, medium, and difficult levels and question-count limits.
- [ ] Quiz scoring and answer explanations are correct for the generated answer key.
- [ ] Flashcards can be generated, flipped, navigated, shuffled, and marked for review.
- [ ] Malformed model responses fail safely; raw HTML is not rendered.
- [ ] Server routes reject invalid/oversized requests and protect credentials.

### Planner, game, dashboard, settings

- [ ] Planner can create, edit, complete, and delete sessions.
- [ ] Planner local storage survives refresh and handles corrupt/missing storage.
- [ ] Brain Blitz start, answer, score, finish, and replay controls work with keyboard and touch.
- [ ] Dashboard counts match the available persisted or local data and are labeled clearly.
- [ ] Settings and data-clearing controls behave as described.

### Data access and accessibility

- [ ] Supabase RLS prevents one student from reading or changing another student's records.
- [ ] Admin pages and operations require a trusted admin role.
- [ ] Forms have labels, errors are announced, focus is visible, and game controls are keyboard-operable.
- [ ] Reduced-motion preference and adequate contrast are supported.
- [ ] No secrets, tokens, or unnecessary student content appear in logs.

---

## 14. Deployment

Deploy to **Vercel only after local verification** is complete.

Before deploying:

1. Confirm the production Supabase schema, RLS policies, and Auth redirect URLs.
2. Configure production environment variables in Vercel's protected project settings.
3. Use real provider credentials supplied by the project owner; retain placeholders in documentation and examples.
4. Configure a verified Resend sender domain if email is enabled.
5. Set provider limits, rate limits, and any production origin checks.
6. Review build output and confirm server-only secrets are not bundled into client assets.
7. Deploy to a preview environment first, verify critical flows, then promote to production.
8. Document the deployed URL, responsible maintainer, and a rollback plan.

---

## 15. Future enhancements

Potential extensions after the MVP include saved learning history, spaced repetition, additional question types, teacher-created study sets, calendar export, multilingual explanations, and richer progress insights. Add these only after validating student needs, privacy impact, and maintenance cost.

---

## 16. Glossary

- **LLM:** Large language model used to generate explanations and practice material.
- **RLS:** Supabase/PostgreSQL Row Level Security, which restricts rows a user can access.
- **Publishable key:** Supabase client key intended for public application configuration; it is not an authorization policy or a secret.
- **MVP:** Minimum viable product: the smallest complete version that provides the core learning value.

