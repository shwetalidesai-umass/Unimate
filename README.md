# UniMate
A collaboration platform for the Five College community.

**Course:** COMPSCI 520 – Spring 2026  
**Instructor:** Heather Conboy  
**University:** University of Massachusetts Amherst  

## Team Members
- Aryan Jaggi — https://github.com/Ajaggi24
- Dev Pathak — https://github.com/devpathak0212
- Dhruv Kalra — https://github.com/Vipdhruvkalra
- Pooja Vyas — https://github.com/vyas2230
- Shwetali Desai — https://github.com/Shwetali-desai

## Repository
- Project Repository: https://github.com/Ajaggi24/Unimate
- Project Documents: https://drive.google.com/drive/u/3/folders/1G9MiXc2fWx20HyRs0LBxll8nTyuP33m0

## Overview
UniMate is a full-stack web platform for students across the Five College community. It unifies collaboration matching, academic Q&A, and course/professor reviews into a single course-centered hub serving UMass Amherst, Amherst College, Hampshire College, Mount Holyoke College, and Smith College.

## Features
- **Google SSO Authentication** — University email login with Five College domain validation
- **Collaboration Matching** — Create and join posts for projects, study groups, homework, and exams
- **Discussion Boards** — Course-specific Q&A with upvoting and inline answers
- **Course and Professor Reviews** — Star ratings with written feedback and duplicate prevention
- **Group Chat** — Set a shared chat link for formed collaboration groups
- **Profile Management** — Enrolled courses, availability, school, and class year
- **Search** — Full-text search across posts, discussions, and reviews

## Architecture
Three-tier client-server architecture:

- **Frontend:** React SPA (React Router, Axios, AuthContext for JWT state)
- **Backend:** Node.js + Express REST API (JWT middleware, Google OAuth)
- **Database:** PostgreSQL (ACID-compliant, 12 tables, UUID primary keys)

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (pg driver) |
| Auth | JWT + Google OAuth 2.0 |
| Unit Testing | Jest + React Testing Library |
| E2E Testing | Playwright (Chromium) |
| Load Testing | k6 |
| Accessibility | jest-axe, Google Lighthouse |

## Test Results
- 198 tests passing across 15 test suites, 0 failures
- 80.23% statement coverage, 82.45% line coverage (Istanbul/lcov)
- 11 Playwright E2E tests, all passed in 7.8s
- k6 load testing: 0% error rate across smoke, load, and stress scenarios
- Lighthouse accessibility scores: 90–96 across all 6 pages

## Data Model
12 tables: `users`, `courses`, `collab_posts`, `collab_members`, `questions`, `answers`, `reviews`, `professors`, `professor_courses`, `user_courses`, `activity_feed`, `refresh_tokens`.

## Project Structure
```
Unimate/
├── client/                  # React SPA
├── server/                  # Node.js/Express API
├── e2e/                     # Playwright end-to-end tests
├── playwright.config.ts     # E2E test configuration
└── README.md
```

## Quick Start
See [`client/README.md`](./client/README.md) for frontend setup and [`server/README.md`](./server/README.md) for backend setup.
