/**
 * SkillVerse Frontend API Client
 * ------------------------------
 * SECURITY NOTE:
 * - Notice there are NO API keys in this file!
 * - All requests use relative paths (`/api/...`) which Vite forwards to the
 *   Python Flask backend (`backend/app.py`).
 */

import {
  DashboardOverview,
  CareerResearchResponse,
  TinyFishStatus,
} from '../types/skillverse';

export async function fetchOverview(): Promise<DashboardOverview> {
  const res = await fetch('/api/overview');
  if (!res.ok) {
    throw new Error(`Failed to load dashboard overview (${res.status})`);
  }
  return res.json();
}

export async function selectCareerGoal(careerId: string): Promise<DashboardOverview> {
  const res = await fetch('/api/career-goal/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ career_id: careerId }),
  });
  if (!res.ok) {
    throw new Error('Failed to update career goal');
  }
  return res.json();
}

export async function toggleRoadmapMilestone(milestoneId: string): Promise<DashboardOverview> {
  const res = await fetch('/api/roadmap/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestone_id: milestoneId }),
  });
  if (!res.ok) {
    throw new Error('Failed to update roadmap milestone');
  }
  return res.json();
}

export async function toggleChallengeCompletion(challengeId: string): Promise<DashboardOverview> {
  const res = await fetch('/api/challenges/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId }),
  });
  if (!res.ok) {
    throw new Error('Failed to toggle skill challenge');
  }
  return res.json();
}

export interface NewProjectPayload {
  title: string;
  tagline: string;
  description: string;
  github_url: string;
  live_url: string;
  tech_stack: string[];
  linked_skills: string[];
}

export async function addPortfolioProject(payload: NewProjectPayload): Promise<DashboardOverview> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add project');
  }
  return res.json();
}

export async function deletePortfolioProject(projectId: string): Promise<DashboardOverview> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete project');
  }
  return res.json();
}

export async function fetchCareerResearch(
  query = '',
  track = 'all'
): Promise<CareerResearchResponse> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (track) params.set('track', track);

  const res = await fetch(`/api/career-research?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load career research data');
  }
  return res.json();
}

export async function triggerTinyFishScan(
  query: string,
  track: string
): Promise<CareerResearchResponse> {
  const res = await fetch('/api/career-research/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, track }),
  });
  if (!res.ok) {
    throw new Error('Failed to contact backend scan endpoint');
  }
  return res.json();
}

export async function verifyLiveJobPosting(
  jobId: string,
  query = '',
  track = 'all'
): Promise<CareerResearchResponse> {
  const res = await fetch('/api/career-research/verify-posting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, q: query, track }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to verify job posting');
  }
  return res.json();
}

export async function saveTinyFishApiKey(
  apiKey: string
): Promise<{ saved: boolean; message: string; tinyfish_status: TinyFishStatus }> {
  const res = await fetch('/api/tinyfish/configure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save API key to backend/.env');
  }
  return res.json();
}

export async function resetDemoData(): Promise<DashboardOverview> {
  const res = await fetch('/api/reset-demo', {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to reset demo data');
  }
  return res.json();
}
