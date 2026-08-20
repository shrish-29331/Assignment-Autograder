Assignment Autograder

A full-stack programming assignment platform for instructors/teaching assistants and students. It combines deterministic code execution and grading with static code-quality analysis, advisory Gemini feedback, plagiarism detection, code comparison, submission history, and review/contest workflows.

Features

Student

Create an account and authenticate securely.

View assignments and deadlines in local time.

Submit source-code files for an assignment.

Receive deterministic test-case results and rubric-based scores.

View static code-quality feedback (Pylint for Python submissions).

View advisory AI feedback generated with Google Gemini.

View previous submissions for an assignment.

Prevent duplicate submission of the same file/content for the same student and assignment.

See plagiarism flags when a submission is automatically matched with another student's latest submission.

See the similarity percentage and TA review status.

Contest a plagiarism flag by submitting a written concern to the TA.

See the TA's final decision and comment after review.

Teaching Assistant

Create and manage assignments.

Define test cases, hidden tests, deadlines, language, and grading weights.

View all student submissions and their grading status.

Review a student's previous submissions.

Run or re-run plagiarism checks.

Automatic plagiarism flags are created at 80%+ similarity.

Review similarity percentages and source-code diffs.

Request advisory Gemini analysis of flagged pairs.

Mark a case as plagiarism or not plagiarism.

Add a review comment that is returned to the student.

Read student contest/concern messages.

Grading

The deterministic grader is the source of truth for the grade.

A submission is evaluated using:

Test-case execution.

Static code-quality analysis.

The configured assignment rubric.

AI feedback is advisory only. Gemini does not modify, recompute, or replace the deterministic score.

AI Feedback

Google Gemini is used to provide:

A concise submission summary.

Specific strengths.

Actionable improvements.

Potential risks or edge cases.

The model name is displayed with the feedback. AI failures do not invalidate the deterministic grade.

Plagiarism Detection

Plagiarism detection is deterministic and uses:

Token preprocessing.

Porter stemming.

TF-IDF vectorization.

Cosine similarity.

The default automatic threshold is 80%.

For each assignment, the system compares each student's latest submission against the latest submission of other students. A match at or above the threshold creates/updates a plagiarism case.

Gemini may provide an advisory explanation for a flagged pair, but it does not determine whether plagiarism occurred. The final decision remains with the TA.

Code diff

The system stores a unified source-code comparison for flagged submissions.

Identical files are explicitly reported as:

FILES ARE IDENTICAL — 100% CODE MATCH

rather than producing an empty diff.

Plagiarism Review Workflow

Student A submits
        |
Student B submits
        |
Both submissions are graded
        |
Latest submissions compared
        |
TF-IDF + cosine similarity
        |
      >= 80%
        |
Automatic flag
        |
+-------------------------+
| TA dashboard            |
| - similarity            |
| - code diff             |
| - Gemini advisory       |
| - student concern       |
| - TA decision/comment   |
+-------------------------+
        |
        v
Student sees final review

Duplicate Submission Protection

The submission endpoint hashes the validated source payload using SHA-256.

A student cannot submit the same source content repeatedly for the same assignment. Duplicate submissions are rejected before a new grading job/API call is scheduled, reducing unnecessary storage, grading latency, and AI/API usage.

Submission History

The TA can inspect previous submissions for an individual student instead of only seeing the latest submission.

The plagiarism checker itself intentionally compares the latest submission per student for an assignment.

Architecture

Frontend
  React + Vite
      |
      | REST API
      v
Backend
  FastAPI
      |
      +-- Authentication / JWT
      +-- Assignment management
      +-- Submission API
      +-- Deterministic grading
      +-- Static code quality
      +-- Gemini advisory feedback
      +-- Plagiarism detection
      +-- TA/student review workflows
      |
      v
MongoDB

Technology Stack

Frontend

React

Vite

Axios

React Router

Tailwind CSS

Backend

Python

FastAPI

Pydantic / Pydantic Settings

Motor

MongoDB

Uvicorn

Analysis / Grading

Pylint

scikit-learn

NLTK

TF-IDF

Cosine similarity

Python subprocess-based execution

AI

Google Gemini

google-genai

Project Structure

Assignment-Autograder/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   └── main.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
│
└── README.md

Environment Variables

Create backend/.env:

MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=autograder

JWT_SECRET_KEY=replace-with-a-strong-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
ENABLE_AI_FEEDBACK=true

CODE_EXEC_TIMEOUT_SECONDS=8
CODE_EXEC_MEMORY_LIMIT_MB=256

FRONTEND_ORIGIN=http://localhost:5173

Never commit a real .env file or API keys to Git.

Local Setup

1. MongoDB

MongoDB can be run with Docker:

docker run -d --name autograder-mongo -p 27017:27017 mongo:8

Check it:

docker ps

2. Backend

Use Python 3.12.

cd backend
uv venv .venv --python 3.12
source .venv/bin/activate
python -m pip install -r requirements.txt

If the environment was recreated and pip is missing:

uv pip install -r requirements.txt

Start FastAPI:

uvicorn app.main:app --reload

Backend:

http://127.0.0.1:8000

3. Frontend

cd frontend
npm install
npm run dev

Frontend:

http://localhost:5173

Do not commit or copy frontend/node_modules or backend/.venv into the project archive.

WSL + Windows Development

When the source project is maintained on Windows and executed in WSL, copy source files from:

C:\Users\<user>\Assignment-Autograder

to:

~/Assignment-Autograder

For example:

rsync -av   --exclude='.venv'   --exclude='node_modules'   --exclude='__pycache__'   /mnt/c/Users/<user>/Assignment-Autograder/   ~/Assignment-Autograder/

The WSL virtual environment and frontend dependencies should be recreated inside WSL rather than copied from Windows.

API Areas

The backend exposes REST endpoints for:

Authentication.

Assignment creation and retrieval.

Student submissions.

TA submission review.

Plagiarism checking and case retrieval.

TA plagiarism decisions.

Student plagiarism contests/concerns.

The API is protected by role-based dependencies for student and TA operations.

Security / Reliability Notes

Deterministic grading remains independent of Gemini.

Gemini failures are handled without changing the grade.

Submission size and UTF-8 validation happen before duplicate detection.

Duplicate content is rejected before unnecessary grading/API work.

Plagiarism decisions are explicitly made by a TA.

Student plagiarism concerns are restricted to students involved in the flagged case.

Secrets are loaded from environment variables.

Code execution uses configurable timeout and memory limits.

Important Limitations

Static quality analysis currently depends on the configured analyzer for the submission language.

Language support must be enabled by the execution service; selecting a language in the UI alone does not make a compiler/runtime available.

TF-IDF/cosine similarity is evidence of similarity, not proof of academic misconduct.

Very short or highly standardized assignments can naturally produce high similarity.

Gemini feedback is advisory and can occasionally be unavailable because of API/model limits or service errors.

Development Checks

Backend syntax check:

python -m py_compile app/main.py

For changed backend modules:

python -m py_compile   app/services/plagiarism_service.py   app/services/grading_service.py   app/services/diff_service.py   app/routers/plagiarism.py

Frontend:

npm run dev

For a production build:

npm run build
