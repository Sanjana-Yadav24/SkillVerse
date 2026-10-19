"""
SkillVerse Flask Backend Server
-------------------------------
Provides REST API endpoints for the React + TypeScript frontend:
1. Student Dashboard & Progress Metrics
2. Interactive Skill Proof Graph (Nodes, Edges & Proof Items)
3. Career Goal Selection & Dynamic Skill Gap Analysis (with transparent Readiness Math)
4. Personalized Learning Roadmap with Persistent Milestone Tracking & One-Time XP Rewards
5. Skill Challenges with XP & Skill Graph Boosts
6. Student Project Portfolio (Add / View / Delete Projects)
7. Career Research & Secure TinyFish API Integration Layer
"""

import os
import sys
import uuid
from copy import deepcopy

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "pylibs"))
from datetime import datetime, timezone
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from data.seed_data import load_store, save_store, reset_store
from services.tinyfish_service import (
    get_tinyfish_config,
    fetch_career_research,
    save_tinyfish_key_to_env,
    verify_live_job_posting,
)

# Load environment variables from backend/.env if present
load_dotenv()

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")
CORS(app)

ROADMAP_LEARNING_DISCLAIMER = (
    "Learning Recommendation Only: This roadmap is an educational study guide generated from your "
    "current Skill Proof Graph gaps. Completing roadmap phases, challenges, or target readiness "
    "benchmarks is a learning aid and is not a guarantee of internship readiness, interview selection, or employment."
)


def _enrich_career_goal_roadmap(
    career: dict,
    skills_by_id: dict,
    challenges: list,
    projects: list,
    awarded_ids: set,
) -> dict:
    """
    Attach live skill gap metrics and connected Skill Challenges + Portfolio Projects
    to each roadmap phase so the frontend roadmap stays dynamically connected to
    the student's Skill Graph, Challenges, and Portfolio.
    """
    enriched = deepcopy(career)
    req_map = enriched.get("required_skills", {})
    challenges_by_id = {c["id"]: c for c in challenges}
    projects_by_id = {p["id"]: p for p in projects}

    for milestone in enriched.get("roadmap", []):
        sid = milestone.get("skill_id", "")
        skill_obj = skills_by_id.get(sid, {})
        current_lvl = skill_obj.get("current_level", 0)
        target_lvl = req_map.get(sid, 70)
        gap = max(0, target_lvl - current_lvl)

        milestone["target_skill_name"] = skill_obj.get("name", sid)
        milestone["current_skill_level"] = current_lvl
        milestone["target_skill_level"] = target_lvl
        milestone["current_skill_gap"] = gap
        milestone["xp_awarded"] = bool(
            milestone.get("xp_awarded", False)
            or milestone.get("id") in awarded_ids
            or milestone.get("status") == "completed"
        )

        # Resolve linked Skill Challenges (explicit IDs + any challenge targeting the same skill_id)
        linked_chals = []
        seen_cids = set()
        for cid in milestone.get("linked_challenge_ids", []):
            if cid in challenges_by_id and cid not in seen_cids:
                c = challenges_by_id[cid]
                linked_chals.append({
                    "id": c["id"],
                    "title": c["title"],
                    "skill_id": c["skill_id"],
                    "skill_name": c["skill_name"],
                    "xp_reward": c["xp_reward"],
                    "skill_boost": c["skill_boost"],
                    "completed": c.get("completed", False),
                    "estimated_time": c.get("estimated_time", ""),
                })
                seen_cids.add(cid)

        for c in challenges:
            if c.get("skill_id") == sid and c["id"] not in seen_cids:
                linked_chals.append({
                    "id": c["id"],
                    "title": c["title"],
                    "skill_id": c["skill_id"],
                    "skill_name": c["skill_name"],
                    "xp_reward": c["xp_reward"],
                    "skill_boost": c["skill_boost"],
                    "completed": c.get("completed", False),
                    "estimated_time": c.get("estimated_time", ""),
                })
                seen_cids.add(c["id"])

        milestone["linked_challenges"] = linked_chals

        # Resolve linked Portfolio Projects (explicit IDs + any project linked to the same skill_id)
        linked_projs = []
        seen_pids = set()
        for pid in milestone.get("linked_project_ids", []):
            if pid in projects_by_id and pid not in seen_pids:
                p = projects_by_id[pid]
                linked_projs.append({
                    "id": p["id"],
                    "title": p["title"],
                    "verified_badge": p.get("verified_badge", "Portfolio Project"),
                    "github_url": p.get("github_url", ""),
                    "is_demo": p.get("is_demo", False),
                })
                seen_pids.add(pid)

        for p in projects:
            if sid in p.get("linked_skills", []) and p["id"] not in seen_pids:
                linked_projs.append({
                    "id": p["id"],
                    "title": p["title"],
                    "verified_badge": p.get("verified_badge", "Portfolio Project"),
                    "github_url": p.get("github_url", ""),
                    "is_demo": p.get("is_demo", False),
                })
                seen_pids.add(p["id"])

        milestone["linked_projects"] = linked_projs

    return enriched


def compute_dashboard_payload(store: dict) -> dict:
    """
    Compute derived metrics (skill gaps, readiness %, transparent formula & breakdown,
    enriched roadmap phases, and progress cards) from the current store state so the
    frontend is always mathematically consistent with the displayed Skill Graph.
    """
    student = store["student"]
    skills = store["skills"]
    raw_career_goals = store["career_goals"]
    challenges = store["challenges"]
    projects = store["projects"]

    skills_by_id = {s["id"]: s for s in skills}
    awarded_ids = set(student.get("awarded_milestone_ids", []))

    career_goals = [
        _enrich_career_goal_roadmap(cg, skills_by_id, challenges, projects, awarded_ids)
        for cg in raw_career_goals
    ]

    selected_id = student.get("selected_career_id", "fullstack-ai")
    selected_career = next(
        (c for c in career_goals if c["id"] == selected_id),
        career_goals[0],
    )

    required_map = selected_career.get("required_skills", {})

    # Compute detailed skill gap analysis & transparent Overall Role Readiness breakdown
    skill_gaps = []
    skill_contributions = []
    numerator_numbers = []
    denominator_numbers = []
    total_readiness_points = 0
    total_target_points = 0

    for skill in skills:
        sid = skill["id"]
        current_lvl = skill["current_level"]
        target_lvl = required_map.get(sid, 70)
        effective_pts = min(current_lvl, target_lvl)
        gap = max(0, target_lvl - current_lvl)
        attainment_pct = round((effective_pts / target_lvl) * 100, 1) if target_lvl > 0 else 100.0

        status = "Met" if gap == 0 else ("Near Target" if gap <= 12 else "Priority Gap")
        gap_entry = {
            "skill_id": sid,
            "skill_name": skill["name"],
            "category": skill["category"],
            "current_level": current_lvl,
            "target_level": target_lvl,
            "effective_points": effective_pts,
            "capped": current_lvl > target_lvl,
            "gap": gap,
            "attainment_pct": attainment_pct,
            "status": status,
            "verified_proofs": skill["verified_proofs"],
        }
        skill_gaps.append(gap_entry)
        skill_contributions.append(gap_entry)

        numerator_numbers.append(str(effective_pts))
        denominator_numbers.append(str(target_lvl))
        total_readiness_points += effective_pts
        total_target_points += target_lvl

    exact_ratio_pct = (
        round((total_readiness_points / total_target_points) * 100, 2)
        if total_target_points > 0
        else 75.0
    )
    overall_readiness_pct = (
        int(round((total_readiness_points / total_target_points) * 100))
        if total_target_points > 0
        else 75
    )

    readiness_explanation = {
        "formula": "Overall Role Readiness = round( (Σ min(Student Skill Level_i, Role Benchmark_i) / Σ Role Benchmark_i) × 100 )",
        "cap_note": (
            "Each skill's contribution is capped at its Role Benchmark (min(current_level, target_level)) "
            "so exceeding one target (e.g., Modern UI & Tailwind at 84% vs. 80% benchmark → 80 effective pts) "
            "cannot mask gaps in other required skills."
        ),
        "total_effective_points": total_readiness_points,
        "total_benchmark_points": total_target_points,
        "exact_ratio_pct": exact_ratio_pct,
        "rounded_readiness_pct": overall_readiness_pct,
        "numerator_sum_expr": " + ".join(numerator_numbers),
        "denominator_sum_expr": " + ".join(denominator_numbers),
        "arithmetic_summary": (
            f"({' + '.join(numerator_numbers)}) / ({' + '.join(denominator_numbers)}) "
            f"= {total_readiness_points} / {total_target_points} "
            f"= {exact_ratio_pct:.2f}% → rounds to {overall_readiness_pct}%"
        ),
        "skill_contributions": skill_contributions,
    }

    completed_challenges = sum(1 for c in challenges if c.get("completed"))
    total_challenges = len(challenges)
    total_proofs = sum(s.get("verified_proofs", 0) for s in skills)

    roadmap = selected_career.get("roadmap", [])
    completed_milestones = sum(1 for m in roadmap if m.get("status") == "completed")

    progress_cards = {
        "career_readiness_pct": overall_readiness_pct,
        "target_role_title": selected_career["title"],
        "verified_skill_proofs": total_proofs,
        "active_skills_count": len(skills),
        "challenges_completed": completed_challenges,
        "challenges_total": total_challenges,
        "portfolio_projects_count": len(projects),
        "roadmap_completed": completed_milestones,
        "roadmap_total": len(roadmap),
        "priority_gaps_count": sum(1 for g in skill_gaps if g["gap"] > 12),
    }

    return {
        "is_demo_environment": store.get("is_demo_environment", True),
        "demo_banner": store.get("demo_banner", "DEMO MODE ACTIVE"),
        "roadmap_disclaimer": ROADMAP_LEARNING_DISCLAIMER,
        "tinyfish_status": get_tinyfish_config(),
        "student": student,
        "progress_cards": progress_cards,
        "readiness_explanation": readiness_explanation,
        "selected_career": selected_career,
        "career_goals": career_goals,
        "skills": skills,
        "skill_edges": store.get("skill_edges", []),
        "skill_gaps": skill_gaps,
        "challenges": challenges,
        "projects": projects,
    }


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify Flask server & TinyFish configuration status."""
    return jsonify({
        "status": "ok",
        "service": "SkillVerse Flask API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tinyfish": get_tinyfish_config(),
    })


@app.route("/api/tinyfish/configure", methods=["POST"])
def configure_tinyfish_key():
    """
    Securely save TINYFISH_API_KEY into backend/.env on the server without
    exposing it in logs, chat, or responses, and without overwriting existing settings.
    """
    body = request.get_json(silent=True) or {}
    api_key = (body.get("api_key") or "").strip()
    if not api_key:
        return jsonify({"error": "Please provide a non-empty API key."}), 400

    status = save_tinyfish_key_to_env(api_key)
    return jsonify({
        "saved": True,
        "message": "TINYFISH_API_KEY saved securely to backend/.env. Click 'Verify Backend TinyFish Integration' to test the live connection.",
        "tinyfish_status": status,
    })


@app.route("/api/overview", methods=["GET"])
def get_overview():
    """Return full student dashboard, skill graph, career gap, roadmap, challenges, and portfolio."""
    store = load_store()
    return jsonify(compute_dashboard_payload(store))


@app.route("/api/career-goal/select", methods=["POST"])
def select_career_goal():
    """Switch the student's active career goal and recalculate skill gap analysis."""
    body = request.get_json(silent=True) or {}
    career_id = body.get("career_id")

    store = load_store()
    valid_ids = [c["id"] for c in store["career_goals"]]
    if career_id not in valid_ids:
        return jsonify({"error": f"Invalid career_id. Choose from {valid_ids}"}), 400

    store["student"]["selected_career_id"] = career_id
    save_store(store)
    return jsonify(compute_dashboard_payload(store))


@app.route("/api/roadmap/toggle", methods=["POST"])
def toggle_roadmap_milestone():
    """
    Cycle or explicitly set a roadmap milestone status:
      upcoming -> in_progress -> completed -> upcoming
    Persists milestone status in store.json across page refreshes and server restarts.
    Awards +100 XP ONLY ONCE when a milestone is genuinely marked 'completed' for the first time.
    """
    body = request.get_json(silent=True) or {}
    milestone_id = body.get("milestone_id")
    requested_status = body.get("status")

    if not milestone_id:
        return jsonify({"error": "milestone_id is required"}), 400

    valid_statuses = ("upcoming", "in_progress", "completed")
    if requested_status is not None and requested_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of {valid_statuses}"}), 400

    store = load_store()
    awarded_ids = set(store["student"].get("awarded_milestone_ids", []))

    cycle_order = {
        "upcoming": "in_progress",
        "in_progress": "completed",
        "completed": "upcoming",
    }

    found = False
    xp_awarded_now = 0

    for career in store.get("career_goals", []):
        for item in career.get("roadmap", []):
            if item["id"] == milestone_id:
                old_status = item.get("status", "upcoming")
                already_awarded = bool(
                    item.get("xp_awarded", False)
                    or milestone_id in awarded_ids
                    or old_status == "completed"
                )
                if already_awarded:
                    item["xp_awarded"] = True
                    awarded_ids.add(milestone_id)

                new_status = (
                    requested_status
                    if requested_status is not None
                    else cycle_order.get(old_status, "completed")
                )
                item["status"] = new_status
                found = True

                # Award +100 XP strictly once when genuinely transitioning to 'completed' for the first time
                if new_status == "completed" and old_status != "completed" and not already_awarded:
                    store["student"]["xp"] += 100
                    item["xp_awarded"] = True
                    awarded_ids.add(milestone_id)
                    xp_awarded_now = 100
                break
        if found:
            break

    if not found:
        return jsonify({"error": "Milestone not found"}), 404

    store["student"]["awarded_milestone_ids"] = sorted(awarded_ids)
    store["student"]["level"] = max(1, store["student"]["xp"] // 250 + 1)
    save_store(store)

    payload = compute_dashboard_payload(store)
    payload["last_milestone_update"] = {
        "milestone_id": milestone_id,
        "xp_awarded_now": xp_awarded_now,
    }
    return jsonify(payload)


@app.route("/api/challenges/toggle", methods=["POST"])
def toggle_challenge():
    """
    Toggle completion of a skill challenge.
    Completing a challenge rewards XP and boosts the linked skill node in the Skill Proof Graph!
    """
    body = request.get_json(silent=True) or {}
    challenge_id = body.get("challenge_id")

    store = load_store()
    target_challenge = next(
        (c for c in store["challenges"] if c["id"] == challenge_id),
        None,
    )
    if not target_challenge:
        return jsonify({"error": "Challenge not found"}), 404

    now_completed = not target_challenge.get("completed", False)
    target_challenge["completed"] = now_completed

    xp_delta = target_challenge.get("xp_reward", 200)
    boost = target_challenge.get("skill_boost", 8)
    skill_id = target_challenge.get("skill_id")
    proof_label = f"Completed Challenge: {target_challenge['title']}"

    if now_completed:
        store["student"]["xp"] += xp_delta
    else:
        store["student"]["xp"] = max(0, store["student"]["xp"] - xp_delta)

    store["student"]["level"] = max(1, store["student"]["xp"] // 250 + 1)

    # Update the linked skill node in the Skill Proof Graph
    for skill in store["skills"]:
        if skill["id"] == skill_id:
            old_level = skill["current_level"]
            if now_completed:
                effective_add = target_challenge.pop("reverted_boost", boost)
                new_level = min(100, old_level + effective_add)
                target_challenge["applied_boost"] = new_level - old_level
                skill["current_level"] = new_level
                if proof_label not in skill["proof_items"]:
                    skill["proof_items"].append(proof_label)
                skill["verified_proofs"] = len(skill["proof_items"])
            else:
                revert_boost = target_challenge.pop("applied_boost", boost)
                new_level = max(15, old_level - revert_boost)
                target_challenge["reverted_boost"] = old_level - new_level
                skill["current_level"] = new_level
                if proof_label in skill["proof_items"]:
                    skill["proof_items"].remove(proof_label)
                skill["verified_proofs"] = len(skill["proof_items"])
            break

    save_store(store)
    return jsonify(compute_dashboard_payload(store))


@app.route("/api/projects", methods=["POST"])
def add_project():
    """
    Add a new project to the student's portfolio and link it as proof to selected skills.
    """
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    tagline = (body.get("tagline") or "").strip()
    description = (body.get("description") or "").strip()
    github_url = (body.get("github_url") or "").strip()
    live_url = (body.get("live_url") or "").strip()
    tech_stack = body.get("tech_stack") or []
    linked_skills = body.get("linked_skills") or []

    if not title or not description:
        return jsonify({"error": "Project title and description are required."}), 400

    if isinstance(tech_stack, str):
        tech_stack = [t.strip() for t in tech_stack.split(",") if t.strip()]

    store = load_store()

    new_project = {
        "id": f"proj-{uuid.uuid4().hex[:6]}",
        "title": title,
        "tagline": tagline or "Student Portfolio Submission",
        "description": description,
        "tech_stack": tech_stack if tech_stack else ["React", "Python"],
        "linked_skills": linked_skills if linked_skills else ["react-ts"],
        "github_url": github_url or "https://github.com/student/project",
        "live_url": live_url or "",
        "date_added": datetime.now().strftime("%b %Y"),
        "verified_badge": "Student Added Project",
        "is_demo": False,
    }

    store["projects"].insert(0, new_project)
    store["student"]["xp"] += 150
    store["student"]["level"] = max(1, store["student"]["xp"] // 250 + 1)

    # Boost linked skills in the Skill Proof Graph
    proof_entry = f"Project: {title}"
    for skill in store["skills"]:
        if skill["id"] in new_project["linked_skills"]:
            skill["current_level"] = min(100, skill["current_level"] + 6)
            if proof_entry not in skill["proof_items"]:
                skill["proof_items"].append(proof_entry)
                skill["verified_proofs"] = len(skill["proof_items"])

    save_store(store)
    return jsonify(compute_dashboard_payload(store)), 201


@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id: str):
    """Remove a project from the student portfolio."""
    store = load_store()
    target = next((p for p in store["projects"] if p["id"] == project_id), None)
    if not target:
        return jsonify({"error": "Project not found"}), 404

    store["projects"] = [p for p in store["projects"] if p["id"] != project_id]
    proof_entry = f"Project: {target['title']}"
    for skill in store["skills"]:
        if proof_entry in skill["proof_items"]:
            skill["proof_items"].remove(proof_entry)
            skill["verified_proofs"] = len(skill["proof_items"])

    save_store(store)
    return jsonify(compute_dashboard_payload(store))


@app.route("/api/career-research", methods=["GET"])
def career_research():
    """
    Get internship opportunities, required skill demand, and TinyFish API integration status.
    Uses clearly labelled demo data unless TinyFish is connected.
    """
    role_query = request.args.get("q", "")
    career_track = request.args.get("track", "all")

    store = load_store()
    result = fetch_career_research(
        role_query=role_query,
        career_track=career_track,
        demo_internships=store.get("demo_internships", []),
        student_skills=store.get("skills", []),
        trigger_live_agent=False,
    )
    return jsonify(result)


@app.route("/api/career-research/scan", methods=["POST"])
def trigger_tinyfish_scan():
    """
    Endpoint prepared for triggering a live TinyFish Web Agent scan.
    If TINYFISH_API_KEY is not configured yet, honestly reports that it is not connected
    and returns the demo dataset without pretending to be live.
    """
    body = request.get_json(silent=True) or {}
    role_query = (body.get("q") or "").strip()
    career_track = body.get("track", "all")
    target_url = (body.get("target_url") or "https://www.python.org/jobs/").strip()

    store = load_store()
    result = fetch_career_research(
        role_query=role_query,
        career_track=career_track,
        demo_internships=store.get("demo_internships", []),
        student_skills=store.get("skills", []),
        trigger_live_agent=True,
        target_url=target_url,
    )
    return jsonify(result)


@app.route("/api/career-research/verify-posting", methods=["POST"])
def verify_posting_endpoint():
    """
    Verify a live-extracted job posting by checking if its job_url is reachable (HTTP 200)
    and whether the page content actually contains the displayed company name and job title.
    Then recalculates required skills and match score from the verified job description.
    """
    body = request.get_json(silent=True) or {}
    job_id = (body.get("job_id") or "").strip()
    role_query = (body.get("q") or "").strip()
    career_track = body.get("track", "all")

    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    store = load_store()
    student_skills = store.get("skills", [])
    verification = verify_live_job_posting(job_id=job_id, student_skills=student_skills)
    if "error" in verification:
        return jsonify(verification), 400

    updated_research = fetch_career_research(
        role_query=role_query,
        career_track=career_track,
        demo_internships=store.get("demo_internships", []),
        student_skills=student_skills,
        trigger_live_agent=False,
    )
    updated_research["last_verification"] = verification
    return jsonify(updated_research)


@app.route("/api/reset-demo", methods=["POST"])
def reset_demo_state():
    """Reset the application store back to the initial clean demo dataset."""
    store = reset_store()
    return jsonify(compute_dashboard_payload(store))


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    """Serve the compiled React + TypeScript frontend directly on port 5000."""
    if path and os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(STATIC_DIR, "index.html")
    return jsonify({"message": "SkillVerse API is running on port 5000."})


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
