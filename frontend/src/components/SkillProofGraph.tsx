import React, { useState, useMemo } from 'react';
import {
  Network,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FolderGit2,
  Trophy,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { SkillNode, SkillEdge, CareerGoal } from '../types/skillverse';

interface SkillProofGraphProps {
  skills: SkillNode[];
  edges: SkillEdge[];
  selectedCareer: CareerGoal;
  onNavigateTab?: (tab: 'challenges' | 'portfolio' | 'career') => void;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, { stroke: string; fill: string; badge: string; glow: string }> = {
  Frontend: {
    stroke: '#06b6d4', // cyan-500
    fill: '#083344',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    glow: 'rgba(6, 182, 212, 0.45)',
  },
  Backend: {
    stroke: '#8b5cf6', // violet-500
    fill: '#2e1065',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    glow: 'rgba(139, 92, 246, 0.45)',
  },
  'AI & Data': {
    stroke: '#ec4899', // pink-500
    fill: '#500724',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    glow: 'rgba(236, 72, 153, 0.45)',
  },
  'Core CS': {
    stroke: '#38bdf8', // sky-400
    fill: '#0c4a6e',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    glow: 'rgba(56, 189, 248, 0.45)',
  },
  DevOps: {
    stroke: '#a855f7', // purple-500
    fill: '#3b0764',
    badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    glow: 'rgba(168, 85, 247, 0.45)',
  },
};

export const SkillProofGraph: React.FC<SkillProofGraphProps> = ({
  skills,
  edges,
  selectedCareer,
  onNavigateTab,
  compact = false,
}) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    skills[0]?.id || 'react-ts'
  );
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    skills.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [skills]);

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedSkillId) || skills[0],
    [skills, selectedSkillId]
  );

  const skillMap = useMemo(() => {
    const map: Record<string, SkillNode> = {};
    skills.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [skills]);

  if (!selectedSkill) return null;

  const targetForSelected =
    selectedCareer.required_skills[selectedSkill.id] ?? 70;
  const gapForSelected = Math.max(0, targetForSelected - selectedSkill.current_level);

  return (
    <div className="space-y-5">
      {/* Header & Category Filter Bar */}
      {!compact && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1026]/90 border border-purple-500/20 rounded-2xl p-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-cyan-400/30">
                <Network className="w-5 h-5 text-cyan-300" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Interactive Skill Proof Graph
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                DEMO GRAPH
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Click any node to inspect verified proof-of-work (completed challenges & projects) vs. target requirements for{' '}
              <span className="text-cyan-300 font-semibold">
                {selectedCareer.title}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-[#121A3A] text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Graph + Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive SVG Graph Canvas */}
        <div className="lg:col-span-8 bg-[#080D20] border border-purple-500/25 rounded-2xl p-4 relative overflow-hidden shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Click any skill node to inspect proofs & career gap</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                Target Met
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>
                Growing Skill
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                Priority Gap
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 820 530"
              className="w-full h-auto min-w-[600px] select-none rounded-xl bg-gradient-to-b from-[#060A18] to-[#0B122C]"
            >
              <defs>
                <pattern
                  id="skillGrid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(139, 92, 246, 0.08)"
                    strokeWidth="1"
                  />
                </pattern>
                <radialGradient id="nodeGlowCyan" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.35)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                </radialGradient>
                <radialGradient id="nodeGlowPurple" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(139, 92, 246, 0.38)" />
                  <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                </radialGradient>
              </defs>

              {/* Background Grid */}
              <rect width="820" height="530" fill="url(#skillGrid)" />

              {/* Edges between Skills */}
              {edges.map((edge, idx) => {
                const fromNode = skillMap[edge.from];
                const toNode = skillMap[edge.to];
                if (!fromNode || !toNode) return null;

                const isHighlighted =
                  selectedSkill.id === edge.from || selectedSkill.id === edge.to;

                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;

                return (
                  <g key={`${edge.from}-${edge.to}-${idx}`}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={
                        isHighlighted
                          ? '#22d3ee'
                          : 'rgba(148, 163, 184, 0.22)'
                      }
                      strokeWidth={isHighlighted ? 2.8 : 1.5}
                      strokeDasharray={isHighlighted ? 'none' : '5,5'}
                    />
                    {isHighlighted && (
                      <g>
                        <rect
                          x={midX - 65}
                          y={midY - 11}
                          width="130"
                          height="20"
                          rx="6"
                          fill="#090E24"
                          stroke="rgba(34, 211, 238, 0.45)"
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 3}
                          textAnchor="middle"
                          fill="#67e8f9"
                          fontSize="10"
                          fontWeight="500"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Skill Nodes */}
              {skills.map((skill) => {
                const isSelected = skill.id === selectedSkill.id;
                const isDimmed =
                  activeCategory !== 'All' && skill.category !== activeCategory;
                const targetLvl = selectedCareer.required_skills[skill.id] ?? 70;
                const gap = Math.max(0, targetLvl - skill.current_level);

                const radius = 36;
                const circumference = 2 * Math.PI * radius;
                const progressOffset =
                  circumference - (skill.current_level / 100) * circumference;

                // Ring color based on whether target is met or has a gap
                const statusColor =
                  gap === 0
                    ? '#22d3ee' // cyan-400 (Met)
                    : gap <= 12
                    ? '#a855f7' // purple-500 (Near target)
                    : '#f59e0b'; // amber-500 (Priority gap)

                return (
                  <g
                    key={skill.id}
                    transform={`translate(${skill.x}, ${skill.y})`}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className="cursor-pointer transition-opacity"
                    style={{ opacity: isDimmed ? 0.3 : 1 }}
                  >
                    {/* Ambient Glow for Selected Node */}
                    {isSelected && (
                      <circle
                        r="62"
                        fill={
                          gap === 0
                            ? 'url(#nodeGlowCyan)'
                            : 'url(#nodeGlowPurple)'
                        }
                      />
                    )}

                    {/* Outer Selection Halo */}
                    {isSelected && (
                      <circle
                        r="44"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeDasharray="4,3"
                      />
                    )}

                    {/* Node Background Circle */}
                    <circle
                      r={radius}
                      fill="#0D1430"
                      stroke="rgba(148, 163, 184, 0.25)"
                      strokeWidth="5"
                    />

                    {/* Proficiency Progress Ring */}
                    <circle
                      r={radius}
                      fill="none"
                      stroke={statusColor}
                      strokeWidth="5"
                      strokeDasharray={circumference}
                      strokeDashoffset={progressOffset}
                      strokeLinecap="round"
                      transform="rotate(-90)"
                    />

                    {/* Proficiency Percentage Inside Node */}
                    <text
                      y="-2"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="14"
                      fontWeight="700"
                    >
                      {skill.current_level}%
                    </text>

                    {/* Verified Proofs Count Pill Inside Node */}
                    <text
                      y="14"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {skill.verified_proofs} {skill.verified_proofs === 1 ? 'proof' : 'proofs'}
                    </text>

                    {/* Skill Name Label Pill Below Node */}
                    <rect
                      x="-78"
                      y="46"
                      width="156"
                      height="24"
                      rx="8"
                      fill={isSelected ? '#1E1B4B' : '#090E24'}
                      stroke={
                        isSelected
                          ? '#22d3ee'
                          : 'rgba(139, 92, 246, 0.35)'
                      }
                      strokeWidth={isSelected ? '1.5' : '1'}
                    />
                    <text
                      x="0"
                      y="62"
                      textAnchor="middle"
                      fill={isSelected ? '#67e8f9' : '#e2e8f0'}
                      fontSize="11"
                      fontWeight={isSelected ? '700' : '600'}
                    >
                      {skill.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side: Selected Skill Proof Inspector */}
        <div className="lg:col-span-4 bg-[#0B1026] border border-purple-500/25 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                    CATEGORY_COLORS[selectedSkill.category]?.badge ||
                    'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  {selectedSkill.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  {selectedSkill.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
                  {selectedSkill.current_level}%
                </span>
                <p className="text-[11px] text-slate-400">Current Level</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedSkill.description}
            </p>

            {/* Target Comparison Box */}
            <div className="bg-[#111938] border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Target for <strong className="text-white">{selectedCareer.title}</strong>
                </span>
                <span className="font-mono font-bold text-cyan-300">
                  {targetForSelected}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${selectedSkill.current_level}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                {gapForSelected === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Career Benchmark Met!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Skill Gap: +{gapForSelected}% needed for target role
                  </span>
                )}
              </div>
            </div>

            {/* Verified Proof of Work List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Verified Proof of Work ({selectedSkill.proof_items.length})
                </h4>
                <span className="text-[11px] text-cyan-300 font-mono">
                  Live Synced
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedSkill.proof_items.map((proof, i) => {
                  const isChallenge = proof.toLowerCase().includes('challenge');
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#101735] border border-purple-500/20 text-xs text-slate-200"
                    >
                      {isChallenge ? (
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <FolderGit2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{proof}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons to Boost Skill */}
          {onNavigateTab && (
            <div className="pt-4 mt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigateTab('challenges')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-all"
              >
                <Trophy className="w-3.5 h-3.5" />
                Take Challenge
              </button>
              <button
                onClick={() => onNavigateTab('portfolio')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-all"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                Add Project Proof
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
