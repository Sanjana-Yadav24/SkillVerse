"""
Automated Audit Test Suite for SkillVerse Career Goal & Roadmap
---------------------------------------------------------------
Uses Python's `unittest` framework and an isolated temporary store file
(`SKILLVERSE_STORE_PATH`) via Flask's `app.test_client()` so real user progress
in `backend/data/store.json` is never overwritten. Also includes a byte-level
snapshot/restore guard and tests restoration under simulated test failure.
"""

from contextlib import contextmanager
import hashlib
import json
import os
import sys
import tempfile
import unittest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_SRC_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "frontend", "src"))
sys.path.insert(0, os.path.join(BACKEND_DIR, "pylibs"))
sys.path.insert(0, BACKEND_DIR)

from app import app  # noqa: E402
from data.seed_data import STORE_PATH  # noqa: E402


@contextmanager
def preserve_production_store(store_file_path: str = STORE_PATH):
    """
    Context manager that snapshots `backend/data/store.json` before a block
    and unconditionally restores the exact bytes in `finally:`, even if an
    exception or assertion failure occurs.
    """
    existed = os.path.exists(store_file_path)
    raw_bytes = None
    if existed:
        with open(store_file_path, "rb") as f:
            raw_bytes = f.read()
    try:
        yield raw_bytes
    finally:
        if existed and raw_bytes is not None:
            with open(store_file_path, "wb") as f:
                f.write(raw_bytes)
        elif not existed and os.path.exists(store_file_path):
            os.remove(store_file_path)


def sha256_of_file(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def compute_expected_readiness(skills: list, required_skills: dict):
    eff = sum(min(s["current_level"], required_skills.get(s["id"], 70)) for s in skills)
    bench = sum(required_skills.get(s["id"], 70) for s in skills)
    exact_pct = round((eff / bench) * 100, 2)
    rounded_pct = int(round((eff / bench) * 100))
    return eff, bench, exact_pct, rounded_pct


class CareerRoadmapAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.prod_store_exists = os.path.exists(STORE_PATH)
        cls.prod_store_hash_before = (
            sha256_of_file(STORE_PATH) if cls.prod_store_exists else None
        )
        cls.prod_store_bytes_before = None
        if cls.prod_store_exists:
            with open(STORE_PATH, "rb") as f:
                cls.prod_store_bytes_before = f.read()

    @classmethod
    def tearDownClass(cls):
        os.environ.pop("SKILLVERSE_STORE_PATH", None)
        if cls.prod_store_exists and cls.prod_store_bytes_before is not None:
            current_hash = sha256_of_file(STORE_PATH) if os.path.exists(STORE_PATH) else None
            if current_hash != cls.prod_store_hash_before:
                with open(STORE_PATH, "wb") as f:
                    f.write(cls.prod_store_bytes_before)

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_store_path = os.path.join(self.temp_dir.name, "test_store.json")
        os.environ["SKILLVERSE_STORE_PATH"] = self.temp_store_path
        self.client = app.test_client()
        res = self.client.post("/api/reset-demo")
        self.assertEqual(res.status_code, 200)

    def tearDown(self):
        os.environ.pop("SKILLVERSE_STORE_PATH", None)
        self.temp_dir.cleanup()

    def test_01_milestone_status_persistence_across_refresh(self):
        """Verify milestone status persists across GET /api/overview reloads and on-disk store."""
        # 1. Cycle rm-fs-2: upcoming -> in_progress
        r1 = self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-2"}).get_json()
        m2 = next(m for m in r1["selected_career"]["roadmap"] if m["id"] == "rm-fs-2")
        self.assertEqual(m2["status"], "in_progress")

        # Simulate browser refresh (GET /api/overview)
        ov1 = self.client.get("/api/overview").get_json()
        m2_reload1 = next(m for m in ov1["selected_career"]["roadmap"] if m["id"] == "rm-fs-2")
        self.assertEqual(m2_reload1["status"], "in_progress")

        # 2. Cycle rm-fs-2: in_progress -> completed
        r2 = self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-2"}).get_json()
        m2_c = next(m for m in r2["selected_career"]["roadmap"] if m["id"] == "rm-fs-2")
        self.assertEqual(m2_c["status"], "completed")

        # Simulate 2nd browser refresh (GET /api/overview) and inspect disk JSON
        ov2 = self.client.get("/api/overview").get_json()
        m2_reload2 = next(m for m in ov2["selected_career"]["roadmap"] if m["id"] == "rm-fs-2")
        self.assertEqual(m2_reload2["status"], "completed")

        with open(self.temp_store_path, "r", encoding="utf-8") as f:
            disk_data = json.load(f)
        disk_status = next(
            m["status"]
            for cg in disk_data["career_goals"]
            if cg["id"] == "fullstack-ai"
            for m in cg["roadmap"]
            if m["id"] == "rm-fs-2"
        )
        self.assertEqual(disk_status, "completed")

    def test_02_one_time_xp_awarding_across_repeated_toggles_and_reloads(self):
        """Verify XP (+100) is awarded strictly once per milestone across cycles and reloads."""
        ov0 = self.client.get("/api/overview").get_json()
        base_xp = ov0["student"]["xp"]
        self.assertEqual(base_xp, 1480)

        # 1st completion of rm-fs-1 (in_progress -> completed): awards +100 XP
        c1 = self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-1"}).get_json()
        self.assertEqual(c1["student"]["xp"], 1580)
        self.assertEqual(c1["last_milestone_update"]["xp_awarded_now"], 100)

        # Reload after 1st completion
        reload_after_c1 = self.client.get("/api/overview").get_json()
        self.assertEqual(reload_after_c1["student"]["xp"], 1580)
        m1_reload = next(
            m for m in reload_after_c1["selected_career"]["roadmap"] if m["id"] == "rm-fs-1"
        )
        self.assertTrue(m1_reload["xp_awarded"])

        # Cycle completed -> upcoming -> in_progress -> completed (2nd completion)
        u1 = self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-1"}).get_json()
        self.assertEqual(u1["student"]["xp"], 1580)

        # Reload while upcoming
        reload_u1 = self.client.get("/api/overview").get_json()
        m1_u1 = next(m for m in reload_u1["selected_career"]["roadmap"] if m["id"] == "rm-fs-1")
        self.assertEqual(m1_u1["status"], "upcoming")
        self.assertTrue(m1_u1["xp_awarded"])

        p1 = self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-1"}).get_json()
        self.assertEqual(p1["student"]["xp"], 1580)

        c2 = self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-1"}).get_json()
        self.assertEqual(c2["student"]["xp"], 1580)
        self.assertEqual(c2["last_milestone_update"]["xp_awarded_now"], 0)

        # Explicit repeated POST status='completed'
        c3 = self.client.post(
            "/api/roadmap/toggle", json={"milestone_id": "rm-fs-1", "status": "completed"}
        ).get_json()
        self.assertEqual(c3["student"]["xp"], 1580)
        self.assertEqual(c3["last_milestone_update"]["xp_awarded_now"], 0)

        # Cycle initially-completed rm-fs-4 (completed -> upcoming -> in_progress -> completed)
        self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-4"})
        self.client.post("/api/roadmap/toggle", json={"milestone_id": "rm-fs-4"})
        fs4_recomplete = self.client.post(
            "/api/roadmap/toggle", json={"milestone_id": "rm-fs-4"}
        ).get_json()
        self.assertEqual(fs4_recomplete["student"]["xp"], 1580)
        self.assertEqual(fs4_recomplete["last_milestone_update"]["xp_awarded_now"], 0)

    def test_03_challenge_completion_and_undo_consistency(self):
        """Verify challenge toggle updates only target skill node, recalculates readiness, and undoes cleanly."""
        ov0 = self.client.get("/api/overview").get_json()
        before_levels = {s["id"]: s["current_level"] for s in ov0["skills"]}
        before_proofs = {s["id"]: list(s["proof_items"]) for s in ov0["skills"]}

        # Complete pending challenge chal-01 (ai-llm: +12% boost, +250 XP)
        c1 = self.client.post("/api/challenges/toggle", json={"challenge_id": "chal-01"}).get_json()
        for s in c1["skills"]:
            if s["id"] == "ai-llm":
                self.assertEqual(s["current_level"], 60)
                self.assertEqual(s["verified_proofs"], 2)
                self.assertIn(
                    "Completed Challenge: Build a Secure Backend API Wrapper for TinyFish",
                    s["proof_items"],
                )
            else:
                self.assertEqual(s["current_level"], before_levels[s["id"]])
        self.assertEqual(c1["progress_cards"]["career_readiness_pct"], 83)  # 507/610 = 83.11%

        # Undo chal-01 and verify exact restoration
        c1_undo = self.client.post(
            "/api/challenges/toggle", json={"challenge_id": "chal-01"}
        ).get_json()
        ai_restored = next(s for s in c1_undo["skills"] if s["id"] == "ai-llm")
        self.assertEqual(ai_restored["current_level"], 48)
        self.assertEqual(ai_restored["proof_items"], before_proofs["ai-llm"])
        self.assertEqual(ai_restored["verified_proofs"], 1)
        self.assertEqual(c1_undo["progress_cards"]["career_readiness_pct"], 81)

        # Undo initially-completed challenge chal-02 (react-ts: 78% -> 70%) and re-complete (70% -> 78%)
        c2_undo = self.client.post(
            "/api/challenges/toggle", json={"challenge_id": "chal-02"}
        ).get_json()
        rt_undo = next(s for s in c2_undo["skills"] if s["id"] == "react-ts")
        self.assertEqual(rt_undo["current_level"], 70)
        self.assertEqual(rt_undo["verified_proofs"], 2)
        self.assertEqual(c2_undo["progress_cards"]["career_readiness_pct"], 80)  # 487/610 = 79.84%

        c2_redo = self.client.post(
            "/api/challenges/toggle", json={"challenge_id": "chal-02"}
        ).get_json()
        rt_redo = next(s for s in c2_redo["skills"] if s["id"] == "react-ts")
        self.assertEqual(rt_redo["current_level"], 78)
        self.assertEqual(rt_redo["verified_proofs"], 3)
        self.assertEqual(c2_redo["progress_cards"]["career_readiness_pct"], 81)

        # Test floor clamping (15% minimum) when undoing a challenge on a low-level skill
        with open(self.temp_store_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for s in data["skills"]:
            if s["id"] == "react-ts":
                s["current_level"] = 18  # 18 - 8 would be 10, clamped to 15 (actual reduction = 3)
        with open(self.temp_store_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

        floor_undo = self.client.post(
            "/api/challenges/toggle", json={"challenge_id": "chal-02"}
        ).get_json()
        rt_floor = next(s for s in floor_undo["skills"] if s["id"] == "react-ts")
        self.assertEqual(rt_floor["current_level"], 15)

        floor_redo = self.client.post(
            "/api/challenges/toggle", json={"challenge_id": "chal-02"}
        ).get_json()
        rt_floor_redo = next(s for s in floor_redo["skills"] if s["id"] == "react-ts")
        self.assertEqual(rt_floor_redo["current_level"], 18)

    def test_04_connected_challenge_and_portfolio_links_and_source_verification(self):
        """Verify linked challenges/projects resolve valid IDs and navigation/anchor code is present."""
        ov = self.client.get("/api/overview").get_json()
        challenge_ids = {c["id"] for c in ov["challenges"]}
        project_ids = {p["id"] for p in ov["projects"]}

        for cg in ov["career_goals"]:
            for m in cg["roadmap"]:
                self.assertGreaterEqual(len(m["linked_challenges"]), 1)
                self.assertGreaterEqual(len(m["linked_projects"]), 1)
                for lc in m["linked_challenges"]:
                    self.assertIn(lc["id"], challenge_ids)
                for lp in m["linked_projects"]:
                    self.assertIn(lp["id"], project_ids)

        # Check TypeScript source files for navigation wiring and target element IDs
        with open(os.path.join(FRONTEND_SRC_DIR, "App.tsx"), "r", encoding="utf-8") as f:
            app_tsx = f.read()
        self.assertIn("setActiveTab('challenges')", app_tsx)
        self.assertIn("setActiveTab('portfolio')", app_tsx)
        self.assertIn("focusedChallengeId={focusedChallengeId}", app_tsx)
        self.assertIn("focusedProjectId={focusedProjectId}", app_tsx)

        with open(
            os.path.join(FRONTEND_SRC_DIR, "components", "CareerGoalGapView.tsx"),
            "r",
            encoding="utf-8",
        ) as f:
            cg_tsx = f.read()
        self.assertIn("onNavigateChallenges(ch.id)", cg_tsx)
        self.assertIn("onNavigatePortfolio(pr.id)", cg_tsx)

        with open(
            os.path.join(FRONTEND_SRC_DIR, "components", "SkillChallengesView.tsx"),
            "r",
            encoding="utf-8",
        ) as f:
            sc_tsx = f.read()
        self.assertIn("id={`challenge-card-${challenge.id}`}", sc_tsx)

        with open(
            os.path.join(FRONTEND_SRC_DIR, "components", "ProjectPortfolioView.tsx"),
            "r",
            encoding="utf-8",
        ) as f:
            pp_tsx = f.read()
        self.assertIn("id={`project-card-${proj.id}`}", pp_tsx)

    def test_05_readiness_mathematical_consistency_across_all_tracks_and_cap(self):
        """Verify Overall Role Readiness math across all 4 career tracks and benchmark capping."""
        expected_by_track = {
            "fullstack-ai": (495, 610, 81.15, 81),
            "backend-cloud": (442, 595, 74.29, 74),
            "data-ml": (437, 577, 75.74, 76),
            "frontend-ux": (483, 570, 84.74, 85),
        }
        for track_id, (exp_eff, exp_bench, exp_exact, exp_round) in expected_by_track.items():
            res = self.client.post(
                "/api/career-goal/select", json={"career_id": track_id}
            ).get_json()
            rexp = res["readiness_explanation"]
            eff, bench, exact_pct, rounded_pct = compute_expected_readiness(
                res["skills"], res["selected_career"]["required_skills"]
            )
            self.assertEqual((eff, bench, exact_pct, rounded_pct), (exp_eff, exp_bench, exp_exact, exp_round))
            self.assertEqual(res["progress_cards"]["career_readiness_pct"], exp_round)
            self.assertEqual(rexp["total_effective_points"], exp_eff)
            self.assertEqual(rexp["total_benchmark_points"], exp_bench)
            self.assertEqual(rexp["exact_ratio_pct"], exp_exact)
            self.assertEqual(rexp["rounded_readiness_pct"], exp_round)

    def test_06_store_isolation_and_failure_restoration_guarantee(self):
        """Verify production backend/data/store.json is untouched and restored even on exception."""
        if self.prod_store_exists:
            self.assertEqual(sha256_of_file(STORE_PATH), self.prod_store_hash_before)

        # Also test `preserve_production_store` against a dummy file when an exception occurs
        dummy_store = os.path.join(self.temp_dir.name, "dummy_prod_store.json")
        original_payload = '{"student": {"xp": 9999}, "custom_progress": true}\n'
        with open(dummy_store, "w", encoding="utf-8") as f:
            f.write(original_payload)
        original_hash = sha256_of_file(dummy_store)

        with self.assertRaises(RuntimeError):
            with preserve_production_store(dummy_store):
                with open(dummy_store, "w", encoding="utf-8") as f:
                    f.write('{"student": {"xp": 0}, "corrupted": true}\n')
                raise RuntimeError("Simulated mid-test failure")

        self.assertEqual(sha256_of_file(dummy_store), original_hash)
        with open(dummy_store, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), original_payload)


if __name__ == "__main__":
    unittest.main(verbosity=2)
