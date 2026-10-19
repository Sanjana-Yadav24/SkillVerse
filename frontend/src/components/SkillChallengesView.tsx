import React, { useEffect, useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Circle,
  Zap,
  Clock,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { SkillChallenge } from '../types/skillverse';

interface SkillChallengesViewProps {
  challenges: SkillChallenge[];
  focusedChallengeId?: string | null;
  onToggleChallenge: (challengeId: string) => Promise<void>;
}

export const SkillChallengesView: React.FC<SkillChallengesViewProps> = ({
  challenges,
  focusedChallengeId,
  onToggleChallenge,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedChallengeId) {
      setFilter('all');
      const timer = window.setTimeout(() => {
        const el = document.getElementById(`challenge-card-${focusedChallengeId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [focusedChallengeId]);

  const filtered = challenges.filter((c) => {
    if (filter === 'pending') return !c.completed;
    if (filter === 'completed') return c.completed;
    return true;
  });

  const completedCount = challenges.filter((c) => c.completed).length;

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await onToggleChallenge(id);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B1026] border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/30 to-purple-600/30 border border-amber-400/30">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Skill Verification Challenges
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              DEMO CHALLENGES
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Complete hands-on engineering challenges to earn XP and automatically add verified proof-of-work to your{' '}
            <span className="text-cyan-300 font-semibold">Skill Proof Graph</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#111938] border border-slate-700/70 text-xs">
            <span className="text-slate-400">Progress: </span>
            <strong className="text-cyan-300 font-mono text-sm">
              {completedCount} / {challenges.length}
            </strong>{' '}
            <span className="text-slate-300">Completed</span>
          </div>

          <div className="flex items-center bg-[#101735] p-1 rounded-xl border border-slate-800">
            {(['all', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  filter === tab
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Challenge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((challenge) => {
          const isBusy = togglingId === challenge.id;
          const isFocused = focusedChallengeId === challenge.id;

          const diffBadge =
            challenge.difficulty === 'Advanced'
              ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';

          return (
            <div
              key={challenge.id}
              id={`challenge-card-${challenge.id}`}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-lg ${
                isFocused
                  ? 'bg-gradient-to-b from-[#161B44] to-[#0B1228] border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/20'
                  : challenge.completed
                  ? 'bg-gradient-to-b from-[#0E1E38] to-[#0B1228] border-emerald-500/40'
                  : 'bg-[#0B1026] border-purple-500/25 hover:border-purple-400/50'
              }`}
            >
              <div>
                {/* Top Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${diffBadge}`}
                    >
                      {challenge.difficulty}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {challenge.skill_name}
                    </span>
                    {isFocused && (
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/40">
                        Selected from Roadmap
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Zap className="w-3.5 h-3.5" />+{challenge.xp_reward} XP
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      <Sparkles className="w-3.5 h-3.5" />+{challenge.skill_boost}% Skill
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-white leading-snug">
                  {challenge.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {challenge.description}
                </p>

                {/* Acceptance Criteria Checklist */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#0F1734] border border-slate-800/90 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    Verification Criteria
                  </p>
                  <ul className="space-y-1.5">
                    {challenge.acceptance_criteria.map((crit, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-300 flex items-start gap-2"
                      >
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer Action Row */}
              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Est. Time: {challenge.estimated_time}
                </span>

                <button
                  onClick={() => handleToggle(challenge.id)}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    challenge.completed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20 hover:opacity-95'
                  }`}
                >
                  {challenge.completed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Completed & Verified (Click to Undo)
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4" />
                      {isBusy ? 'Updating Graph...' : 'Mark Challenge Complete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
