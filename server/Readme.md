# UniMate — Backend

Node.js + Express REST API for the UniMate platform.

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- A Google Cloud OAuth 2.0 Client ID and Secret

## Setup

```bash
cd server
npm install
```

## Environment Variables

Create a `.env` file in the `server/` directory:

```
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/unimate
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:3000
```

## Database Setup

Run the full schema migration against your PostgreSQL database:

```bash
psql -U postgres -d unimate -f 001_initial_schema.sql
```

This creates all 12 tables, indexes, enums, and constraints. `001_initial_schema.sql` is the single source of truth for the schema.

## Running the Server

```bash
npm start
```

Runs at http://localhost:4000. Requires PostgreSQL running and `.env` configured.

## Running Tests

```bash
npm test
```

1 test suite (`app.test.js`), 12 tests, 0 failures.

## Running Load Tests

Requires k6: https://k6.io/docs/getting-started/installation/

```bash
k6 run load_tests/smoke_test.js
k6 run load_tests/load_test.js
k6 run load_tests/stress_test.js
```

## API Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/health | No | Health check |
| POST | /api/auth/google | No | Exchange Google ID token for JWT |
| POST | /api/auth/refresh | No | Rotate refresh token |
| GET | /api/profile | Yes | Get authenticated user profile |
| PATCH | /api/profile | Yes | Update profile fields |
| GET | /api/dashboard | Yes | Stats, posts, questions, activity feed |
| GET | /api/dashboard/courses/all | Yes | All courses for dropdown population |
| GET | /api/collab | Yes | List open collaboration posts |
| POST | /api/collab | Yes | Create a collaboration post |
| POST | /api/collab/:id/join | Yes | Join a collaboration post |
| GET | /api/collab/:id/group-chat | Yes | Get group chat link for a post |
| GET | /api/discussions | Yes | List discussion questions |
| POST | /api/discussions | Yes | Post a new question |
| POST | /api/discussions/:id/answers | Yes | Submit an answer |
| PATCH | /api/discussions/:id/vote | Yes | Upvote or downvote a question |
| GET | /api/reviews | Yes | Get course or professor reviews |
| POST | /api/reviews | Yes | Submit a review |
| GET | /api/search | Yes | Full-text search |

## Project Structure

```
server/
├── src/
│   ├── routes/      # auth.js, collab.js, discussions.js, reviews.js,
│   │                # dashboard.js, profile.js, search.js
│   ├── services/    # googleAuth.js (OAuth token verify), jwt.js (sign/verify)
│   ├── middleware/  # auth.js (requireAuth JWT guard)
│   └── db/          # pool.js (PostgreSQL connection pool via pg)
├── load_tests/      # k6 smoke, load, and stress test scripts
├── 001_initial_schema.sql   # Full database schema
└── .env.example             # Environment variable template
```
