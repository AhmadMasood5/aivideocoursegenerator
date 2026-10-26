# Knowmada

AI-powered video course generator. Enter a topic and Knowmada uses the Gemini API to generate a structured course with chapters and video content.

**Live:** https://knowmada.vercel.app

## Features

- AI course generation from a topic (Gemini API)
- Authentication with Clerk
- Course dashboard to create, view and manage courses
- Chapter-wise course layout with video content
- Responsive UI

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, React, Tailwind CSS, shadcn/ui |
| Backend | Next.js API routes, Node.js/Express |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Auth | Clerk |
| AI | Google Gemini API |
| CI/CD | GitHub Actions, Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase or local)
- Clerk and Gemini API keys

### Installation

```bash
git clone https://github.com/ahmadmasood5/knowmada.git
cd knowmada
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
GEMINI_API_KEY=
```

### Database

```bash
npx drizzle-kit push
```

### Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check |
| `npm test` | Run tests |

## Project Structure

```
app/            Routes, pages and API routes
components/     Reusable UI components
configs/        DB schema, AI and service configuration
public/         Static assets
```

## Quality Plan

### Objectives

| Area | Target |
|---|---|
| Course generation success rate | ≥ 95% |
| Duplicate courses/users | 0 |
| API response time (95th percentile, excluding generation) | ≤ 3 s |
| Code coverage (core logic) | ≥ 80% |
| High/critical vulnerabilities | 0 |

### Testing

- **Unit:** prompt parsing and course-structure logic
- **Integration:** API routes with mocked Gemini and Clerk
- **E2E:** sign-in → generate course → view course
- **Regression:** every fixed bug gets a test

### Defect Tracking

Bugs are tracked in GitHub Issues with labels for severity (`critical`, `high`, `medium`, `low`) and module (`auth`, `generation`, `video`, `ui`). Lifecycle: New → Assigned → Fixed → Retest → Closed.

### CI

GitHub Actions runs lint, type-check, tests and build on every push and pull request. Merges are blocked on failure.

### Exit Criteria for Release

- No open critical/high defects
- All CI checks passing
- Quality targets above met

## Security

- Secrets are stored only in environment variables
- API routes are protected with Clerk
- CORS uses an explicit allowlist

## Author

**Ahmad Masood**
GitHub: [@ahmadmasood5](https://github.com/ahmadmasood5)
Portfolio: https://ahmadmasood.me

## License

MIT