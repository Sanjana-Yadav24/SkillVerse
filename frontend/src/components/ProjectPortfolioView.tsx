import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Plus,
  ExternalLink,
  Github,
  Trash2,
  Sparkles,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { PortfolioProject, SkillNode } from '../types/skillverse';
import { NewProjectPayload } from '../services/api';

interface ProjectPortfolioViewProps {
  projects: PortfolioProject[];
  skills: SkillNode[];
  focusedProjectId?: string | null;
  onAddProject: (payload: NewProjectPayload) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export const ProjectPortfolioView: React.FC<ProjectPortfolioViewProps> = ({
  projects,
  skills,
  focusedProjectId,
  onAddProject,
  onDeleteProject,
}) => {
  const [showForm, setShowForm] = useState<boolean>(false);

  useEffect(() => {
    if (focusedProjectId) {
      const timer = window.setTimeout(() => {
        const el = document.getElementById(`project-card-${focusedProjectId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [focusedProjectId]);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [techStackInput, setTechStackInput] = useState('React, TypeScript, Python, Flask');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['react-ts', 'python-flask']);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleSkillSelection = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter both a project title and description.');
      return;
    }

    setSubmitting(true);
    try {
      const techList = techStackInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onAddProject({
        title: title.trim(),
        tagline: tagline.trim() || 'Student Portfolio Project',
        description: description.trim(),
        github_url: githubUrl.trim() || 'https://github.com/student/project',
        live_url: liveUrl.trim(),
        tech_stack: techList.length ? techList : ['React', 'TypeScript'],
        linked_skills: selectedSkills.length ? selectedSkills : ['react-ts'],
      });

      // Reset form
      setTitle('');
      setTagline('');
      setDescription('');
      setGithubUrl('');
      setLiveUrl('');
      setShowForm(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const skillNameMap: Record<string, string> = {};
  skills.forEach((s) => {
    skillNameMap[s.id] = s.name;
  });

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div className="bg-[#0B1026] border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-600/30 border border-cyan-400/30">
              <FolderGit2 className="w-5 h-5 text-cyan-300" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Proof-of-Work Project Portfolio
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {projects.length} PROJECTS
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Add your GitHub repositories, hackathon prototypes, and course projects. Every project automatically adds verified proof nodes to your{' '}
            <span className="text-cyan-300 font-semibold">Skill Proof Graph</span>.
          </p>
        </div>

        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:opacity-95 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close Project Form' : 'Add New Project (+150 XP)'}
        </button>
      </div>

      {/* Collapsible Add Project Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#0D1430] border border-cyan-400/40 rounded-2xl p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Submit New Portfolio Project & Link Skill Proofs
            </h3>
            <span className="text-xs text-cyan-300 font-mono">
              +6% Proficiency to each linked skill
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AI Resume Analyzer & Job Matcher"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080C1F] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Short Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g., Full-stack app that scores resumes against live roles"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080C1F] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Project Description & Impact *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what problem you solved, the architecture you built, and key technical achievements..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#080C1F] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080C1F] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Live Demo URL (Optional)
              </label>
              <input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://my-project-demo.vercel.app"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080C1F] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tech Stack (Comma-separated)
              </label>
              <input
                type="text"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                placeholder="React, TypeScript, Python, Flask"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080C1F] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Skill Proof Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Skills Verified by This Project (Updates Skill Proof Graph):
            </label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => {
                const isChecked = selectedSkills.includes(skill.id);
                return (
                  <button
                    type="button"
                    key={skill.id}
                    onClick={() => toggleSkillSelection(skill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm'
                        : 'bg-[#080C1F] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-95"
            >
              {submitting ? 'Saving Project...' : 'Save Project & Boost Skill Graph'}
            </button>
          </div>
        </form>
      )}

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const isFocused = focusedProjectId === proj.id;
          return (
          <div
            key={proj.id}
            id={`project-card-${proj.id}`}
            className={`bg-[#0B1026] border rounded-2xl p-5 flex flex-col justify-between shadow-xl transition ${
              isFocused
                ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/20'
                : 'border-purple-500/25 hover:border-cyan-400/40'
            }`}
          >
            <div>
              {/* Top Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                      proj.is_demo
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {proj.verified_badge}
                  </span>
                  {isFocused && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/40">
                      Selected from Roadmap
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {proj.date_added}
                  </span>
                  <button
                    onClick={() => onDeleteProject(proj.id)}
                    title="Remove project"
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white leading-snug">
                {proj.title}
              </h3>
              <p className="text-xs font-medium text-cyan-300 mt-1">
                {proj.tagline}
              </p>
              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {proj.description}
              </p>

              {/* Tech Stack Pills */}
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-purple-400" />
                  Tech Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {proj.tech_stack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md bg-[#121B3A] border border-slate-700/80 text-xs text-slate-200 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Linked Skill Proofs */}
              <div className="mt-3.5">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Verified Skills Linked
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {proj.linked_skills.map((sid) => (
                    <span
                      key={sid}
                      className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-200 font-medium"
                    >
                      ✓ {skillNameMap[sid] || sid}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Links Footer */}
            <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
              {proj.github_url ? (
                <a
                  href={proj.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition"
                >
                  <Github className="w-4 h-4" />
                  Source Code
                </a>
              ) : (
                <span className="text-xs text-slate-500">No repo link</span>
              )}

              {proj.live_url && (
                <a
                  href={proj.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition"
                >
                  Live Demo
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};
