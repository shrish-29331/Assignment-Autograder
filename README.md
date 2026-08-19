# Autograder Pro

A full-stack, AI-assisted rewrite of a Streamlit assignment-autograder project. Students submit
Python/C/C++ source files; the backend compiles/runs them against instructor-defined test cases,
scores static code quality, and — new — asks Claude for qualitative feedback and plagiarism-pair
explanations on top of the deterministic score.

## What changed from the original project

The original was a single Streamlit app (`Login.py`, `auto_evaluate.py`, `plagiarism.py`) with a
few issues this rewrite fixes:

| Original | Here |
|---|---|
| MongoDB URI + credentials hardcoded in `Login.py` | All secrets in `.env` (gitignored), loaded via `pydantic-settings` |
| Plaintext-ish password comparison | `bcrypt` hashing via `passlib`, JWT-based auth |
| "Who's logged in" tracked by writing to a local `constants.py` file (breaks with 2+ concurrent users) | Stateless JWT, one MongoDB `users` collection |
| Submitted code compiled/run directly on the host, no isolation | Sandboxed subprocess execution: per-run temp dir, CPU/memory/wall-clock limits, stripped env (see security note below) |
| Streamlit UI, single Python process, no API | FastAPI REST API + separate React (Vite/Tailwind) frontend, deployable independently |
| No AI involved ("No External APIs" was a stated goal) | Claude API generates advisory feedback on submissions and explains flagged plagiarism pairs |
| Plagiarism check only printed a flag | Full pairwise similarity report with a threshold slider in the UI |

Deterministic grading (test cases + static analysis) is still what decides the score — the AI layer
is additive and clearly labelled as advisory, not a replacement for it.

## Architecture

```
autograder-pro/
├── backend/            FastAPI + MongoDB (Motor async driver)
│   └── app/
│       ├── core/        settings, JWT/password hashing
│       ├── db/          Mongo connection
│       ├── models/      Pydantic schemas
│       ├── routers/     auth, assignments, submissions, plagiarism
│       └── services/    code_runner (sandbox), code_quality, plagiarism_service, ai_service, grading_service
├── frontend/           React + Vite + Tailwind SPA
│   └── src/
│       ├── api/          axios client + endpoint wrappers
│       ├── context/       auth context (JWT in localStorage)
│       ├── components/    reusable UI (score stamp, test case table, AI feedback card, etc.)
│       └── pages/         Login, Student dashboard, TA dashboard, Assignment detail, Create assignment
└── docker-compose.yml  Mongo + backend + frontend, one command up
```

## Quick start (Docker)

```bash
cd autograder-pro
cp backend/.env.example backend/.env
# edit backend/.env: set JWT_SECRET_KEY and ANTHROPIC_API_KEY

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs (Swagger): http://localhost:8000/docs

Register an account from the login page (choose "Student" or "TA") — there are no seeded accounts
by default. If you'd like demo accounts, run `python backend/seed.py` (see below).

## Quick start (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in JWT_SECRET_KEY, ANTHROPIC_API_KEY, MONGO_URI

# MongoDB must be running locally (or point MONGO_URI at Atlas / another host)
# g++ and gcc must be installed for C/C++ grading to work

uvicorn app.main:app --reload
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

**Optional: seed demo accounts**
```bash
cd backend
python seed.py   # prompts for passwords interactively, nothing hardcoded
```

## Getting an Anthropic API key

AI feedback and plagiarism explanations require `ANTHROPIC_API_KEY` in `backend/.env`. Get one at
https://console.anthropic.com/. If you leave it blank, everything else works fine — the AI feedback
card just won't render (`generate_submission_feedback` / `explain_plagiarism_pair` return `None`
and the rest of grading is unaffected). You can also flip `ENABLE_AI_FEEDBACK=false` to disable the
calls entirely without removing the key.

## How grading works

1. Student uploads a source file for an assignment.
2. `POST /api/submissions` stores it with `status: "pending"` and returns immediately; grading runs
   as a FastAPI background task so the request isn't blocked on compiling/running code.
3. `grading_service.grade_submission`:
   - Compiles (C/C++) or loads (Python) the submission in an isolated temp directory.
   - Runs every test case with a wall-clock timeout and memory cap (`code_runner.py`).
   - Runs static quality checks — pylint for Python, five heuristics (commenting, expression
     complexity, indentation, repetition, variable naming) for C/C++, ported from the original
     project (`code_quality.py`).
   - Combines both into `total_score` using the assignment's rubric weights.
   - Calls Claude for qualitative feedback (`ai_service.py`), best-effort — any failure just omits
     the AI section rather than failing the grade.
4. The frontend polls while status is `pending`/`grading` and renders the full breakdown once
   `graded`.

## Security notes (read before deploying anywhere public)

- **Code execution is still subprocess-based, not containerized.** `code_runner.py` applies
  `RLIMIT_AS` (memory), `RLIMIT_NPROC`, and a timeout, and strips the environment, but it does not
  provide filesystem or network isolation the way a container/microVM would. For a real deployment,
  run each submission inside a network-disabled, ephemeral sandbox — Docker with
  `--network=none --pids-limit --memory`, gVisor, Firecracker, or a hosted judge API
  (Judge0, Piston). The `run_in_sandbox`-shaped functions in `code_runner.py` are written so this
  swap is localized to one file.
- Rotate `JWT_SECRET_KEY` and never commit `.env` files (already gitignored).
- The 512 KB upload cap and UTF-8-only check in `submissions.py` are basic guards, not a substitute
  for the sandboxing point above.

## Rubric / grading weights

Each assignment sets `test_case_weight` + `code_quality_weight` (must total 100). Defaults are
75/25, matching the original project's scoring split.

## Tech stack

- **Backend**: FastAPI, Motor (async MongoDB), Pydantic v2, python-jose (JWT), passlib/bcrypt,
  scikit-learn + NLTK (plagiarism), pylint, Anthropic Python SDK
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, axios, date-fns
- **Infra**: Docker Compose (MongoDB, FastAPI, nginx-served static React build)
