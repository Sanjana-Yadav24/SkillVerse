import React, { useState } from 'react';
import {
  Target,
  Compass,
  CheckCircle2,
  Clock,
  CircleDot,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Award,
  ChevronRight,
  Calculator,
  ListChecks,
  Wrench,
  ShieldCheck,
  Trophy,
  FolderGit2,
  Info,
} from 'lucide-react';
import {
  CareerGoal,
  SkillGapItem,
  RoadmapMilestone,
  ReadinessExplanation,
} from '../types/skillverse';

interface CareerGoalGapViewProps {
  careerGoals: CareerGoal[];
  selectedCareer: CareerGoal;
  skillGaps: SkillGapItem[];
  readinessPct: number;
  readinessExplanation?: ReadinessExplanation;
  roadmapDisclaimer?: string;
  onSelectCareer: (careerId: string) => Promise<void>;
  onToggleMilestone: (milestoneId: string) => Promise<void>;
  onToggleChallenge?: (challengeId: string) => Promise<void>;
  onNavigateChallenges: (challengeId?: string) => void;
  onNavigatePortfolio?: (projectId?: string) => void;
}

export const CareerGoalGapView: React.FC<CareerGoalGapViewProps> = ({
  careerGoals,
  selectedCareer,
  skillGaps,
  readinessPct,
  readinessExplanation,
  roadmapDisclaimer,
  onSelectCareer,
  onToggleMilestone,
  onToggleChallenge,
  onNavigateChallenges,
  onNavigatePortfolio,
}) => {
  const [updatingCareerId, setUpdatingCareerId] = useState<string | null>(null);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<string | null>(
    null
  );
  const [updatingChallengeId, setUpdatingChallengeId] = useState<string | null>(
    null
  );

  const handleCareerClick = async (id: string) => {
    if (id === selectedCareer.id) return;
    setUpdatingCareerId(id);
    try {
      await onSelectCareer(id);
    } finally {
      setUpdatingCareerId(null);
    }
  };

  const handleMilestoneClick = async (id: string) => {
    setUpdatingMilestoneId(id);
    try {
      await onToggleMilestone(id);
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  const handleChallengeQuickToggle = async (challengeId: string) => {
    if (!onToggleChallenge) {
      onNavigateChallenges(challengeId);
      return;
    }
    setUpdatingChallengeId(challengeId);
    try {
      await onToggleChallenge(challengeId);
    } finally {
      setUpdatingChallengeId(null);
    }
  };

  const sortedGaps = [...skillGaps].sort((a, b) => b.gap - a.gap);

  return (
    <div className="space-y-6">
      {/* Section 1: Career Goal Selector Cards */}
      <div className="bg-[#0B1026] border border-purple-500/25 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-400/30">
                <Target className="w-5 h-5 text-purple-300" />
              </div>
              <h2 className="text-xl font-bold text-white">
                1. Select Your Target Career Goal
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                DEMO BENCHMARKS & STIPEND ESTIMATES
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Choose a career track below. SkillVerse dynamically recalculates your{' '}
              <span className="text-cyan-300 font-medium">Skill Gap Analysis</span>{' '}
              and prioritizes a recommended{' '}
              <span className="text-purple-300 font-medium">8-Week Learning Roadmap</span>{' '}
              around your largest skill gaps.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#11193A] border border-cyan-500/30 px-4 py-2.5 rounded-xl shrink-0">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">
                Overall Role Readiness
              </p>
              <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
                {readinessPct}% Match
              </p>
              {readinessExplanation && (
                <p className="text-[11px] font-mono text-slate-300">
                  {readinessExplanation.total_effective_points} /{' '}
                  {readinessExplanation.total_benchmark_points} benchmark pts (
                  {readinessExplanation.exact_ratio_pct}%)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Career Track Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {careerGoals.map((goal) => {
            const isSelected = goal.id === selectedCareer.id;
            const isLoading = updatingCareerId === goal.id;

            return (
              <button
                key={goal.id}
                onClick={() => handleCareerClick(goal.id)}
                disabled={isLoading}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#191645] to-[#0E1738] border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                    : 'bg-[#0F1631] border-slate-800 hover:border-purple-500/50 hover:bg-[#131C3E]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {goal.category}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {goal.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 line-clamp-3">
                    {goal.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Est. Stipend Range (Demo Estimate):
                    </span>
                    <span className="font-mono text-amber-300 font-semibold">
                      {goal.avg_stipend_inr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-300">
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    <span>{goal.demand_badge}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Transparent Overall Role Readiness Formula & Mathematical Breakdown */}
        {readinessExplanation && (
          <div className="mt-5 p-4 rounded-xl bg-[#0D1430] border border-cyan-500/25 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  How Overall Role Readiness ({readinessPct}%) Is Calculated from Your Skill Graph
                </span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
                Mathematically Synced with 8 Skill Graph Nodes
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#080D22] border border-slate-800 space-y-1">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Scoring Formula
                </p>
                <p className="font-mono text-slate-200 leading-relaxed">
                  {readinessExplanation.formula}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  {readinessExplanation.cap_note}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#080D22] border border-slate-800 space-y-1">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Exact Arithmetic for {selectedCareer.title}
                </p>
                <p className="font-mono text-cyan-300 leading-relaxed">
                  {readinessExplanation.arithmetic_summary}
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Effective Skill Points:{' '}
                  <strong className="text-white font-mono">
                    {readinessExplanation.total_effective_points}
                  </strong>{' '}
                  ÷ Total Role Benchmark Points:{' '}
                  <strong className="text-white font-mono">
                    {readinessExplanation.total_benchmark_points}
                  </strong>{' '}
                  ={' '}
                  <strong className="text-cyan-300 font-mono">
                    {readinessExplanation.exact_ratio_pct}% → {readinessPct}%
                  </strong>
                </p>
              </div>
            </div>

            {/* Per-Skill Contribution Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
              {readinessExplanation.skill_contributions.map((sc) => (
                <div
                  key={sc.skill_id}
                  className="p-2.5 rounded-lg bg-[#090F26] border border-slate-800/90 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-white truncate">
                      {sc.skill_name}
                    </span>
                    <span
                      className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                        sc.gap === 0
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : sc.gap <= 12
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {sc.gap === 0 ? 'Met' : `-${sc.gap}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-slate-300">
                    <span>
                      Graph: {sc.current_level}% / Bench: {sc.target_level}%
                    </span>
                    <span className="text-cyan-300 font-bold">
                      → {sc.effective_points ?? Math.min(sc.current_level, sc.target_level)}/
                      {sc.target_level} pts
                    </span>
                  </div>
                  {sc.capped && (
                    <p className="text-[10px] text-emerald-300 font-mono">
                      Capped at {sc.target_level} benchmark pts (+
                      {sc.current_level - sc.target_level}% surplus)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Skill Gap Analysis & Personalized Learning Roadmap Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Skill Gap Analysis Panel (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-[#0B1026] border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  2. Dynamic Skill Gap Analysis
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sorted by largest gap first against{' '}
                  <strong className="text-cyan-300">{selectedCareer.title}</strong>{' '}
                  benchmarks
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mt-4">
              {sortedGaps.map((item, idx) => {
                const badgeClass =
                  item.status === 'Met'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : item.status === 'Near Target'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

                return (
                  <div
                    key={item.skill_id}
                    className="p-3.5 rounded-xl bg-[#101836] border border-slate-800/90 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-slate-400 mr-1.5">
                          #{idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {item.skill_name}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-400">
                          ({item.category} • {item.verified_proofs} proofs)
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeClass}`}
                      >
                        {item.gap === 0
                          ? 'Target Met ✓'
                          : `Gap: +${item.gap}% needed`}
                      </span>
                    </div>

                    {/* Visual Progress Bar with Target Marker */}
                    <div className="relative pt-1">
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.gap === 0
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                              : item.gap <= 12
                              ? 'bg-gradient-to-r from-purple-500 to-cyan-400'
                              : 'bg-gradient-to-r from-amber-500 to-purple-500'
                          }`}
                          style={{ width: `${item.current_level}%` }}
                        />
                      </div>
                      {/* Target Indicator Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cyan-300 shadow-[0_0_8px_#22d3ee]"
                        style={{ left: `${item.target_level}%` }}
                        title={`Target Level: ${item.target_level}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Your Graph Level: {item.current_level}%</span>
                      <span className="text-cyan-300">
                        Role Benchmark: {item.target_level}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Complete connected Skill Challenges or add Portfolio Projects to boost your Skill Graph nodes!
              </span>
            </div>
            <button
              onClick={() => onNavigateChallenges()}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold hover:opacity-95 transition cursor-pointer"
            >
              Close Gaps Now
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Personalized Learning Roadmap Panel (Right 7 Cols) */}
        <div className="lg:col-span-7 bg-[#0B1026] border border-purple-500/25 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-purple-400" />
                  3. Personalized Learning Roadmap
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Learning Recommendation Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Prioritized by your largest skill gaps first. Click any status badge to cycle progress (
                <span className="text-emerald-300">Completed</span> /{' '}
                <span className="text-cyan-300">In Progress</span> /{' '}
                <span className="text-slate-400">Upcoming</span>). Progress persists on refresh;{' '}
                <span className="text-amber-300 font-semibold">+100 XP</span> is awarded once per milestone upon first completion.
              </p>
            </div>
          </div>

          {/* Learning Recommendation Disclaimer Box */}
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200/90">
            <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {roadmapDisclaimer ||
                'Learning Recommendation Only: This roadmap is an educational study guide generated from your current Skill Proof Graph gaps. Completing roadmap phases, challenges, or target readiness benchmarks is a learning aid and is not a guarantee of internship readiness, interview selection, or employment.'}
            </p>
          </div>

          <div className="relative pl-6 space-y-5 mt-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-400 before:via-purple-500 before:to-slate-800">
            {selectedCareer.roadmap.map((milestone: RoadmapMilestone) => {
              const isCompleted = milestone.status === 'completed';
              const isInProgress = milestone.status === 'in_progress';
              const isUpdating = updatingMilestoneId === milestone.id;
              const xpAlreadyClaimed = Boolean(milestone.xp_awarded);

              return (
                <div
                  key={milestone.id}
                  className={`relative p-4 rounded-xl border transition-all space-y-3 ${
                    isCompleted
                      ? 'bg-[#0E1C36]/90 border-emerald-500/35'
                      : isInProgress
                      ? 'bg-[#151842] border-cyan-400/50 shadow-lg shadow-cyan-500/5'
                      : 'bg-[#0E142D] border-slate-800'
                  }`}
                >
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-[27px] top-5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-300'
                        : isInProgress
                        ? 'bg-cyan-400 border-cyan-200 animate-pulse'
                        : 'bg-slate-900 border-slate-600'
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-cyan-300">
                        {milestone.phase} • {milestone.duration}
                      </span>
                      {milestone.target_skill_name && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-500/30">
                          {milestone.target_skill_name}:{' '}
                          {milestone.current_skill_level}% →{' '}
                          {milestone.target_skill_level}% target
                          {typeof milestone.current_skill_gap === 'number' &&
                          milestone.current_skill_gap > 0
                            ? ` (+${milestone.current_skill_gap}% gap)`
                            : ' (Met ✓)'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleMilestoneClick(milestone.id)}
                      disabled={isUpdating}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : isInProgress
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 hover:bg-cyan-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Click to cycle milestone status (persisted on server)"
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Completed (100 XP Claimed)
                        </>
                      ) : isInProgress ? (
                        <>
                          <CircleDot className="w-3.5 h-3.5 text-cyan-300" />
                          {xpAlreadyClaimed
                            ? 'In Progress (Click to Complete • XP Claimed)'
                            : 'In Progress (Click to Complete • +100 XP)'}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {xpAlreadyClaimed
                            ? 'Upcoming (Click to Start • XP Claimed)'
                            : 'Upcoming (Click to Start)'}
                        </>
                      )}
                    </button>
                  </div>

                  {milestone.priority_reason && (
                    <p className="text-[11px] font-mono text-amber-300">
                      Priority Rationale: {milestone.priority_reason}
                    </p>
                  )}

                  <div>
                    <h4 className="text-base font-bold text-white">
                      {milestone.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>

                  {/* Actionable Weekly Tasks */}
                  {milestone.weekly_tasks && milestone.weekly_tasks.length > 0 && (
                    <div className="p-3 rounded-lg bg-[#090F26] border border-slate-800/90 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5" />
                        Actionable Weekly Tasks
                      </p>
                      <ul className="space-y-1 text-xs text-slate-200">
                        {milestone.weekly_tasks.map((task, tidx) => (
                          <li key={tidx} className="flex items-start gap-2">
                            <span className="text-cyan-400 font-mono text-[11px] mt-0.5">
                              •
                            </span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Hands-on Mini-Project & Measurable Completion Criterion */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    {milestone.mini_project && (
                      <div className="p-2.5 rounded-lg bg-[#090F26] border border-slate-800/90 space-y-1">
                        <p className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          Hands-On Mini-Project
                        </p>
                        <p className="text-slate-200 font-medium">
                          {milestone.mini_project}
                        </p>
                      </div>
                    )}

                    {milestone.completion_criterion && (
                      <div className="p-2.5 rounded-lg bg-[#090F26] border border-slate-800/90 space-y-1">
                        <p className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Measurable Completion Criterion
                        </p>
                        <p className="text-slate-200">
                          {milestone.completion_criterion}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Connected Skill Challenges & Portfolio Projects */}
                  {((milestone.linked_challenges &&
                    milestone.linked_challenges.length > 0) ||
                    (milestone.linked_projects &&
                      milestone.linked_projects.length > 0)) && (
                    <div className="p-3 rounded-lg bg-[#0A112A] border border-purple-500/20 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                        Connected SkillVerse Features (Challenges & Portfolio Proofs)
                      </p>

                      {milestone.linked_challenges &&
                        milestone.linked_challenges.length > 0 && (
                          <div className="space-y-1.5">
                            {milestone.linked_challenges.map((ch) => (
                              <div
                                key={ch.id}
                                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#101836] border border-slate-800 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <div>
                                    <span className="font-semibold text-white">
                                      Challenge: {ch.title}
                                    </span>
                                    <span className="ml-2 text-[11px] font-mono text-cyan-300">
                                      (+{ch.skill_boost}% {ch.skill_name} • +
                                      {ch.xp_reward} XP)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      handleChallengeQuickToggle(ch.id)
                                    }
                                    disabled={updatingChallengeId === ch.id}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition cursor-pointer ${
                                      ch.completed
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30'
                                    }`}
                                  >
                                    {ch.completed
                                      ? 'Completed ✓'
                                      : 'Mark Complete'}
                                  </button>
                                  <button
                                    onClick={() => onNavigateChallenges(ch.id)}
                                    data-testid={`navigate-challenge-${ch.id}`}
                                    className="text-[11px] text-cyan-300 hover:underline font-medium cursor-pointer"
                                  >
                                    View →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {milestone.linked_projects &&
                        milestone.linked_projects.length > 0 && (
                          <div className="space-y-1.5">
                            {milestone.linked_projects.map((pr) => (
                              <div
                                key={pr.id}
                                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#101836] border border-slate-800 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <div>
                                    <span className="font-semibold text-white">
                                      Portfolio Project: {pr.title}
                                    </span>
                                    <span className="ml-2 text-[11px] font-mono text-emerald-300">
                                      ({pr.verified_badge})
                                    </span>
                                  </div>
                                </div>
                                {onNavigatePortfolio && (
                                  <button
                                    onClick={() => onNavigatePortfolio(pr.id)}
                                    data-testid={`navigate-project-${pr.id}`}
                                    className="text-[11px] text-cyan-300 hover:underline font-medium cursor-pointer"
                                  >
                                    Open Portfolio →
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Deliverable Footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-purple-300 font-semibold">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      Phase Deliverable: {milestone.deliverable}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
