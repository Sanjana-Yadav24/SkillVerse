"""
TinyFish API Secure Backend Service Layer
-----------------------------------------
SECURITY & DATA CONSISTENCY NOTES:
- Runs strictly on the Python Flask backend server.
- Reads `TINYFISH_API_KEY` from `backend/.env` on the server.
- Sends `X-API-Key` header to `https://agent.tinyfish.ai/v1/automation/run`.
- NEVER exposes `TINYFISH_API_KEY` (or any substring of it) in frontend code,
  logs, chat, or API responses.
- Separates live-extracted listings from demo listings.
- Never invents missing fields (uses "Not available").
- Detects conflicts between listing header/index location and job description
  location, showing "Location conflict — verify manually" with exact details.
- Keeps HTTP reachability + title/company matching separate from application
  status ("Application status unknown" unless the page explicitly states it is
  currently accepting applications).
- Provides a transparent match-score explanation (formula, per-skill attainment,
  matched skills meeting target vs. matched skills below target).
"""

from datetime import datetime, timezone
import html
import json
import os
import re
from urllib.parse import urljoin
import requests
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
VERIFIED_CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "tinyfish_verified.json"
)

DEFAULT_TINYFISH_URL = "https://agent.tinyfish.ai/v1/automation/run"
DEFAULT_TARGET_JOBS_URL = "https://www.python.org/jobs/"

PLACEHOLDER_KEYS = {
    "",
    "your_tinyfish_api_key_here",
    "paste_your_key_here",
    "none",
    "null",
}

SKILL_GRAPH_KEYWORD_RULES: List[Dict[str, Any]] = [
    {
        "skill_id": "react-ts",
        "skill_name": "React & TypeScript",
        "keywords": [
            "react",
            "typescript",
            "javascript",
            "front-end",
            "front end",
            "frontend",
            "full-stack",
            "full stack",
            "fullstack",
            "spa",
            "next.js",
            "vue",
            "angular",
        ],
    },
    {
        "skill_id": "ui-tailwind",
        "skill_name": "Modern UI & Tailwind",
        "keywords": [
            "user experience",
            "user-facing",
            "responsive",
            "ui",
            "ux",
            "tailwind",
            "css",
            "html",
            "design system",
            "front-end",
            "front end",
            "frontend",
        ],
    },
    {
        "skill_id": "python-flask",
        "skill_name": "Python & Flask APIs",
        "keywords": [
            "python",
            "flask",
            "fastapi",
            "django",
            "rest",
            "restful",
            "api",
            "apis",
            "backend",
            "back-end",
            "back end",
            "pytest",
            "pep8",
            "openapi",
            "swagger",
        ],
    },
    {
        "skill_id": "sql-db",
        "skill_name": "SQL & Data Modeling",
        "keywords": [
            "sql",
            "postgresql",
            "postgres",
            "mysql",
            "database",
            "databases",
            "alembic",
            "schema",
            "migrations",
            "dynamodb",
            "mongodb",
            "redis",
            "data preparation",
            "data fusion",
            "sqlalchemy",
        ],
    },
    {
        "skill_id": "ai-llm",
        "skill_name": "LLM & Web Agent APIs",
        "keywords": [
            "machine learning",
            "ml",
            "large language models",
            "llms",
            "llm",
            "ai-powered",
            "ai",
            "artificial intelligence",
            "deep learning",
            "validated models",
            "fitted, validated model",
            "price prediction",
            "nlp",
            "agent",
        ],
    },
    {
        "skill_id": "dsa-algo",
        "skill_name": "Data Structures & Algorithms",
        "keywords": [
            "algorithm",
            "algorithms",
            "data structures",
            "trading system",
            "order-book",
            "short-horizon",
            "pricing capability",
            "quantitative",
            "hft",
            "optimization",
            "out-of-sample",
        ],
    },
    {
        "skill_id": "git-devops",
        "skill_name": "Git, Docker & CI/CD",
        "keywords": [
            "ci/cd",
            "gitlab",
            "github",
            "docker",
            "kubernetes",
            "aws",
            "lambda",
            "cloud",
            "deploy",
            "deployment",
            "devops",
            "terraform",
            "linux",
        ],
    },
    {
        "skill_id": "system-design",
        "skill_name": "System Design & Architecture",
        "keywords": [
            "architecture",
            "system design",
            "scalable",
            "scale",
            "distributed",
            "microservices",
            "multi-domain",
            "api gateway",
            "eventbridge",
            "senior",
            "staff engineer",
            "lead",
        ],
    },
]


def _load_verified_state() -> Dict[str, Any]:
    if os.path.exists(VERIFIED_CACHE_PATH):
        try:
            with open(VERIFIED_CACHE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "verified_live": False,
        "last_run_id": None,
        "last_error": None,
        "last_live_result": None,
        "posting_verifications": {},
    }


def _save_verified_state(state: Dict[str, Any]) -> None:
    try:
        os.makedirs(os.path.dirname(VERIFIED_CACHE_PATH), exist_ok=True)
        with open(VERIFIED_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass


_VERIFIED_LIVE_STATE: Dict[str, Any] = _load_verified_state()
if "posting_verifications" not in _VERIFIED_LIVE_STATE or not isinstance(
    _VERIFIED_LIVE_STATE.get("posting_verifications"), dict
):
    _VERIFIED_LIVE_STATE["posting_verifications"] = {}


def _read_server_key() -> str:
    """Reload backend/.env and read TINYFISH_API_KEY on the server only."""
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    return (os.getenv("TINYFISH_API_KEY") or "").strip()


def save_tinyfish_key_to_env(new_key: str) -> Dict[str, Any]:
    """
    Securely update ONLY the TINYFISH_API_KEY= line in backend/.env
    without overwriting any other settings. Never logs or returns the key.
    """
    cleaned = (new_key or "").strip()
    lines: List[str] = []
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()

    updated_lines: List[str] = []
    found = False
    for line in lines:
        if line.startswith("TINYFISH_API_KEY="):
            updated_lines.append(f"TINYFISH_API_KEY={cleaned}")
            found = True
        else:
            updated_lines.append(line)

    if not found:
        updated_lines.append(f"TINYFISH_API_KEY={cleaned}")

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(updated_lines) + "\n")
    try:
        os.chmod(ENV_PATH, 0o600)
    except Exception:
        pass

    os.environ["TINYFISH_API_KEY"] = cleaned
    _VERIFIED_LIVE_STATE["verified_live"] = False
    return get_tinyfish_config()


def _read_api_url() -> str:
    """Read documented TinyFish endpoint URL."""
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    url = (os.getenv("TINYFISH_API_URL") or "").strip()
    if not url or "mage.tinyfish.io" in url:
        return DEFAULT_TINYFISH_URL
    return url


def get_tinyfish_config() -> Dict[str, Any]:
    """
    Inspect the server environment to check if TINYFISH_API_KEY is present
    and whether a real TinyFish API request has been verified.
    Never returns the API key or any characters from it.
    """
    raw_key = _read_server_key()
    api_url = _read_api_url()

    key_present = bool(raw_key) and raw_key.lower() not in PLACEHOLDER_KEYS
    is_live_verified = bool(key_present and _VERIFIED_LIVE_STATE.get("verified_live"))

    if not key_present:
        mode = "DEMO_DATA_FALLBACK"
        status_label = "TinyFish API Not Connected — Showing Clearly Labelled Demo Data"
    elif is_live_verified:
        mode = "LIVE_TINYFISH_API"
        status_label = "TinyFish API Connected & Verified (Live Server-Side Integration)"
    else:
        mode = "DEMO_DATA_FALLBACK"
        status_label = (
            "TINYFISH_API_KEY Detected in backend/.env — Click 'Run Live TinyFish Web Agent Scan' to test live request"
        )

    return {
        "connected": is_live_verified,
        "key_present": key_present,
        "mode": mode,
        "api_url": api_url,
        "masked_key": None,
        "env_var_name": "TINYFISH_API_KEY",
        "status_label": status_label,
        "setup_hint": (
            "Add TINYFISH_API_KEY=your_key in backend/.env, restart the Flask server, "
            "and click 'Run Live TinyFish Web Agent Scan' to run a real test call."
        ),
    }


def _extract_raw_jobs_list(raw_res: Any) -> List[Dict[str, Any]]:
    """
    Normalize the `result` field from TinyFish's documented response payload.
    """
    if isinstance(raw_res, list):
        return [item for item in raw_res if isinstance(item, dict)]

    if isinstance(raw_res, dict):
        for key in ("jobs", "listings", "job_listings", "result", "items", "data"):
            candidate = raw_res.get(key)
            if isinstance(candidate, list):
                return [item for item in candidate if isinstance(item, dict)]

    return []


def _dedupe_location_string(raw_loc: str) -> str:
    """Clean repeated comma-separated segments in a location string without altering meaning."""
    if not raw_loc:
        return ""
    parts = [p.strip() for p in raw_loc.split(",") if p.strip()]
    deduped: List[str] = []
    for p in parts:
        if p not in deduped:
            deduped.append(p)
    return ", ".join(deduped)


def _locations_conflict(loc_a: str, loc_b: str) -> bool:
    """
    Determine whether two non-empty location strings from the same posting conflict
    (e.g., header says 'Tallinn, Harju County, Estonia' while description says 'USA & LATAM | Remote').
    """
    a = re.sub(r"[^a-z0-9]+", " ", (loc_a or "").lower()).strip()
    b = re.sub(r"[^a-z0-9]+", " ", (loc_b or "").lower()).strip()
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return False
    tokens_a = set(a.split())
    tokens_b = set(b.split())
    # If they share no meaningful geographic tokens, they conflict
    overlap = tokens_a.intersection(tokens_b)
    return len(overlap) == 0


def analyze_job_against_skill_graph(
    title: str,
    company: str,
    description_text: str,
    student_skills: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Deterministically match a job's actual title + verified description text
    (stripping occurrences of the company name so a company named 'HFT Architecture'
    doesn't trigger the 'architecture' skill keyword) against the student's Skill Proof Graph.
    """
    clean_desc = description_text or ""
    if company and company.strip():
        clean_desc = re.sub(re.escape(company.strip()), " ", clean_desc, flags=re.I)
    combined_text = f"{title} {clean_desc}".lower()
    skill_by_id = {s["id"]: s for s in student_skills}

    matched_skill_ids: List[str] = []
    skill_matched_keywords: Dict[str, List[str]] = {}
    detected_keywords: List[str] = []

    for rule in SKILL_GRAPH_KEYWORD_RULES:
        sid = rule["skill_id"]
        found_for_skill: List[str] = []
        for kw in rule["keywords"]:
            pattern = r"(?<![a-z0-9])" + re.escape(kw) + r"(?![a-z0-9])"
            if re.search(pattern, combined_text):
                found_for_skill.append(kw)
        if found_for_skill:
            matched_skill_ids.append(sid)
            skill_matched_keywords[sid] = found_for_skill
            for kw in found_for_skill[:2]:
                if kw not in detected_keywords:
                    detected_keywords.append(kw)

    title_lower = title.lower()
    if any(w in title_lower for w in ("senior staff", "principal", "staff")):
        role_target = 88
        seniority_label = "Senior / Staff Benchmark (88% target)"
    elif any(w in title_lower for w in ("senior", "lead", "sr.")):
        role_target = 82
        seniority_label = "Senior Benchmark (82% target)"
    elif any(w in title_lower for w in ("junior", "intern", "entry", "graduate")):
        role_target = 65
        seniority_label = "Junior / Entry Benchmark (65% target)"
    elif "middle+ to senior" in combined_text:
        role_target = 82
        seniority_label = "Mid-to-Senior Benchmark (82% target)"
    else:
        role_target = 75
        seniority_label = "Mid-Level Benchmark (75% target)"

    formula_str = (
        "Match Score = round( average across N matched skills of min(100, (Student Skill Level / Role Target) * 100) )"
    )

    if not matched_skill_ids:
        return {
            "required_skills": [],
            "detected_keywords": [],
            "match_score": None,
            "missing_skills_hint": [
                "Not available — Click 'Verify posting' to fetch the full job description and calculate skill gaps."
            ],
            "career_track": "fullstack-ai",
            "seniority_label": seniority_label,
            "score_explanation": {
                "formula": formula_str,
                "role_target_pct": role_target,
                "seniority_label": seniority_label,
                "matched_skills_count": 0,
                "calculation_steps": [],
                "arithmetic_summary": "Not available (no matched skills extracted yet)",
                "skills_meeting_target": [],
                "skills_below_target": [],
                "unmatched_graph_skills": [s["name"] for s in student_skills],
            },
        }

    required_skill_names: List[str] = []
    ratios: List[float] = []
    gap_hints: List[str] = []
    calculation_steps: List[str] = []
    skills_meeting_target: List[str] = []
    skills_below_target: List[str] = []

    for sid in matched_skill_ids:
        s_obj = skill_by_id.get(sid)
        if not s_obj:
            continue
        s_name = s_obj["name"]
        s_lvl = int(s_obj.get("current_level", 50))
        kws = ", ".join(skill_matched_keywords.get(sid, [])[:3])

        ratio = min(100.0, (s_lvl / float(role_target)) * 100.0)
        ratios.append(ratio)
        gap = role_target - s_lvl

        required_skill_names.append(f"{s_name} (Your Level: {s_lvl}% / Target: {role_target}%)")
        calculation_steps.append(
            f"{s_name} [matched via: {kws}]: min(100, {s_lvl}% / {role_target}% × 100) = {ratio:.1f}%"
        )

        if gap > 0:
            msg = f"{s_name}: Your graph is at {s_lvl}% vs. {role_target}% target (-{gap}% gap)"
            gap_hints.append(msg)
            skills_below_target.append(f"{s_name} ({s_lvl}% vs {role_target}% target, -{gap}% gap)")
        else:
            skills_meeting_target.append(f"{s_name} ({s_lvl}% >= {role_target}% target)")

    unmatched_graph_skills = [
        s["name"] for s in student_skills if s["id"] not in matched_skill_ids
    ]

    avg_exact = sum(ratios) / len(ratios) if ratios else 0.0
    match_score = int(round(avg_exact)) if ratios else None

    terms_str = " + ".join(f"{r:.1f}%" for r in ratios)
    arithmetic_summary = (
        f"({terms_str}) / {len(ratios)} = {avg_exact:.2f}% → rounds to {match_score}%"
    )

    if not gap_hints:
        gap_hints.append(
            f"All {len(required_skill_names)} matched skills in your graph meet or exceed the {role_target}% benchmark."
        )

    if "ai-llm" in matched_skill_ids and "react-ts" not in matched_skill_ids:
        career_track = "data-ml"
    elif "react-ts" in matched_skill_ids and "python-flask" in matched_skill_ids:
        career_track = "fullstack-ai"
    elif "react-ts" in matched_skill_ids:
        career_track = "frontend-ux"
    else:
        career_track = "backend-cloud"

    return {
        "required_skills": required_skill_names,
        "detected_keywords": detected_keywords,
        "match_score": match_score,
        "missing_skills_hint": gap_hints,
        "career_track": career_track,
        "seniority_label": seniority_label,
        "score_explanation": {
            "formula": formula_str,
            "role_target_pct": role_target,
            "seniority_label": seniority_label,
            "matched_skills_count": len(ratios),
            "calculation_steps": calculation_steps,
            "arithmetic_summary": arithmetic_summary,
            "skills_meeting_target": skills_meeting_target,
            "skills_below_target": skills_below_target,
            "unmatched_graph_skills": unmatched_graph_skills,
        },
    }


def _parse_job_page_details(
    page_html: str,
    index_location: str,
    expected_title: str,
    expected_company: str,
) -> Dict[str, Any]:
    """
    Parse a single job posting HTML document to ensure title, company, location,
    description, keywords, and application status all come from that same posting URL.
    """
    cleaned_html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", page_html, flags=re.S | re.I)

    # 1. Extract header location from `<span class="listing-location">...</span>` on the posting page
    header_loc_match = re.search(
        r'<span\s+class="listing-location"[^>]*>(.*?)</span>',
        cleaned_html,
        flags=re.S | re.I,
    )
    header_location = ""
    if header_loc_match:
        header_location = _dedupe_location_string(
            html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", header_loc_match.group(1)))).strip()
        )

    # 2. Extract `.job-description` block from the same page
    desc_match = re.search(
        r'<div\s+class="job-description"[^>]*>(.*?)</div>\s*(?:<!--\s*end\s*\.job-post-content|<div\s+class="job-post-meta")',
        cleaned_html,
        flags=re.S | re.I,
    ) or re.search(
        r'<div\s+class="job-description"[^>]*>(.*?)</div>',
        cleaned_html,
        flags=re.S | re.I,
    )
    raw_desc_html = desc_match.group(1) if desc_match else cleaned_html

    # Check if the description body has an explicit `Location: ...` paragraph/line
    desc_loc_match = re.search(
        r"(?:<p[^>]*>|\b)Location\s*:\s*([^<\n\r]+)",
        raw_desc_html,
        flags=re.I,
    )
    description_location = ""
    if desc_loc_match:
        description_location = _dedupe_location_string(
            html.unescape(desc_loc_match.group(1)).strip()
        )

    # 3. Resolve location and check for conflicts between sources (Requirement 1 & 5)
    primary_header_or_index_loc = header_location or _dedupe_location_string(index_location)
    location_conflict = False
    location_conflict_detail: Optional[str] = None

    if primary_header_or_index_loc and description_location:
        if _locations_conflict(primary_header_or_index_loc, description_location):
            location_conflict = True
            resolved_location = "Location conflict — verify manually"
            location_conflict_detail = (
                f"Posting header/index lists '{primary_header_or_index_loc}', "
                f"while the verified job description body states 'Location: {description_location}'."
            )
        else:
            resolved_location = description_location
    elif description_location:
        resolved_location = description_location
    elif primary_header_or_index_loc:
        resolved_location = primary_header_or_index_loc
    else:
        resolved_location = "Not available"

    desc_text = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw_desc_html))).strip()
    full_page_text = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cleaned_html))).strip()

    desc_body = re.sub(
        r"^Job Title\s+.*?\s+Job Description\s+",
        "",
        desc_text,
        flags=re.I,
    ).strip()

    norm_full = full_page_text.lower()
    norm_title = (expected_title or "").strip().lower()
    norm_company = (expected_company or "").strip().lower()

    title_matched = bool(norm_title and norm_title in norm_full)
    company_matched = bool(norm_company and norm_company in norm_full)

    # 4. Determine Application Status strictly from explicit statements on the page (Requirement 3)
    if re.search(
        r"\b(no longer accepting applications|position has been filled|job is closed|listing has expired|applications are closed)\b",
        norm_full,
    ):
        application_status = "Closed / No longer accepting applications"
    elif re.search(
        r"\b(currently accepting applications|applications are currently open|actively accepting applications)\b",
        norm_full,
    ):
        application_status = "Currently accepting applications"
    else:
        application_status = "Application status unknown"

    # 5. Extract compensation ONLY if explicitly stated in the page text
    comp_match = re.search(
        r"((?:Base salary|Salary|Compensation|Stipend|Pay)\s*:\s*[^.;\n]{5,60}|(?:USD|EUR|GBP|INR|\$|£|€|₹)\s?\d[\d,]*(?:\s?[–\-to]+\s?(?:USD|EUR|GBP|INR|\$|£|€|₹)?\s?\d[\d,]*)?(?:\s*(?:a year|per year|/yr|/month|per month|/mo|per annum))?)",
        full_page_text,
        flags=re.I,
    )
    extracted_compensation = comp_match.group(1).strip() if comp_match else "Not available"

    # 6. Extract posted date / employment type ONLY if present on the page
    posted_match = re.search(
        r"Posted\s*:?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})",
        full_page_text,
        flags=re.I,
    )
    emp_match = re.search(
        r"Employment Type\s*:\s*([A-Za-z0-9,\-\s/]+?)(?=\s+(?:What You|Who You|Requirements|Responsibilities|About|Location|Job|$))",
        full_page_text,
        flags=re.I,
    )

    duration_parts = []
    if emp_match:
        duration_parts.append(emp_match.group(1).strip())
    if posted_match:
        duration_parts.append(f"Posted {posted_match.group(1).strip()}")
    extracted_duration = " • ".join(duration_parts) if duration_parts else "Not available"

    excerpt = desc_body[:420] + ("..." if len(desc_body) > 420 else "") if desc_body else "Not available"

    return {
        "title_matched": title_matched,
        "company_matched": company_matched,
        "header_location": header_location or "Not available",
        "description_location": description_location or "Not available",
        "resolved_location": resolved_location,
        "location_conflict": location_conflict,
        "location_conflict_detail": location_conflict_detail,
        "application_status": application_status,
        "full_description_text": desc_body or full_page_text,
        "description_excerpt": excerpt,
        "extracted_compensation": extracted_compensation,
        "extracted_duration": extracted_duration,
    }


def verify_live_job_posting(
    job_id: str,
    student_skills: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Verify a specific live-extracted job posting by fetching its `job_url`
    and checking whether:
    1. The URL is reachable (HTTP 200).
    2. The page content actually contains the displayed company name and job title.
    3. Whether the header/index location and description body location agree or conflict.
    4. Whether application status is explicitly stated or unknown.
    """
    cached_live = _VERIFIED_LIVE_STATE.get("last_live_result")
    if not isinstance(cached_live, dict):
        return {"error": "No live TinyFish scan result found to verify."}

    target_url = cached_live.get("target_url") or DEFAULT_TARGET_JOBS_URL
    jobs_list = _extract_raw_jobs_list(cached_live.get("result"))

    target_idx = None
    if job_id.startswith("live-tf-"):
        try:
            target_idx = int(job_id.split("live-tf-")[1]) - 1
        except Exception:
            target_idx = None

    if target_idx is None or target_idx < 0 or target_idx >= len(jobs_list):
        return {"error": f"Live job listing '{job_id}' not found."}

    job_entry = jobs_list[target_idx]
    title = (job_entry.get("title") or job_entry.get("job_title") or "").strip()
    company = (job_entry.get("company") or job_entry.get("company_name") or "").strip()
    raw_url = (job_entry.get("job_url") or job_entry.get("url") or "").strip()
    index_location = (job_entry.get("location") or "").strip()

    if not raw_url:
        verification_record = {
            "status": "Unverified",
            "verified": False,
            "http_status": None,
            "title_matched": False,
            "company_matched": False,
            "application_status": "Application status unknown",
            "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "reason": "No job URL was present on the listing to verify.",
        }
        _VERIFIED_LIVE_STATE["posting_verifications"][job_id] = verification_record
        _save_verified_state(_VERIFIED_LIVE_STATE)
        return verification_record

    resolved_url = urljoin(target_url, raw_url)

    try:
        resp = requests.get(
            resolved_url,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (compatible; SkillVerseVerifier/1.0)"},
            allow_redirects=True,
        )
        http_status = resp.status_code

        if http_status != 200:
            verification_record = {
                "status": "Unverified",
                "verified": False,
                "http_status": http_status,
                "verified_source_url": resp.url,
                "title_matched": False,
                "company_matched": False,
                "application_status": "Application status unknown",
                "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                "reason": f"Job URL returned HTTP {http_status} (could not confirm posting page).",
            }
        else:
            parsed = _parse_job_page_details(
                page_html=resp.text,
                index_location=index_location,
                expected_title=title,
                expected_company=company,
            )
            is_confirmed = bool(parsed["title_matched"] and parsed["company_matched"])

            if is_confirmed:
                verification_record = {
                    "status": "Verified",
                    "verified": True,
                    "http_status": 200,
                    "verified_source_url": resp.url,
                    "verified_title": title,
                    "verified_company": company,
                    "title_matched": True,
                    "company_matched": True,
                    "header_location": parsed["header_location"],
                    "description_location": parsed["description_location"],
                    "resolved_location": parsed["resolved_location"],
                    "location_conflict": parsed["location_conflict"],
                    "location_conflict_detail": parsed["location_conflict_detail"],
                    "application_status": parsed["application_status"],
                    "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                    "reason": (
                        f"URL reachable (HTTP 200 at {resp.url}); page content matches company ('{company}') and title ('{title}')."
                    ),
                    "description_excerpt": parsed["description_excerpt"],
                    "full_description_text": parsed["full_description_text"],
                    "extracted_compensation": parsed["extracted_compensation"],
                    "extracted_duration": parsed["extracted_duration"],
                }
            else:
                missing_parts = []
                if not parsed["company_matched"]:
                    missing_parts.append(f"company '{company}'")
                if not parsed["title_matched"]:
                    missing_parts.append(f"title '{title}'")
                verification_record = {
                    "status": "Unverified",
                    "verified": False,
                    "http_status": 200,
                    "verified_source_url": resp.url,
                    "title_matched": parsed["title_matched"],
                    "company_matched": parsed["company_matched"],
                    "application_status": "Application status unknown",
                    "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                    "reason": f"URL was reachable (HTTP 200), but could not confirm {' and '.join(missing_parts)} on the destination page.",
                }

    except Exception as exc:
        verification_record = {
            "status": "Unverified",
            "verified": False,
            "http_status": None,
            "verified_source_url": resolved_url,
            "title_matched": False,
            "company_matched": False,
            "application_status": "Application status unknown",
            "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "reason": f"Could not reach job URL ({str(exc)[:120]}).",
        }

    _VERIFIED_LIVE_STATE["posting_verifications"][job_id] = verification_record
    _save_verified_state(_VERIFIED_LIVE_STATE)
    return verification_record


def _build_live_cards(
    cached_live: Any,
    student_skills: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Build live-extracted job cards strictly from extracted & verified data.
    Ensures company, title, location, description, and keywords all belong to the
    same verified posting URL. Surfaces location conflicts and application status
    honestly without inventing data.
    """
    live_cards: List[Dict[str, Any]] = []
    if not isinstance(cached_live, dict):
        return live_cards

    target_url = cached_live.get("target_url") or DEFAULT_TARGET_JOBS_URL
    raw_res = cached_live.get("result")
    jobs_list = _extract_raw_jobs_list(raw_res)
    verifications = _VERIFIED_LIVE_STATE.get("posting_verifications") or {}

    for idx, j in enumerate(jobs_list[:5]):
        job_id = f"live-tf-{idx+1}"
        role_title = (
            j.get("title")
            or j.get("job_title")
            or j.get("role")
            or ""
        ).strip()
        company_name = (
            j.get("company")
            or j.get("company_name")
            or j.get("employer")
            or ""
        ).strip()
        raw_job_url = (
            j.get("job_url")
            or j.get("url")
            or j.get("link")
            or ""
        ).strip()
        index_loc = _dedupe_location_string((j.get("location") or "").strip())

        if not role_title and not company_name:
            continue

        resolved_url = urljoin(target_url, raw_job_url) if raw_job_url else "Not available"

        v_rec = verifications.get(job_id) or {}
        # Ensure the verification record belongs to the exact same job URL, title, and company
        is_same_posting = (
            bool(v_rec.get("verified"))
            and v_rec.get("verified_source_url") == resolved_url
            and (v_rec.get("verified_title") or role_title) == role_title
            and (v_rec.get("verified_company") or company_name) == company_name
        )

        v_status = "Verified" if is_same_posting else "Unverified"
        v_reason = (
            v_rec.get("reason")
            if is_same_posting
            else v_rec.get(
                "reason",
                "Posting URL has not been verified yet. Click 'Verify posting' to check HTTP reachability and match title & company.",
            )
        )

        # Location resolution: use verified posting location (or conflict warning) when verified
        if is_same_posting:
            display_location = v_rec.get("resolved_location") or index_loc or "Not available"
            location_conflict = bool(v_rec.get("location_conflict"))
            location_conflict_detail = v_rec.get("location_conflict_detail")
            application_status = v_rec.get("application_status", "Application status unknown")
        else:
            display_location = f"{index_loc} (Index only — unverified)" if index_loc else "Not available"
            location_conflict = False
            location_conflict_detail = None
            application_status = "Application status unknown"

        desc_for_analysis = (
            v_rec.get("full_description_text", "")
            if is_same_posting
            else (j.get("description") or "")
        )
        analysis = analyze_job_against_skill_graph(
            title=role_title,
            company=company_name,
            description_text=desc_for_analysis,
            student_skills=student_skills,
        )

        stipend_val = (
            v_rec.get("extracted_compensation", "Not available")
            if is_same_posting
            else (j.get("salary") or "Not available")
        )
        duration_val = (
            v_rec.get("extracted_duration", "Not available")
            if is_same_posting
            else (j.get("job_type") or "Not available")
        )
        desc_excerpt = (
            v_rec.get("description_excerpt", "Not available")
            if is_same_posting
            else (j.get("description") or "Not available (Click 'Verify posting' to extract description from job URL)")
        )

        highlights: List[str] = []
        if is_same_posting and desc_excerpt != "Not available":
            highlights.append(f"Verified Source URL: {v_rec.get('verified_source_url')}")
            if location_conflict and location_conflict_detail:
                highlights.append(f"Location Conflict Detected: {location_conflict_detail}")
            highlights.append(f"Verified Description Excerpt: {desc_excerpt}")
            if analysis["detected_keywords"]:
                highlights.append(
                    f"Keywords Detected in This Posting: {', '.join(analysis['detected_keywords'])}"
                )
        else:
            highlights.append(
                "Job details not verified yet — only listing headline fields (company, title, URL, index location) were extracted from the index page."
            )
            if analysis["detected_keywords"]:
                highlights.append(
                    f"Keywords Detected in Title: {', '.join(analysis['detected_keywords'])}"
                )

        live_cards.append({
            "id": job_id,
            "role": role_title or "Not available",
            "company": company_name or "Not available",
            "location": display_location,
            "location_conflict": location_conflict,
            "location_conflict_detail": location_conflict_detail,
            "stipend": stipend_val,
            "duration": duration_val,
            "job_url": resolved_url if resolved_url != "Not available" else "",
            "career_track": analysis["career_track"],
            "match_score": analysis["match_score"] if analysis["match_score"] is not None else 0,
            "score_explanation": analysis["score_explanation"],
            "is_demo": False,
            "verification_status": v_status,
            "verification_reason": v_reason,
            "verified_at": v_rec.get("checked_at") if is_same_posting else None,
            "http_status": v_rec.get("http_status") if is_same_posting else None,
            "application_status": application_status,
            "description_excerpt": desc_excerpt,
            "detected_keywords": analysis["detected_keywords"],
            "source_label": f"LIVE EXTRACTED (TinyFish Run {str(cached_live.get('run_id', ''))[:8]})",
            "required_skills": (
                analysis["required_skills"]
                if analysis["required_skills"]
                else ["Not available (Verify posting to analyze full job description)"]
            ),
            "missing_skills_hint": analysis["missing_skills_hint"],
            "highlights": highlights,
            "apply_readiness": (
                f"Application Status: {application_status} • {analysis['seniority_label']}"
            ),
        })

    return live_cards


def _sanitize_error_message(msg: str, secret_key: str) -> str:
    """Return a safe error message without exposing server secrets."""
    return "TinyFish API request failed. Check server configuration and try again."


def fetch_career_research(
    role_query: str,
    career_track: str,
    demo_internships: List[Dict[str, Any]],
    student_skills: List[Dict[str, Any]],
    trigger_live_agent: bool = False,
    target_url: str = DEFAULT_TARGET_JOBS_URL,
) -> Dict[str, Any]:
    """
    Fetch separated `live_internships` and `demo_internships`.
    """
    raw_key = _read_server_key()
    api_url = _read_api_url()
    key_present = bool(raw_key) and raw_key.lower() not in PLACEHOLDER_KEYS

    skill_map = {s["name"].lower(): s["current_level"] for s in student_skills}

    filtered_demo = []
    q = (role_query or "").strip().lower()
    track = (career_track or "all").strip().lower()

    for item in demo_internships:
        matches_track = track in ("all", "") or item.get("career_track") == track
        matches_query = (
            not q
            or q in item["role"].lower()
            or q in item["company"].lower()
            or q in item["location"].lower()
            or any(q in req.lower() for req in item["required_skills"])
        )
        if matches_track and matches_query:
            req_skills = item.get("required_skills", [])
            if req_skills:
                avg_score = int(
                    round(
                        sum(skill_map.get(req.lower(), 55) for req in req_skills)
                        / len(req_skills)
                    )
                )
            else:
                avg_score = item.get("match_score", 75)

            enriched = dict(item)
            enriched["match_score"] = min(98, max(35, avg_score))
            enriched["is_demo"] = True
            enriched["verification_status"] = "Demo Listing"
            enriched["application_status"] = "Demo Sample (Not a real job)"
            filtered_demo.append(enriched)

    filtered_demo.sort(key=lambda x: x["match_score"], reverse=True)

    market_skill_demand = [
        {"skill": "React & TypeScript", "demand_pct": 92, "trend": "Sample Metric", "is_demo": True},
        {"skill": "Python & Flask APIs", "demand_pct": 89, "trend": "Sample Metric", "is_demo": True},
        {"skill": "LLM & Web Agent APIs", "demand_pct": 86, "trend": "Sample Metric", "is_demo": True},
        {"skill": "SQL & Data Modeling", "demand_pct": 84, "trend": "Sample Metric", "is_demo": True},
        {"skill": "Git, Docker & CI/CD", "demand_pct": 78, "trend": "Sample Metric", "is_demo": True},
        {"skill": "System Design & Architecture", "demand_pct": 74, "trend": "Sample Metric", "is_demo": True},
    ]

    if not key_present:
        _VERIFIED_LIVE_STATE["verified_live"] = False
        config = get_tinyfish_config()
        return {
            "tinyfish_status": config,
            "is_demo_data": True,
            "extraction_empty": False,
            "extracted_count": 0,
            "data_source_badge": "DEMO DATA (TinyFish API Not Connected Yet)",
            "live_agent_attempted": False,
            "live_internships": [],
            "demo_internships": filtered_demo,
            "internships": filtered_demo,
            "market_skill_demand": market_skill_demand,
            "architecture_note": (
                "Because TINYFISH_API_KEY is not set in backend/.env yet, "
                "this endpoint serves clearly labelled Demo Data."
            ),
        }

    if trigger_live_agent:
        clean_query = (role_query or "").strip()
        filter_clause = (
            f"Focus on listings matching '{clean_query}' if present on the page; otherwise extract the first 5 job listings visible on the page. "
            if clean_query
            else ""
        )
        goal_prompt = (
            "Stay on this page without clicking into subpages. "
            f"{filter_clause}"
            "Extract up to 5 job listings actually present on this page. "
            "For each job listing, extract only information present on the page: "
            "company (string), title (string), job_url (string URL or path), and location (string, if available). "
            'Return JSON in the exact format: {"jobs": [{"company": "...", "title": "...", "job_url": "...", "location": "..."}]}'
        )
        try:
            response = requests.post(
                api_url,
                headers={
                    "X-API-Key": raw_key,
                    "Content-Type": "application/json",
                },
                json={
                    "url": target_url,
                    "goal": goal_prompt,
                },
                timeout=120,
            )

            try:
                payload = response.json()
            except Exception:
                payload = {}

            if response.status_code in (401, 403):
                err_obj = payload.get("error") if isinstance(payload, dict) else None
                if isinstance(err_obj, dict):
                    err_code = err_obj.get("code", f"HTTP_{response.status_code}")
                    err_msg = err_obj.get("message", "Authentication failed.")
                    safe_err = f"AUTH_ERROR ({err_code}): {_sanitize_error_message(str(err_msg), raw_key)}"
                else:
                    safe_err = f"AUTH_ERROR (HTTP {response.status_code}): Invalid or unauthorized X-API-Key."

                _VERIFIED_LIVE_STATE["verified_live"] = False
                _VERIFIED_LIVE_STATE["last_error"] = safe_err
                config = get_tinyfish_config()
                return {
                    "tinyfish_status": config,
                    "is_demo_data": True,
                    "extraction_empty": False,
                    "extracted_count": 0,
                    "data_source_badge": "DEMO DATA FALLBACK (TinyFish Authentication Error)",
                    "live_agent_attempted": True,
                    "live_agent_error": safe_err,
                    "live_internships": [],
                    "demo_internships": filtered_demo,
                    "internships": filtered_demo,
                    "market_skill_demand": market_skill_demand,
                    "architecture_note": "TinyFish API rejected X-API-Key. Showing Demo Data.",
                }

            if not response.ok:
                err_obj = payload.get("error") if isinstance(payload, dict) else None
                if isinstance(err_obj, dict):
                    err_code = err_obj.get("code", f"HTTP_{response.status_code}")
                    err_msg = err_obj.get("message", "TinyFish API returned an error.")
                    safe_err = f"API_ERROR ({err_code}): {_sanitize_error_message(str(err_msg), raw_key)}"
                else:
                    safe_err = f"API_ERROR (HTTP {response.status_code}): TinyFish API request failed. Please check the server configuration and try again."

                _VERIFIED_LIVE_STATE["verified_live"] = False
                _VERIFIED_LIVE_STATE["last_error"] = safe_err
                config = get_tinyfish_config()
                return {
                    "tinyfish_status": config,
                    "is_demo_data": True,
                    "extraction_empty": False,
                    "extracted_count": 0,
                    "data_source_badge": "DEMO DATA FALLBACK (TinyFish API Error)",
                    "live_agent_attempted": True,
                    "live_agent_error": safe_err,
                    "live_internships": [],
                    "demo_internships": filtered_demo,
                    "internships": filtered_demo,
                    "market_skill_demand": market_skill_demand,
                    "architecture_note": "TinyFish API returned a non-200 status. Showing Demo Data.",
                }

            run_status = payload.get("status")
            run_id = payload.get("run_id")
            run_error = payload.get("error")

            if run_status == "FAILED" or run_error:
                safe_err = f"AGENT_RUN_FAILED: {_sanitize_error_message(str(run_error or 'Automation run failed'), raw_key)}"
                _VERIFIED_LIVE_STATE["verified_live"] = False
                _VERIFIED_LIVE_STATE["last_error"] = safe_err
                config = get_tinyfish_config()
                return {
                    "tinyfish_status": config,
                    "is_demo_data": True,
                    "extraction_empty": False,
                    "extracted_count": 0,
                    "data_source_badge": "DEMO DATA FALLBACK (TinyFish Run Returned FAILED)",
                    "live_agent_attempted": True,
                    "live_agent_error": safe_err,
                    "live_internships": [],
                    "demo_internships": filtered_demo,
                    "internships": filtered_demo,
                    "market_skill_demand": market_skill_demand,
                    "architecture_note": "TinyFish browser run reported FAILED.",
                }

            raw_result = payload.get("result")
            normalized_jobs = _extract_raw_jobs_list(raw_result)

            live_result_obj = {
                "run_id": run_id,
                "status": run_status or "COMPLETED",
                "num_of_steps": payload.get("num_of_steps"),
                "target_url": target_url,
                "extracted_count": len(normalized_jobs),
                "result": {"jobs": normalized_jobs} if normalized_jobs else raw_result,
            }

            _VERIFIED_LIVE_STATE["verified_live"] = True
            _VERIFIED_LIVE_STATE["last_run_id"] = run_id
            _VERIFIED_LIVE_STATE["last_error"] = None
            _VERIFIED_LIVE_STATE["posting_verifications"] = {}

            live_cards = _build_live_cards(live_result_obj, student_skills)
            config = get_tinyfish_config()

            if not live_cards:
                return {
                    "tinyfish_status": config,
                    "is_demo_data": True,
                    "extraction_empty": True,
                    "extracted_count": 0,
                    "data_source_badge": "NO LIVE JOBS MATCHED ON PAGE — DEMO LISTINGS BELOW",
                    "live_agent_attempted": True,
                    "live_agent_warning": (
                        f"TinyFish API connected (Run ID: {run_id}), but 0 job listings matched on {target_url}. "
                        "Showing Demo Data fallback instead of claiming a successful extraction."
                    ),
                    "live_agent_result": live_result_obj,
                    "live_internships": [],
                    "demo_internships": filtered_demo,
                    "internships": filtered_demo,
                    "market_skill_demand": market_skill_demand,
                    "architecture_note": "TinyFish API request completed, but returned an empty list ([]).",
                }

            _VERIFIED_LIVE_STATE["last_live_result"] = live_result_obj
            _save_verified_state(_VERIFIED_LIVE_STATE)

            return {
                "tinyfish_status": config,
                "is_demo_data": False,
                "extraction_empty": False,
                "extracted_count": len(live_cards),
                "data_source_badge": f"LIVE TINYFISH WEB AGENT ({len(live_cards)} JOBS EXTRACTED)",
                "live_agent_attempted": True,
                "live_agent_result": live_result_obj,
                "live_internships": live_cards,
                "demo_internships": filtered_demo,
                "internships": live_cards + filtered_demo,
                "market_skill_demand": market_skill_demand,
                "architecture_note": (
                    f"Extracted {len(live_cards)} live job listings from {target_url} via TinyFish Web Agent!"
                ),
            }

        except requests.exceptions.Timeout as exc:
            safe_err = f"TIMEOUT_ERROR: TinyFish cloud browser run exceeded the read timeout ({_sanitize_error_message(str(exc), raw_key)})"
            _VERIFIED_LIVE_STATE["verified_live"] = False
            _VERIFIED_LIVE_STATE["last_error"] = safe_err
            config = get_tinyfish_config()
            return {
                "tinyfish_status": config,
                "is_demo_data": True,
                "extraction_empty": False,
                "extracted_count": 0,
                "data_source_badge": "DEMO DATA FALLBACK (TinyFish Read Timeout)",
                "live_agent_attempted": True,
                "live_agent_error": safe_err,
                "live_internships": [],
                "demo_internships": filtered_demo,
                "internships": filtered_demo,
                "market_skill_demand": market_skill_demand,
                "architecture_note": "TinyFish cloud browser run exceeded the read timeout.",
            }
        except Exception as exc:
            safe_err = f"NETWORK_ERROR: {_sanitize_error_message(str(exc), raw_key)}"
            _VERIFIED_LIVE_STATE["verified_live"] = False
            _VERIFIED_LIVE_STATE["last_error"] = safe_err
            config = get_tinyfish_config()
            return {
                "tinyfish_status": config,
                "is_demo_data": True,
                "extraction_empty": False,
                "extracted_count": 0,
                "data_source_badge": "DEMO DATA FALLBACK (Network Error)",
                "live_agent_attempted": True,
                "live_agent_error": safe_err,
                "live_internships": [],
                "demo_internships": filtered_demo,
                "internships": filtered_demo,
                "market_skill_demand": market_skill_demand,
                "architecture_note": "TinyFish API request encountered a network error.",
            }

    config = get_tinyfish_config()
    cached_live = _VERIFIED_LIVE_STATE.get("last_live_result") if config["connected"] else None
    all_live_cards = _build_live_cards(cached_live, student_skills) if cached_live else []

    filtered_live = []
    for item in all_live_cards:
        matches_track = track in ("all", "") or item.get("career_track") == track
        matches_query = (
            not q
            or q in item["role"].lower()
            or q in item["company"].lower()
            or q in item["location"].lower()
            or any(q in req.lower() for req in item["required_skills"])
            or any(q in kw.lower() for kw in item.get("detected_keywords", []))
        )
        if matches_track and matches_query:
            filtered_live.append(item)

    has_live_cards = len(all_live_cards) > 0

    return {
        "tinyfish_status": config,
        "is_demo_data": not has_live_cards,
        "extraction_empty": bool(cached_live and not has_live_cards),
        "extracted_count": len(all_live_cards),
        "data_source_badge": (
            f"LIVE TINYFISH WEB AGENT ({len(all_live_cards)} JOBS EXTRACTED)"
            if has_live_cards
            else "DEMO DATA (Click 'Run Live TinyFish Web Agent Scan' to extract live jobs)"
        ),
        "live_agent_attempted": bool(config["connected"]),
        "live_agent_result": cached_live if has_live_cards else None,
        "live_internships": filtered_live,
        "demo_internships": filtered_demo,
        "internships": (filtered_live + filtered_demo) if has_live_cards else filtered_demo,
        "market_skill_demand": market_skill_demand,
        "architecture_note": (
            f"Showing {len(filtered_live)} live TinyFish-extracted roles from {cached_live.get('target_url', DEFAULT_TARGET_JOBS_URL)} and {len(filtered_demo)} clearly-labelled Demo Listings in separate sections."
            if has_live_cards
            else "TINYFISH_API_KEY is present in backend/.env. Click 'Run Live TinyFish Web Agent Scan' to extract live job listings."
        ),
    }
