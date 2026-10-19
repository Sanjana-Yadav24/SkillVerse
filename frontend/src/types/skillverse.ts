export interface TinyFishStatus {
  connected: boolean;
  key_present?: boolean;
  mode: 'LIVE_TINYFISH_API' | 'DEMO_DATA_FALLBACK';
  api_url: string;
  masked_key: string | null;
  env_var_name: string;
  status_label: string;
  setup_hint: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  degree: string;
  year: string;
  college: string;
  avatar_initials: string;
  xp: number;
  level: number;
  level_title: string;
  streak_days: number;
  selected_career_id: string;
  bio: string;
  github_handle: string;
  linkedin_handle: string;
}

export interface ProgressCards {
  career_readiness_pct: number;
  target_role_title: string;
  verified_skill_proofs: number;
  active_skills_count: number;
  challenges_completed: number;
  challenges_total: number;
  portfolio_projects_count: number;
  roadmap_completed: number;
  roadmap_total: number;
  priority_gaps_count: number;
}

export interface SkillNode {
  id: string;
  name: string;
  category: 'Frontend' | 'Backend' | 'AI & Data' | 'Core CS' | 'DevOps' | string;
  current_level: number;
  verified_proofs: number;
  x: number;
  y: number;
  description: string;
  proof_items: string[];
}

export interface SkillEdge {
  from: string;
  to: string;
  label: string;
}

export interface SkillGapItem {
  skill_id: string;
  skill_name: string;
  category: string;
  current_level: number;
  target_level: number;
  effective_points?: number;
  capped?: boolean;
  gap: number;
  attainment_pct?: number;
  status: 'Met' | 'Near Target' | 'Priority Gap';
  verified_proofs: number;
}

export interface LinkedRoadmapChallenge {
  id: string;
  title: string;
  skill_id: string;
  skill_name: string;
  xp_reward: number;
  skill_boost: number;
  completed: boolean;
  estimated_time: string;
}

export interface LinkedRoadmapProject {
  id: string;
  title: string;
  verified_badge: string;
  github_url: string;
  is_demo: boolean;
}

export interface RoadmapMilestone {
  id: string;
  phase: string;
  duration: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  xp_awarded?: boolean;
  skill_id: string;
  target_skill_name?: string;
  current_skill_level?: number;
  target_skill_level?: number;
  current_skill_gap?: number;
  priority_reason?: string;
  title: string;
  description: string;
  weekly_tasks?: string[];
  mini_project?: string;
  completion_criterion?: string;
  deliverable: string;
  linked_challenge_ids?: string[];
  linked_project_ids?: string[];
  linked_challenges?: LinkedRoadmapChallenge[];
  linked_projects?: LinkedRoadmapProject[];
}

export interface CareerGoal {
  id: string;
  title: string;
  category: string;
  avg_stipend_inr: string;
  stipend_is_demo?: boolean;
  stipend_source_note?: string;
  demand_badge: string;
  description: string;
  required_skills: Record<string, number>;
  roadmap: RoadmapMilestone[];
}

export interface ReadinessExplanation {
  formula: string;
  cap_note: string;
  total_effective_points: number;
  total_benchmark_points: number;
  exact_ratio_pct: number;
  rounded_readiness_pct: number;
  numerator_sum_expr: string;
  denominator_sum_expr: string;
  arithmetic_summary: string;
  skill_contributions: SkillGapItem[];
}

export interface SkillChallenge {
  id: string;
  title: string;
  skill_id: string;
  skill_name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  xp_reward: number;
  skill_boost: number;
  estimated_time: string;
  completed: boolean;
  is_demo: boolean;
  description: string;
  acceptance_criteria: string[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  tagline: string;
  description: string;
  tech_stack: string[];
  linked_skills: string[];
  github_url: string;
  live_url: string;
  date_added: string;
  verified_badge: string;
  is_demo: boolean;
}

export interface DashboardOverview {
  is_demo_environment: boolean;
  demo_banner: string;
  roadmap_disclaimer?: string;
  tinyfish_status: TinyFishStatus;
  student: StudentProfile;
  progress_cards: ProgressCards;
  readiness_explanation?: ReadinessExplanation;
  selected_career: CareerGoal;
  career_goals: CareerGoal[];
  skills: SkillNode[];
  skill_edges: SkillEdge[];
  skill_gaps: SkillGapItem[];
  challenges: SkillChallenge[];
  projects: PortfolioProject[];
}

export interface ScoreExplanation {
  formula: string;
  role_target_pct: number;
  seniority_label: string;
  matched_skills_count: number;
  calculation_steps: string[];
  arithmetic_summary: string;
  skills_meeting_target: string[];
  skills_below_target: string[];
  unmatched_graph_skills: string[];
}

export interface InternshipItem {
  id: string;
  role: string;
  company: string;
  location: string;
  location_conflict?: boolean;
  location_conflict_detail?: string | null;
  stipend: string;
  duration: string;
  job_url?: string;
  career_track: string;
  match_score: number;
  score_explanation?: ScoreExplanation;
  is_demo: boolean;
  verification_status?: 'Verified' | 'Unverified' | 'Demo Listing' | string;
  verification_reason?: string;
  verified_at?: string | null;
  http_status?: number | null;
  application_status?: string;
  description_excerpt?: string;
  detected_keywords?: string[];
  source_label: string;
  required_skills: string[];
  missing_skills_hint: string[];
  highlights: string[];
  apply_readiness: string;
}

export interface MarketSkillDemand {
  skill: string;
  demand_pct: number;
  trend: string;
  is_demo: boolean;
}

export interface CareerResearchResponse {
  tinyfish_status: TinyFishStatus;
  is_demo_data: boolean;
  extraction_empty?: boolean;
  extracted_count?: number;
  data_source_badge: string;
  live_agent_attempted: boolean;
  live_agent_error?: string;
  live_agent_warning?: string;
  live_agent_result?: unknown;
  live_internships?: InternshipItem[];
  demo_internships?: InternshipItem[];
  internships: InternshipItem[];
  last_verification?: {
    status: string;
    verified: boolean;
    reason: string;
    http_status?: number | null;
    checked_at?: string;
  };
  market_skill_demand: MarketSkillDemand[];
  architecture_note: string;
}
