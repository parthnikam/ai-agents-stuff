# ChoreApp — Project Reference

## What This Is

A household/team chore management app with a Kanban board, recurring tasks, AI-powered natural-language chore creation, push notifications, and completion history. Built for small organizations (families, roommates, small teams).

---

## Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Database   | PocketBase (embedded SQLite, REST + realtime) |
| Backend    | Python 3.11 · FastAPI · APScheduler           |
| Frontend   | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| AI         | Claude API (claude-sonnet-4-6) via Anthropic SDK |
| Push       | Web Push (pywebpush · VAPID)                  |
| Email      | SMTP (Gmail / any SMTP)                       |

---

## Running the Project

```bash
# 1. PocketBase
./pocketbase.exe serve --http=localhost:8090

# 2. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Environment file: `backend/.env` — copy from `backend/.env.example`.

---

## PocketBase Collections (schema in `pocketbase/pb_migrations/001_initial_schema.js`)

| Collection          | Key Fields                                                                 |
|---------------------|----------------------------------------------------------------------------|
| `organizations`     | name, owner (→users), members (→users[])                                  |
| `users`             | name, avatar, organization (→orgs), is_admin                              |
| `projects`          | name, description, color, organization, created_by                        |
| `chores`            | title, description, due_date, importance(1-5), project, organization, assigned_to[], kanban_column(todo/in_progress/done), status(active/completed/archived), recurring(none/weekly/monthly/yearly), recurrence_anchor, is_instance, parent_chore, created_by |
| `subtasks`          | chore (cascade-delete), title, completed, order                           |
| `chore_completions` | chore, completed_by, organization, completed_at, notes                    |
| `push_subscriptions`| user, endpoint, p256dh, auth, user_agent                                  |

---

## Backend API (FastAPI, port 8000)

All endpoints except `/health` require `Authorization: Bearer <pb_token>`.

### Chores `/chores`
| Method | Path                          | Description                           |
|--------|-------------------------------|---------------------------------------|
| GET    | /chores                       | List (filter: project, assignee, status, column) |
| POST   | /chores                       | Create (auto-generates recurring instances) |
| GET    | /chores/{id}                  | Get with subtasks expanded            |
| PATCH  | /chores/{id}                  | Update                                |
| DELETE | /chores/{id}                  | Delete + cascade delete instances     |
| PATCH  | /chores/{id}/complete         | Mark complete, write chore_completion |
| PATCH  | /chores/{id}/move             | Move kanban column                    |
| GET    | /chores/{id}/subtasks         | List subtasks                         |
| POST   | /chores/{id}/subtasks         | Create subtask                        |
| PATCH  | /chores/{id}/subtasks/{sub}   | Update subtask                        |
| DELETE | /chores/{id}/subtasks/{sub}   | Delete subtask                        |

### AI `/ai`
| Method | Path             | Description                              |
|--------|------------------|------------------------------------------|
| POST   | /ai/parse-chore  | NL prompt → structured chore fields      |

### Notifications `/notifications`
| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| POST   | /notifications/subscribe   | Register push sub        |
| DELETE | /notifications/unsubscribe | Remove push sub          |
| POST   | /notifications/test        | Send test push           |

### History `/history`
| Method | Path            | Description                            |
|--------|-----------------|----------------------------------------|
| GET    | /history        | Completions (range: daily/weekly/monthly) |
| GET    | /history/stats  | Completions by day + by user (current month) |

### Scheduler `/scheduler` (admin only)
| Method | Path                      | Description       |
|--------|---------------------------|-------------------|
| GET    | /scheduler/jobs           | List cron jobs    |
| POST   | /scheduler/trigger/{id}   | Fire a job now    |

### Scheduled Jobs (APScheduler)
- `check_due_soon` — every 60 min: push + email assignees of chores due in 24h
- `check_overdue` — every 60 min: push overdue chore assignees
- `generate_recurring` — daily 00:05: ensure recurring parents have instances 30 days ahead

---

## What's Built vs What's Left

### Done (Backend)
- [x] PocketBase schema migration
- [x] FastAPI app with CORS, lifespan scheduler
- [x] PocketBase REST client wrapper (`pb_service.py`)
- [x] Chores CRUD + subtasks CRUD
- [x] Kanban column move endpoint
- [x] Chore completion + history tracking
- [x] Recurring instance generation (weekly/monthly/yearly)
- [x] APScheduler jobs (due-soon, overdue, recurring refresh)
- [x] Web Push + SMTP email notification service
- [x] Push subscription management endpoints
- [x] History + stats endpoints
- [x] Admin scheduler trigger endpoints
- [x] `verify_pb_token` dependency (validates Bearer token against PocketBase)

### TODO (Frontend — Next.js App Router)
- [ ] Auth (login / register / org setup)
- [ ] Kanban board
- [ ] Chore detail / create / edit with AI parsing
- [ ] Project management
- [ ] History dashboard
- [ ] Push notification opt-in
- [ ] User profile & settings

---

## Features to Build — Full Specification

### F1: Authentication & Onboarding
- Login with email + password via PocketBase `/api/collections/users/auth-with-password`
- Register: create PocketBase user, then create/join an organization
- First-time org setup wizard: create org → user is set as owner + admin
- Invite link flow: user joins existing org via invite code
- Store PocketBase token in `localStorage` (key: `pb_token`), user record in context
- Redirect unauthenticated routes to `/login`

### F2: Kanban Board (Main View)
- Three columns: **To Do**, **In Progress**, **Done**
- Drag-and-drop cards between columns (calls `PATCH /chores/{id}/move`)
- Chore card shows: title, assignee avatars, due date (color-coded: red=overdue, orange=due soon), importance stars, project color tag
- Filter bar: by project, by assignee, hide completed
- "Add chore" button per column opens create modal

### F3: Chore Create / Edit Modal
- Form fields: title, description, project (dropdown), assigned_to (multi-select users), due_date, importance (1-5 star selector), recurring (none/weekly/monthly/yearly), recurrence_anchor
- AI Quick-Add: text field → calls `POST /ai/parse-chore` → pre-fills form fields from response, user can review + submit
- On submit: `POST /chores` (create) or `PATCH /chores/{id}` (edit)

### F4: Chore Detail View
- Side panel or modal showing full chore details
- Subtask checklist: add/check/delete subtasks inline (calls subtask endpoints)
- Complete button: calls `PATCH /chores/{id}/complete`
- Edit inline or open edit modal
- Completion notes field (written to `chore_completions.notes`)

### F5: Project Management
- `/projects` page: list all org projects with color chips
- Create / edit / delete projects (direct PocketBase calls via frontend SDK or proxy)
- Project filter on Kanban board

### F6: History & Analytics Dashboard
- `/history` page
- Completion feed (expandable list of completed chores with who completed and when)
- Range selector: daily / weekly / monthly
- Bar chart: completions by day (using `GET /history/stats`)
- Leaderboard: completions by user (from `by_user` in stats)
- Streak counter per user

### F7: Push Notification Opt-in
- Settings page: toggle to enable browser push notifications
- On enable: call `navigator.serviceWorker` + `pushManager.subscribe`, send subscription to `POST /notifications/subscribe`
- "Send test" button calls `POST /notifications/test`
- Service worker file in `frontend/public/sw.js` handles push events

### F8: User Profile & Settings
- `/settings` page: edit name, upload avatar, change password
- Org management (admin only): view members, remove member, generate invite link
- Dark mode toggle (Tailwind `dark:` class, stored in `localStorage`)

---

## Technical Implementation Plan

### Phase 1: Foundation & Auth

**Files to create:**
- `frontend/lib/pb.ts` — PocketBase JS SDK client singleton
- `frontend/lib/api.ts` — typed fetch wrapper for FastAPI backend
- `frontend/contexts/AuthContext.tsx` — auth state, login/logout, user record
- `frontend/app/login/page.tsx` — login form
- `frontend/app/register/page.tsx` — register + org setup wizard
- `frontend/app/layout.tsx` — update: wrap in `AuthProvider`, add nav shell

**How auth works:**
```
User submits login → PocketBase JS SDK authWithPassword()
→ SDK stores token + user in localStorage
→ AuthContext reads it, exposes { user, token, login, logout }
→ All API calls use token from context
→ verify_pb_token on backend validates against PocketBase
```

**PocketBase JS SDK:** install `pocketbase` npm package. Use `pb.authStore.token` for all FastAPI calls (`Authorization: Bearer {token}`).

**Route protection:** middleware in `frontend/middleware.ts` — redirect `/` and all protected routes to `/login` if no valid token.

---

### Phase 2: Kanban Board

**Files to create:**
- `frontend/app/(app)/board/page.tsx` — Kanban page
- `frontend/components/KanbanColumn.tsx` — single column container
- `frontend/components/ChoreCard.tsx` — draggable chore card
- `frontend/hooks/useChores.ts` — data fetching + optimistic updates
- `frontend/lib/api.ts` — add chore API methods

**Drag-and-drop:** use `@dnd-kit/core` + `@dnd-kit/sortable`. On drop into a new column, optimistically update UI then call `PATCH /chores/{id}/move`.

**Realtime updates:** subscribe to PocketBase realtime `pb.collection('chores').subscribe('*', callback)` to sync across users.

**Card design:**
```
┌──────────────────────────┐
│ ★★★☆☆  [ProjectTag]   |
│ Chore title              │
│ Due: Apr 16  [avatars]   │
└──────────────────────────┘
```

---

### Phase 3: Chore Create / Edit Modal

**Files to create:**
- `frontend/components/ChoreModal.tsx` — create/edit modal
- `frontend/components/AIParseInput.tsx` — NL text field with parse button
- `frontend/components/UserMultiSelect.tsx` — assignee picker
- `frontend/components/ImportanceSelector.tsx` — 1-5 star rating

**AI flow:**
```
User types: "remind me to clean bathroom every week starting monday, high priority"
→ POST /ai/parse-chore { prompt }
→ Response: { title, recurrence, importance, due_date, ... }
→ Pre-fills modal form fields
→ User reviews and clicks "Create"
```

---

### Phase 4: Chore Detail & Subtasks

**Files to create:**
- `frontend/components/ChoreDetail.tsx` — slide-over panel
- `frontend/components/SubtaskList.tsx` — checklist with inline add

**Subtask interactions:** optimistic toggle (check/uncheck), inline text entry to add new, swipe-to-delete on mobile.

---

### Phase 5: History Dashboard

**Files to create:**
- `frontend/app/(app)/history/page.tsx`
- `frontend/components/CompletionFeed.tsx`
- `frontend/components/StatsChart.tsx` — bar chart using `recharts`

**Data flow:** `GET /history?range=weekly` for feed, `GET /history/stats` for chart data.

---

### Phase 6: Push Notifications & Settings

**Files to create:**
- `frontend/public/sw.js` — service worker (push event handler)
- `frontend/app/(app)/settings/page.tsx`
- `frontend/hooks/usePushNotifications.ts`

**Service worker push handler:**
```js
self.addEventListener('push', (event) => {
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, { body, data: { url } })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.openWindow(event.notification.data.url);
});
```

---

## Frontend Folder Structure (target)

```
frontend/
├── app/
│   ├── (app)/                  # authenticated route group
│   │   ├── board/page.tsx
│   │   ├── history/page.tsx
│   │   ├── projects/page.tsx
│   │   └── settings/page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── layout.tsx              # root layout + providers
│   └── globals.css
├── components/
│   ├── KanbanColumn.tsx
│   ├── ChoreCard.tsx
│   ├── ChoreModal.tsx
│   ├── ChoreDetail.tsx
│   ├── SubtaskList.tsx
│   ├── AIParseInput.tsx
│   ├── UserMultiSelect.tsx
│   ├── ImportanceSelector.tsx
│   ├── CompletionFeed.tsx
│   └── StatsChart.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useChores.ts
│   └── usePushNotifications.ts
├── lib/
│   ├── pb.ts                   # PocketBase SDK singleton
│   └── api.ts                  # FastAPI typed client
└── public/
    └── sw.js                   # Service worker
```

---

## Key NPM Packages to Install

```bash
npm install pocketbase @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities recharts
```

---

## AI Integration Notes

The backend currently uses `transformers` (HuggingFace) for AI parsing. **This should be replaced with the Anthropic SDK + claude-sonnet-4-6** for better accuracy.

**Target `backend/app/services/ai_service.py`:**
```python
import anthropic, json
client = anthropic.Anthropic()

def parse_chore(prompt: str) -> dict:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        system="Extract chore details from natural language. Return JSON with keys: title, recurrence (none/weekly/monthly/yearly), importance (1-5), due_date (ISO date or null), assignees (list of names or empty list).",
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(message.content[0].text)
```

Add `anthropic` to `backend/requirements.txt` and remove `transformers`, `torch`, `sentencepiece` (heavy and not needed).

---

## Important Conventions

- PocketBase token flows: frontend stores in `pb.authStore`, passes as `Bearer` header to FastAPI, FastAPI validates via `verify_pb_token` dependency
- Organization scoping: every query filters `organization = "{org_id}"` — never expose cross-org data
- Recurring chores: parent `is_instance=false`, children `is_instance=true, parent_chore={id}`. Children have `recurring="none"`. Deleting parent cascades via `delete_instances()`.
- Kanban state: `kanban_column` is display state, `status` is completion state. Moving to `done` column sets `status=completed`. Moving back sets `status=active`.
- Admin guard: `user.get("is_admin")` checked server-side for scheduler endpoints and org management
