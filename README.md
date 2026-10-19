# SkillVerse — Student Career Development & Skill Proof Platform

Welcome to **SkillVerse**, a complete full-stack web application built for your college ideathon!

SkillVerse helps college students move beyond static resumes by mapping their **verified proof-of-work** (completed technical challenges and real project repositories) into an **Interactive Skill Proof Graph**, calculating their **Career Skill Gaps**, generating a **Personalized 8-Week Learning Roadmap**, and researching **Internships & Market Skill Demand**.

---

## Tech Stack (Explained Simply)

1. **Frontend (`frontend/` folder):**
   - **React 18 + TypeScript + Vite:** Renders the interactive user interface with strict type safety so bugs are caught early.
   - **Tailwind CSS + Lucide Icons:** Powers the responsive dark navy (`#050814`), purple (`#8B5CF6`), and cyan (`#06B6D4`) theme.
2. **Backend (`backend/` folder):**
   - **Python 3 + Flask:** Runs the REST API server on port `5000` that calculates career readiness, persists completed challenges and projects in `backend/data/store.json`, and protects secret API keys.
3. **Secure TinyFish API Integration (`backend/services/tinyfish_service.py`):**
   - Prepared on the Python backend to read `TINYFISH_API_KEY` from `backend/.env`.
   - **Security Rule:** API keys are **never** placed in the React frontend code.
   - **Honest Demo Fallback:** Until you add a real `TINYFISH_API_KEY` in `backend/.env`, the backend automatically serves **clearly labelled Demo Data** and shows `"TinyFish API Not Connected Yet — Demo Data Active"` in the UI.

---

## Project Folder Structure

```text
skillverse/
├── backend/
│   ├── app.py                        # Main Python Flask API server (Port 5000)
│   ├── requirements.txt              # Python packages (flask, flask-cors, python-dotenv, requests)
│   ├── .env.example                  # Template for backend environment variables (TINYFISH_API_KEY)
│   ├── data/
│   │   ├── seed_data.py              # Initial clearly-labelled Demo Data & JSON persistence helper
│   │   └── store.json                # Auto-generated file storing your live progress
│   └── services/
│       └── tinyfish_service.py       # Secure backend-only TinyFish API wrapper + fallback logic
│
├── frontend/
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Frontend dependencies & scripts
│   ├── vite.config.ts                # Vite server & /api proxy to Flask (http://127.0.0.1:5000)
│   └── src/
│       ├── types/skillverse.ts       # TypeScript interfaces for all features
│       ├── services/api.ts           # Frontend API functions (zero API keys!)
│       ├── components/
│       │   ├── SkillProofGraph.tsx   # Feature 2: Interactive SVG Skill Proof Graph
│       │   ├── CareerGoalGapView.tsx # Features 3 & 4: Career Goal, Gap Analysis & Roadmap
│       │   ├── SkillChallengesView.tsx # Feature 5: Skill Challenges with XP & Graph Boosts
│       │   ├── ProjectPortfolioView.tsx # Feature 6: Project Portfolio (Add/Delete Projects)
│       │   └── CareerResearchView.tsx  # Feature 7: Internships, Skill Demand & TinyFish Status
│       ├── App.tsx                   # Feature 1: Student Dashboard, Progress Cards & Navigation
│       └── main.tsx                  # React root mount
│
└── README.md                         # This setup & architecture guide
```

---

## Features Included

1. **Student Dashboard with Progress Cards:** Displays Career Readiness %, Verified Skill Proofs, Completed Skill Challenges, and Project Portfolio metrics at a glance.
2. **Interactive Skill Proof Graph:** Clickable SVG network graph showing how skills connect and which completed challenges or projects prove each skill.
3. **Career Goal Selection & Skill Gap Analysis:** Switch between 4 career tracks (*AI-Native Full-Stack Engineer*, *Cloud & Distributed Backend Engineer*, *Machine Learning & AI Data Engineer*, *Product Frontend & Design Engineer*) to dynamically compare current vs. required skill levels.
4. **Personalized Learning Roadmap:** 4-phase milestone timeline where students can click any phase to cycle its status (*Upcoming* → *In Progress* → *Completed*).
5. **Skill Challenges with Completion Tracking:** Mark engineering challenges complete to earn XP, level up, and immediately boost the linked skill node in the Skill Proof Graph.
6. **Project Portfolio:** Add new projects with title, description, GitHub URL, live demo link, tech stack tags, and linked skills.
7. **Career Research Page (TinyFish Backend Ready):** Filter curated internship listings, view dynamic skill match scores, inspect market skill demand, and verify the backend TinyFish integration status.

---

## Step-by-Step Setup Instructions (To Run on Your Own Computer Later)

### Step 1: Start the Python Flask Backend
Open a terminal in the `backend/` folder:

```bash
cd backend
pip install -r requirements.txt
python3 app.py
```
The Flask API will start at `http://0.0.0.0:5000`.

### Step 2: Start the React + TypeScript Frontend
Open a second terminal in the `frontend/` folder:

```bash
cd frontend
npm install
npm run dev
```
The React app will start at `http://localhost:5173` and automatically proxy `/api` calls to Flask on port `5000`.

### Step 3 (Optional — When You Are Ready to Connect TinyFish API):
1. Copy `backend/.env.example` to `backend/.env`.
2. Paste your key on the server side only:
   ```env
   TINYFISH_API_KEY=your_actual_tinyfish_key
   ```
3. Restart `python3 app.py`.
