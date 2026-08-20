# ONSTOOD v0.2

ONSTOOD is the new brand for the StudentHub project: a student network combining community, study tools, documents, calendar, tasks, career and an AI assistant.

## Stack
- React + Vite
- Supabase Auth + PostgreSQL + Storage + RLS
- Deploy target: Vercel or Cloudflare Pages
- Domain: `onstood.com`

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env.local`.
3. Put the Supabase project URL and publishable key in `.env.local`.
4. In Supabase SQL Editor, run `supabase/onstood_v02.sql` after the existing v0.1 schema is present.
5. `npm run dev`

## Current working modules
- Auth: sign in / registration / Supabase session
- Profile: editable profile fields
- Community feed: real posts + likes
- Network: profile discovery + friend requests
- Calendar: create/list/delete events
- Tasks: create/complete/delete tasks
- Documents: private Storage upload + signed opening
- Courses: initial course workspace UI
- Career: opportunity UI ready for database integration
- ONSTOOD AI: production-ready UI placeholder for a secure Edge Function

## Production next steps
- Add email verification + password reset UI
- Add real comments/replies, notifications and messaging
- Connect courses/jobs to database data
- Add moderation/reporting/privacy flows
- Add secure AI Edge Function and document retrieval (RAG)
- Connect `onstood.com` to the deployed frontend
