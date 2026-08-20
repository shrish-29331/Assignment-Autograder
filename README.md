# Assignment Autograder

A full-stack programming assignment platform for students, instructors, and teaching assistants. It combines deterministic code grading with AI-assisted feedback, plagiarism detection, code comparison, and academic integrity review workflows.

## Features and Role Capabilities

| Feature Area | Student Dashboard | Teaching Assistant Dashboard |
| :--- | :--- | :--- |
| **Account & Settings** | Secure authentication, view local-time deadlines. | Create assignments, configure deadlines and weights. |
| **Submissions** | Submit source code, view history, contest plagiarism flags. | View submissions, monitor grading status, review attempt history. |
| **Grading & Feedback** | Receive deterministic scores, Pylint static analysis, and Gemini advice. | Define visible/hidden test cases, request Gemini analysis. |
| **Plagiarism Workflow** | View automatic flags, see similarity percentages, read TA decisions. | Run checks, view source-code diffs, mark decisions, review contests. |

## Core Systems: Grading and Plagiarism

*   **Deterministic Grading**: The final score is computed through test-case execution, static code-quality analysis, and configured rubrics. AI feedback from Google Gemini is strictly advisory and does not modify the deterministic score.
*   **Plagiarism Detection**: Submissions are processed through a text-similarity pipeline using Token Preprocessing, Porter Stemming, TF-IDF Vectorization, and Cosine Similarity. Pairs with 80% or higher similarity are automatically flagged. 
*   **Review and Contest Workflow**: The system highlights identical files or provides unified source-code diffs. Automatic flags act as evidence for TA review, leaving the final integrity decision to human discretion. Students can submit written concerns regarding flagged cases.
*   **Duplicate Protection**: All validated submissions are hashed using SHA-256. Identical source content submitted for the same assignment is rejected instantly with an HTTP 409 Conflict, reducing unnecessary API calls and grading latency.

## Architecture and Technology Stack

| Architecture Layer | Core Technologies | Primary Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Axios | Client-side routing, user interface, and API communication. |
| **Backend** | Python 3.12, FastAPI, Pydantic, Motor | REST API architecture, JWT authentication, and submission routing. |
| **Database** | MongoDB | Asynchronous storage for users, assignments, submissions, and cases. |
| **Analysis Engine** | Pylint, scikit-learn, NLTK | Code execution (subprocess), static analysis, and text similarity calculation. |
| **AI Integration** | Google Gemini, google-genai | Generating advisory feedback on student code strengths and risks. |

## Local Setup Guidelines

*   **Database**: Deploy MongoDB locally using Docker (`docker run -d -p 27017:27017 mongo:8`).
*   **Backend**: Navigate to the backend directory, create a Python 3.12 virtual environment, install dependencies from `requirements.txt`, and start the server using `uvicorn app.main:app --reload`.
*   **Frontend**: Navigate to the frontend directory, install dependencies via `npm install`, and start the client using `npm run dev`.
*   **Environment Variables**: Create a local `.env` file to store database credentials, JWT secrets, and the Gemini API key. Never commit these secrets to version control.
*   **WSL Development**: If developing on Windows via WSL, ensure the Python virtual environment and Node modules are built directly inside the WSL filesystem rather than copied over from the host.
