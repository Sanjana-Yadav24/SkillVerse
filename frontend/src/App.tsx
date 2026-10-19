import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Network,
  Target,
  Trophy,
  FolderGit2,
  Briefcase,
  Sparkles,
  Flame,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Zap,
  Compass,
} from 'lucide-react';

import { DashboardOverview } from './types/skillverse';
import {
  fetchOverview,
  selectCareerGoal,
  toggleRoadmapMilestone,
  toggleChallengeCompletion,
  addPortfolioProject,
  deletePortfolioProject,
  resetDemoData,
  NewProjectPayload,
} from './services/api';

import { SkillProofGraph } from './components/SkillProofGraph';
import { CareerGoalGapView } from './components/CareerGoalGapView';
import { SkillChallengesView } from './components/SkillChallengesView';
import { ProjectPortfolioView } from './components/ProjectPortfolioView';
import { CareerResearchView } from './components/CareerResearchView';

type NavTab =
  | 'dashboard'
  | 'graph'
  | 'career'
  | 'challenges'
  | 'portfolio'
  | 'research';

export function App() {
  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    try {
      const saved = window.localStorage.getItem('skillverse_active_tab') as NavTab | null;
      if (
        saved &&
        ['dashboard', 'graph', 'career', 'challenges', 'portfolio', 'research'].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'dashboard';
  });

  const setActiveTab = useCallback((tab: NavTab) => {
    setActiveTabState(tab);
    try {
      window.localStorage.setItem('skillverse_active_tab', tab);
    } catch {
      // ignore storage errors
    }
  }, []);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [focusedChallengeId, setFocusedChallengeId] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const handleNavigateChallenges = useCallback(
    (challengeId?: string) => {
      setFocusedChallengeId(challengeId || null);
      setActiveTab('challenges');
    },
    [setActiveTab]
  );

  const handleNavigatePortfolio = useCallback(
    (projectId?: string) => {
      setFocusedProjectId(projectId || null);
      setActiveTab('portfolio');
    },
    [setActiveTab]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOverview();
      setOverview(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to Flask backend'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCareer = async (careerId: string) => {
    const updated = await selectCareerGoal(careerId);
    setOverview(updated);
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    const updated = await toggleRoadmapMilestone(milestoneId);
    setOverview(updated);
  };

  const handleToggleChallenge = async (challengeId: string) => {
    const updated = await toggleChallengeCompletion(challengeId);
    setOverview(updated);
  };

  const handleAddProject = async (payload: NewProjectPayload) => {
    const updated = await addPortfolioProject(payload);
    setOverview(updated);
  };

  const handleDeleteProject = async (projectId: string) => {
    const updated = await deletePortfolioProject(projectId);
    setOverview(updated);
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const updated = await resetDemoData();
      setOverview(updated);
    } finally {
      setResetting(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-[#050814] text-slate-100 flex items-center justify-center p-6">
        <div className="bg-[#0B1026] border border-purple-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-400 mx-auto flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">
            Loading SkillVerse Workspace...
          </h1>
          <p className="text-xs text-slate-400">
            Connecting to Python Flask API & loading student Skill Proof Graph
          </p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen bg-[#050814] text-slate-100 flex items-center justify-center p-6">
        <div className="bg-[#0B1026] border border-rose-500/40 rounded-2xl p-8 max-w-lg w-full space-y-4">
          <h2 className="text-xl font-bold text-rose-300">
            Backend Connection Needed
          </h2>
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const {
    student,
    progress_cards,
    selected_career,
    career_goals,
    skills,
    skill_edges,
    skill_gaps,
    challenges,
    projects,
    tinyfish_status,
  } = overview;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Student Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'graph',
      label: 'Skill Proof Graph',
      icon: <Network className="w-4 h-4" />,
      badge: `${skills.length} Nodes`,
    },
    {
      id: 'career',
      label: 'Career Goal & Roadmap',
      icon: <Target className="w-4 h-4" />,
      badge: `${progress_cards.career_readiness_pct}%`,
    },
    {
      id: 'challenges',
      label: 'Skill Challenges',
      icon: <Trophy className="w-4 h-4" />,
      badge: `${progress_cards.challenges_completed}/${progress_cards.challenges_total}`,
    },
    {
      id: 'portfolio',
      label: 'Project Portfolio',
      icon: <FolderGit2 className="w-4 h-4" />,
      badge: `${projects.length}`,
    },
    {
      id: 'research',
      label: 'Career Research',
      icon: <Briefcase className="w-4 h-4" />,
      badge: tinyfish_status.connected ? 'Live' : 'Demo',
    },
  ];

  const topGaps = [...skill_gaps].sort((a, b) => b.gap - a.gap).slice(0, 4);
  const nextPendingChallenge =
    challenges.find((c) => !c.completed) || challenges[0];

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 flex flex-col">
      {/* Top Demo & API Transparency Banner */}
      <div className="bg-gradient-to-r from-[#121036] via-[#0E1838] to-[#121036] border-b border-purple-500/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {tinyfish_status.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                TINYFISH API LIVE (VERIFIED)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <ShieldAlert className="w-3.5 h-3.5" />
                DEMO DATA MODE
              </span>
            )}
            <span className="text-slate-300">
              {tinyfish_status.connected
                ? 'TinyFish Web Agent is connected on the backend alongside demo student profile data.'
                : 'Displaying clearly labelled demo student profile & career dataset.'}
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="font-mono text-cyan-300">
              TinyFish API:{' '}
              {tinyfish_status.connected
                ? 'Connected & Verified (Server-Side)'
                : 'Not Connected Yet (Backend Ready)'}
            </span>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
            title="Reset all demo data to initial state"
          >
            <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>

      {/* Main Header & Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#070B1C]/90 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight text-white">
                    Skill<span className="text-cyan-400">Verse</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Ideathon Edition
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Verified Skill Proof & Career Intelligence Platform
                </p>
              </div>
            </div>

            {/* Mobile Student Stats Pill */}
            <div className="flex lg:hidden items-center gap-2 bg-[#101735] border border-purple-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-cyan-300 font-mono">
                Lvl {student.level}
              </span>
              <span className="text-xs text-amber-300 font-mono">
                {student.xp} XP
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-[#111938]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-black/25 text-white'
                          : 'bg-[#151F42] text-cyan-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop Student Profile & Gamified XP Pill */}
          <div className="hidden lg:flex items-center gap-3 bg-[#0D1430] border border-purple-500/25 px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{student.streak_days}d Streak</span>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {student.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  Lvl {student.level}
                </span>
              </div>
              <p className="text-[11px] font-mono text-purple-300">
                {student.xp} XP • {student.level_title}
              </p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-xs font-extrabold text-slate-950">
              {student.avatar_initials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 1. Student Welcome & Career Target Banner */}
            <div className="bg-gradient-to-r from-[#0C122C] via-[#13183E] to-[#0B1835] border border-purple-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      <GraduationCap className="w-4 h-4" />
                      {student.degree} • {student.year}
                    </span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {student.college}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Welcome back,{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
                      {student.name}
                    </span>
                  </h1>
                  <p className="text-sm text-slate-300 max-w-2xl">
                    {student.bio}
                  </p>
                </div>

                {/* Active Career Target Box */}
                <div className="bg-[#080D22]/90 border border-cyan-400/35 rounded-2xl p-4 min-w-[280px] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      Active Target Career
                    </span>
                    <button
                      onClick={() => setActiveTab('career')}
                      className="text-xs font-semibold text-cyan-300 hover:underline flex items-center gap-1"
                    >
                      Change Role <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-base font-bold text-white">
                    {selected_career.title}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Readiness Match:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {progress_cards.career_readiness_pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress_cards.career_readiness_pct}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Four Student Progress Cards (Feature #1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Career Readiness */}
              <div
                onClick={() => setActiveTab('career')}
                className="bg-[#0B1026] hover:bg-[#0F1634] border border-purple-500/25 hover:border-cyan-400/50 rounded-2xl p-5 shadow-lg transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Career Readiness
                  </span>
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {progress_cards.career_readiness_pct}%
                  </span>
                  <span className="text-xs text-cyan-300 font-medium">
                    Role Match
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {progress_cards.priority_gaps_count} priority skill gaps remaining for{' '}
                  <span className="text-slate-200 font-medium">
                    {selected_career.title}
                  </span>
                </p>
              </div>

              {/* Card 2: Verified Skill Proofs */}
              <div
                onClick={() => setActiveTab('graph')}
                className="bg-[#0B1026] hover:bg-[#0F1634] border border-purple-500/25 hover:border-purple-400/50 rounded-2xl p-5 shadow-lg transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Verified Skill Proofs
                  </span>
                  <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <Network className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {progress_cards.verified_skill_proofs}
                  </span>
                  <span className="text-xs text-purple-300 font-medium">
                     across {progress_cards.active_skills_count} skills
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Backed by completed challenges & portfolio repositories
                </p>
              </div>

              {/* Card 3: Skill Challenges Completed */}
              <div
                onClick={() => setActiveTab('challenges')}
                className="bg-[#0B1026] hover:bg-[#0F1634] border border-purple-500/25 hover:border-amber-400/50 rounded-2xl p-5 shadow-lg transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Skill Challenges
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {progress_cards.challenges_completed}/
                    {progress_cards.challenges_total}
                  </span>
                  <span className="text-xs text-amber-300 font-medium">
                    Completed
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Total XP Earned: <strong className="text-amber-300">{student.xp} XP</strong> (Level {student.level})
                </p>
              </div>

              {/* Card 4: Project Portfolio & Roadmap */}
              <div
                onClick={() => setActiveTab('portfolio')}
                className="bg-[#0B1026] hover:bg-[#0F1634] border border-purple-500/25 hover:border-emerald-400/50 rounded-2xl p-5 shadow-lg transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Portfolio & Roadmap
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {progress_cards.portfolio_projects_count}
                  </span>
                  <span className="text-xs text-emerald-300 font-medium">
                    Verified Projects
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Roadmap Phases: {progress_cards.roadmap_completed}/
                  {progress_cards.roadmap_total} Completed
                </p>
              </div>
            </div>

            {/* 3. Interactive Skill Proof Graph Preview on Dashboard */}
            <div className="bg-[#0B1026]/60 border border-purple-500/20 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-cyan-400" />
                    Interactive Skill Proof Graph
                  </h2>
                  <p className="text-xs text-slate-300">
                    Click any skill node below to inspect your verified proofs and target role gap
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('graph')}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
                >
                  Open Full Graph View <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <SkillProofGraph
                skills={skills}
                edges={skill_edges}
                selectedCareer={selected_career}
                onNavigateTab={(tab) => setActiveTab(tab)}
                compact
              />
            </div>

            {/* 4. Bottom Dashboard Row: Top Skill Gaps + Recommended Next Challenge */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Priority Skill Gaps Quick View */}
              <div className="lg:col-span-7 bg-[#0B1026] border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Compass className="w-4 h-4 text-purple-400" />
                      Priority Skill Gaps for {selected_career.title}
                    </h3>
                    <button
                      onClick={() => setActiveTab('career')}
                      className="text-xs text-cyan-300 hover:underline font-semibold"
                    >
                      Full Analysis & Roadmap →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {topGaps.map((g) => (
                      <div
                        key={g.skill_id}
                        className="p-3 rounded-xl bg-[#101836] border border-slate-800 flex items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-white">
                              {g.skill_name}
                            </span>
                            <span className="font-mono text-slate-300">
                              {g.current_level}% / {g.target_level}% Target
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                              style={{ width: `${g.current_level}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${
                            g.gap === 0
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {g.gap === 0 ? 'Met ✓' : `+${g.gap}% Gap`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Next Action Card */}
              <div className="lg:col-span-5 bg-gradient-to-b from-[#131842] to-[#0B1026] border border-cyan-400/35 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      Recommended Next Step
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-300">
                      <Zap className="w-3.5 h-3.5" />+
                      {nextPendingChallenge?.xp_reward} XP
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">
                    {nextPendingChallenge?.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {nextPendingChallenge?.description}
                  </p>

                  <div className="p-3 rounded-xl bg-[#090E24] border border-slate-800 text-xs space-y-1">
                    <p className="text-slate-400">
                      Target Skill Boost:{' '}
                      <strong className="text-cyan-300">
                        {nextPendingChallenge?.skill_name} (+
                        {nextPendingChallenge?.skill_boost}%)
                      </strong>
                    </p>
                    <p className="text-slate-400">
                      Estimated Time:{' '}
                      <strong className="text-white">
                        {nextPendingChallenge?.estimated_time}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveTab('challenges')}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Go to Skill Challenges
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <SkillProofGraph
            skills={skills}
            edges={skill_edges}
            selectedCareer={selected_career}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'career' && (
          <CareerGoalGapView
            careerGoals={career_goals}
            selectedCareer={selected_career}
            skillGaps={skill_gaps}
            readinessPct={progress_cards.career_readiness_pct}
            readinessExplanation={overview.readiness_explanation}
            roadmapDisclaimer={overview.roadmap_disclaimer}
            onSelectCareer={handleSelectCareer}
            onToggleMilestone={handleToggleMilestone}
            onToggleChallenge={handleToggleChallenge}
            onNavigateChallenges={handleNavigateChallenges}
            onNavigatePortfolio={handleNavigatePortfolio}
          />
        )}

        {activeTab === 'challenges' && (
          <SkillChallengesView
            challenges={challenges}
            focusedChallengeId={focusedChallengeId}
            onToggleChallenge={handleToggleChallenge}
          />
        )}

        {activeTab === 'portfolio' && (
          <ProjectPortfolioView
            projects={projects}
            skills={skills}
            focusedProjectId={focusedProjectId}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeTab === 'research' && (
          <CareerResearchView selectedCareerId={selected_career.id} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060919] py-4 px-6 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div>
            <strong className="text-white">SkillVerse</strong> — Student Career Development & Skill Proof Platform (College Ideathon Prototype)
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Frontend: React + TypeScript</span>
            <span>•</span>
            <span>Backend: Python + Flask</span>
            <span>•</span>
            <span className="text-cyan-400">TinyFish API: Backend-Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
