# IT Case Manager

A modern, internal case management system for IT departments — similar to Jira or Monday.com.

## Features

- **Ticket Management** — Create, assign, and track IT cases with priority levels and due dates
- **Kanban Board** — Drag-and-drop tickets across To Do / In Progress / In Review / Done
- **Calendar View** — Monthly calendar showing tickets by due date, color-coded by priority
- **Comments & Activity** — Thread comments on tickets; status changes auto-logged
- **Role-Based Auth** — Admin and Agent roles with session-based login
- **Admin Panel** — Create team members and manage roles

## Tech Stack

- **Frontend:** React 18 + Vite + React Router + @hello-pangea/dnd + react-big-calendar
- **Backend:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** express-session + bcryptjs

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a connection string to a hosted instance)

## Setup

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/it_case_manager"
SESSION_SECRET="generate-a-long-random-string-here"
PORT=3001
```

### 2. Install backend dependencies & run migrations

```bash
cd backend
npm install
npx prisma migrate dev --name init
```

### 3. Seed the first admin user

```bash
node seed.js
```

This creates: `admin@company.com` / `admin123`
**Change the password after first login via the Admin Panel.**

### 4. Start the backend

```bash
node server.js
# or for development with auto-reload:
npm run dev
```

### 5. Install frontend dependencies & start dev server

```bash
cd ../frontend
npm install
npm run dev
```

### 6. Open the app

Visit [http://localhost:5173](http://localhost:5173)

Log in with `admin@company.com` / `admin123`

## Project Structure

```
case-management-app/
├── .env.example
├── README.md
├── backend/
│   ├── server.js          # Express app entry point
│   ├── seed.js            # Database seeder
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── routes/
│   │   ├── auth.js        # Login, logout, session
│   │   ├── tickets.js     # CRUD for tickets
│   │   ├── users.js       # User management (admin)
│   │   └── comments.js    # Comments on tickets
│   └── middleware/
│       └── auth.js        # requireAuth, requireAdmin
└── frontend/
    └── src/
        ├── App.jsx         # Router + AuthContext
        ├── api.js          # Fetch wrapper
        ├── pages/          # Dashboard, Kanban, Calendar, Admin, Login
        ├── components/     # Navbar, TicketCard, TicketModal, CommentThread
        └── styles/         # global.css
```

## Production Notes

- Set `cookie.secure: true` in `server.js` when running behind HTTPS
- Use a proper session store (e.g. `connect-pg-simple`) for production instead of the default in-memory store
- Run `npm run build` in the frontend directory and serve the `dist/` folder via a static file server or CDN
