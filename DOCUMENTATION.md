# IT Case Manager — Project Documentation

A full-stack IT case management web application built for internal IT departments, similar to Jira or Monday.com.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Backend API Reference](#5-backend-api-reference)
6. [Frontend Pages & Components](#6-frontend-pages--components)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Key Features](#8-key-features)
9. [Business Logic](#9-business-logic)
10. [Docker & Deployment](#10-docker--deployment)
11. [Environment Variables](#11-environment-variables)
12. [Running the App](#12-running-the-app)
13. [Default Login](#13-default-login)

---

## 1. Project Overview

The IT Case Manager is a web-based ticketing system that allows IT teams to:
- Create, assign, and track support cases (tickets)
- Visualize workload via Kanban, Calendar, and List views
- Manage team members and their access levels
- Export ticket data to CSV and Excel
- Track resolution history and activity logs

---

## 2. Technology Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| Vite | 5.3.1 | Build tool and dev server |
| React Router DOM | 6.24.0 | Client-side routing |
| @hello-pangea/dnd | 16.6.0 | Drag-and-drop (Kanban board) |
| react-big-calendar | 1.13.1 | Calendar view |
| date-fns | 3.6.0 | Date formatting utilities |

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.19.2 | Web framework |
| Prisma | 5.14.0 | ORM / database client |
| PostgreSQL | 16 | Database |
| bcryptjs | 2.4.3 | Password hashing |
| express-session | 1.18.0 | Session management |
| CORS | 2.8.5 | Cross-origin resource sharing |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker | Containerisation |
| Docker Compose | Multi-container orchestration |
| Nginx | Reverse proxy / static file serving |

---

## 3. Project Structure

```
case-management-app/
├── docker-compose.yml              # Orchestrates all 3 containers
├── .gitignore
├── .env.example
├── README.md
├── DOCUMENTATION.md
│
├── backend/
│   ├── server.js                   # Express app entry point
│   ├── seed.js                     # Creates default admin user
│   ├── package.json
│   ├── Dockerfile
│   ├── .env                        # Not in git — create manually
│   ├── middleware/
│   │   └── auth.js                 # requireAuth / requireAdmin middleware
│   ├── routes/
│   │   ├── auth.js                 # Login, logout, me, change password
│   │   ├── tickets.js              # Ticket CRUD
│   │   ├── users.js                # User management
│   │   └── comments.js             # Ticket comments
│   └── prisma/
│       ├── schema.prisma           # Database models
│       └── migrations/             # SQL migration history
│           ├── 20260326144026_init/
│           ├── 20260326150713_add_disabled_field/
│           └── 20260326155902_add_requestory_resolution/
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── Dockerfile
    ├── nginx.conf                  # Nginx config + API proxy
    └── src/
        ├── main.jsx                # React entry point
        ├── App.jsx                 # Router + AuthContext
        ├── api.js                  # Centralised API client
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── KanbanBoard.jsx
        │   ├── CalendarView.jsx
        │   ├── ListView.jsx
        │   ├── AdminPanel.jsx
        │   └── CreateTicketForm.jsx
        ├── components/
        │   ├── Navbar.jsx          # Top navigation + password modal
        │   ├── TicketCard.jsx      # Reusable ticket card
        │   ├── TicketModal.jsx     # Full ticket editor modal
        │   └── CommentThread.jsx   # Comments + activity log
        └── styles/
            └── global.css          # Dark theme global styles
```

---

## 4. Database Schema

### User
| Field | Type | Notes |
|---|---|---|
| id | Int | Auto-increment primary key |
| email | String | Unique |
| name | String | Display name |
| passwordHash | String | bcrypt hashed |
| role | Enum | ADMIN or AGENT |
| disabled | Boolean | Default false — blocks login when true |
| createdAt | DateTime | Auto-set |

### Ticket
| Field | Type | Notes |
|---|---|---|
| id | Int | Auto-increment primary key (Ticket ID) |
| title | String | Required |
| description | String | Optional |
| requestor | String | Who raised the request |
| priority | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| status | Enum | TODO, IN_PROGRESS, IN_REVIEW, DONE |
| resolution | String | Required when status = DONE |
| dueDate | DateTime | Optional |
| createdAt | DateTime | System-generated |
| updatedAt | DateTime | Auto-updated |
| createdById | Int | FK → User |
| assignedToId | Int | FK → User (nullable) |

### Comment
| Field | Type | Notes |
|---|---|---|
| id | Int | Auto-increment primary key |
| body | String | Comment text |
| createdAt | DateTime | Auto-set |
| ticketId | Int | FK → Ticket (cascade delete) |
| authorId | Int | FK → User |

### ActivityLog
| Field | Type | Notes |
|---|---|---|
| id | Int | Auto-increment primary key |
| action | String | e.g. "Status changed from TODO to DONE" |
| createdAt | DateTime | Auto-set |
| ticketId | Int | FK → Ticket (cascade delete) |
| performedById | Int | FK → User |

---

## 5. Backend API Reference

### Authentication — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Login with email + password |
| POST | `/logout` | Auth | Destroy session |
| GET | `/me` | Auth | Get current user |
| PATCH | `/password` | Auth | Change own password |

### Tickets — `/api/tickets`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List tickets (Admins: all, Agents: assigned only) |
| POST | `/` | Auth | Create ticket |
| GET | `/:id` | Auth | Get ticket with comments and activity log |
| PATCH | `/:id` | Auth | Update ticket fields |
| DELETE | `/:id` | Admin | Delete ticket |
| POST | `/:id/comments` | Auth | Add comment to ticket |

### Users — `/api/users`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List users (Admins: full details, Agents: id/name/email only) |
| POST | `/` | Admin | Create new user |
| PATCH | `/:id/disable` | Admin | Toggle disabled status |
| DELETE | `/:id` | Admin | Delete user (with cascading cleanup) |

---

## 6. Frontend Pages & Components

### Pages

#### Login
- Email and password form
- Error display
- Redirects to Dashboard on success

#### Dashboard
- Summary cards: Open Tickets, Assigned to Me, Resolved, Critical Open
- Recently Updated Tickets list
- Assigned to Me section
- New Ticket button

#### Kanban Board
- Four columns: To Do, In Progress, In Review, Done
- Drag-and-drop tickets between columns using @hello-pangea/dnd
- Ticket count badges per column
- Click ticket to open TicketModal

#### Calendar View
- Monthly calendar using react-big-calendar
- Tickets displayed on their due dates
- Colour-coded by priority: Green (Low), Blue (Medium), Orange (High), Red (Critical)
- Supports Month, Week, and Agenda views
- Click ticket to open TicketModal

#### List View
- Full table of all tickets
- Sortable columns: ID, Title, Requestor, Priority, Status, Created, Due Date
- Filters: search (title/requestor/assignee), status, priority
- Export to CSV and Excel (no external library — uses Blob/data URI)
- Overdue tickets highlighted in red
- Click row to open TicketModal

#### Admin Panel
- Team members table: Name, Email, Role, Status (Active/Disabled), Joined date
- Per-user actions: Enable/Disable, Delete
- Disabled users shown with dimmed row and Disabled badge
- Add Team Member form: name, email, temporary password, role

### Components

#### Navbar
- Logo and app title
- Navigation links: Dashboard, Kanban, Calendar, List, Admin (Admin only)
- Displays logged-in user name and role badge
- Change Password button (opens modal for all users)
- Logout button

#### TicketCard
- Compact card for Kanban and Dashboard
- Priority badge with colour coding
- Comment count indicator
- Assignee avatar with initials
- Due date with overdue warning icon

#### TicketModal
- Full ticket editor in a modal overlay
- Editable fields: Title, Requestor, Description, Priority, Status, Assigned To, Due Date
- Resolution textarea — visible and required only when Status = DONE
- Ticket meta info: Ticket ID and Creation Date (system-generated, read-only)
- Assignment dropdown excludes disabled users
- Save Changes → closes modal on success
- Delete Ticket → confirmation dialog → closes modal

#### CommentThread
- Displays all comments with author name and timestamp
- Text area to add new comment
- Activity log showing all status change history

#### CreateTicketForm
- Modal overlay for creating new tickets
- Required fields: Title, Requestor
- Optional fields: Description, Priority, Assign To, Due Date
- Assignment dropdown excludes disabled users
- Closes automatically on successful creation

---

## 7. Authentication & Authorization

### How It Works
- Session-based authentication using `express-session`
- Passwords hashed with `bcryptjs` (12 salt rounds)
- Sessions persist for 7 days
- All API requests send credentials (cookies) automatically

### Roles
| Role | Capabilities |
|---|---|
| ADMIN | See all tickets, manage users, access Admin Panel, delete tickets |
| AGENT | See only assigned tickets, update tickets, change own password |

### Security Rules
- Disabled users cannot log in (403 returned on login attempt)
- Agents cannot access `/admin` route (redirected to Dashboard)
- Agents cannot call admin-only API endpoints
- Users cannot disable or delete their own account

---

## 8. Key Features

### Ticket Management
- Create tickets with Title, Requestor, Description, Priority, Assigned To, Due Date
- System automatically assigns a Ticket ID and Creation Date
- Resolution field is mandatory before a ticket can be marked as Done
- Status workflow: To Do → In Progress → In Review → Done

### Multiple Views
- **Dashboard** — quick overview with stats and recent activity
- **Kanban Board** — visual drag-and-drop workflow management
- **Calendar View** — timeline view for deadline management
- **List View** — detailed table view with search, filters, and export

### Export
- Export current filtered list to CSV
- Export current filtered list to Excel (.xls)
- File is named with today's date automatically

### Team Management (Admin)
- Create team members with a temporary password
- Assign roles: Admin or Agent
- Disable users (blocks login, hides from assignment dropdowns, keeps data)
- Re-enable disabled users at any time
- Delete users (all related tickets are safely reassigned)

### Collaboration
- Post comments on tickets
- Activity log automatically records all status changes
- Comments and activity shown in the ticket detail panel

### Password Management
- Any user can change their own password from the Navbar
- Requires current password for verification

---

## 9. Business Logic

### Ticket Visibility by Role
```
ADMIN  → sees all tickets in the system
AGENT  → sees only tickets assigned to them
```

### Resolution Enforcement
- When Status is set to DONE, a Resolution field appears
- Resolution text is mandatory — save is blocked (both client and server) if empty
- Purpose: ensures every closed ticket has a documented resolution

### User Deletion Cascade
When an admin deletes a user, the following happens in order:
1. All tickets assigned to the user are unassigned
2. All tickets created by the user are reassigned to the deleting admin
3. All comments by the user are deleted
4. All activity log entries by the user are deleted
5. The user record is deleted

### Assignment Dropdown
- Only active (non-disabled) users appear in the Assigned To dropdown
- Works for both Create Ticket and Edit Ticket forms

### Overdue Detection
- Calculated client-side: `dueDate < today AND status !== DONE`
- Overdue tickets are highlighted in red in the List View
- Warning icon shown on Kanban cards

---

## 10. Docker & Deployment

### Architecture
```
Browser
  └── http://localhost (port 80)
        └── Nginx (frontend container)
              ├── / → serves React SPA (static files)
              └── /api → proxied to backend:3001
                          └── Express + Prisma
                                └── PostgreSQL (db container)
```

### docker-compose.yml Services
| Service | Image | Port | Description |
|---|---|---|---|
| db | postgres:16 | internal | PostgreSQL database |
| backend | custom build | internal (3001) | Node.js + Express API |
| frontend | custom build | 80:80 | Nginx serving React app |

### backend/Dockerfile
1. Base: `node:18-slim` (Debian — required for Prisma SSL compatibility)
2. Installs `openssl` and `postgresql-client`
3. Copies code and runs `npm install`
4. Generates Prisma client
5. On startup: waits for DB → runs migrations → runs seed → starts server

### frontend/Dockerfile
Multi-stage build:
1. **Build stage** (`node:18-alpine`): `npm install` + `npm run build`
2. **Runtime stage** (`nginx:alpine`): copies `dist/` folder, applies nginx config

### Starting the App
```bash
# First time or after code changes
docker-compose up --build

# Subsequent starts
docker-compose up

# Stop
docker-compose down
```

---

## 11. Environment Variables

### Backend — `backend/.env`
```
DATABASE_URL="postgresql://postgres:secret@localhost:5432/casemgmt"
SESSION_SECRET="change-this-to-a-random-string"
PORT=3001
```
> This file is excluded from git. Create it manually on each machine.

### Frontend
```
VITE_API_URL="/api"    # optional — defaults to /api if not set
```

---

## 12. Running the App

### With Docker (Recommended)
```bash
git clone https://github.com/aivarya/Case_Management.git
cd Case_Management
docker-compose up --build
```
Open browser: `http://localhost`

### Without Docker (Development)
**Requirements:** Node.js 18+, PostgreSQL running

```bash
# Terminal 1 — Backend
cd backend
npm install
npx prisma migrate deploy
node seed.js
node server.js

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```
Open browser: `http://localhost:5173`

---

## 13. Default Login

| Field | Value |
|---|---|
| URL | `http://localhost` |
| Email | `admin@company.com` |
| Password | `admin123` |

> Change the admin password immediately after first login using the **Password** button in the top navigation bar.
