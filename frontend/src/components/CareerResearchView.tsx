import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Banknote,
  Calendar,
  Sparkles,
  Server,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  FlaskConical,
} from 'lucide-react';
import { CareerResearchResponse, InternshipItem } from '../types/skillverse';
import {
  fetchCareerResearch,
  triggerTinyFishScan,
  saveTinyFishApiKey,
  verifyLiveJobPosting,
} from '../services/api';

interface CareerResearchViewProps {
  selectedCareerId: string;
}

export const CareerResearchView: React.FC<CareerResearchViewProps> = ({
  selectedCareerId,
}) => {
  const [query, setQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [data, setData] = useState<CareerResearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [verifyingJobId, setVerifyingJobId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState<string>('');
  const [savingSecret, setSavingSecret] = useState<boolean>(false);
  const [showKeyForm, setShowKeyForm] = useState<boolean>(false);

  const loadResearch = useCallback(async (q: string, track: string) => {
    setLoading(true);
    try {
      const res = await fetchCareerResearch(q, track);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResearch('', 'all');
  }, [loadResearch]);

  const handleSaveSecretKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim()) return;
    setSavingSecret(true);
    setScanFeedback(null);
    try {
      const res = await saveTinyFishApiKey(secretInput.trim());
      setSecretInput('');
      setData((prev) =>
        prev ? { ...prev, tinyfish_status: res.tinyfish_status } : prev
      );
      setShowKeyForm(false);
      setScanFeedback(res.message);
    } catch (err: unknown) {
      setScanFeedback(
        err instanceof Error ? err.message : 'Could not save key to backend/.env'
      );
    } finally {
      setSavingSecret(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadResearch(query, trackFilter);
  };

  const handleTriggerBackendCheck = async () => {
    setScanning(true);
    setScanFeedback(null);
    try {
      const res = await triggerTinyFishScan(query.trim(), trackFilter);
      setData(res);
      if (!res.tinyfish_status.key_present && !res.tinyfish_status.connected) {
        setScanFeedback(
          'Backend Check Complete: TINYFISH_API_KEY is not set in backend/.env yet. Safely serving clearly labelled Demo Data.'
        );
      } else if (res.live_agent_error) {
        setScanFeedback(
          `TinyFish API request did not succeed (${res.live_agent_error}). Showing Demo Data fallback.`
        );
      } else if (res.extraction_empty || res.live_agent_warning) {
        setScanFeedback(
          res.live_agent_warning ||
            'TinyFish API connected, but 0 matching job listings were found on the target page. Showing Demo Data fallback.'
        );
      } else if (res.tinyfish_status.connected && (res.extracted_count ?? 0) > 0) {
        setScanFeedback(
          `Live TinyFish scan extracted ${res.extracted_count} job listings! Click "Verify posting" on any live listing below to verify its URL, title/company match, and full job description.`
        );
      }
    } finally {
      setScanning(false);
    }
  };

  const handleVerifyPosting = async (jobId: string) => {
    setVerifyingJobId(jobId);
    setScanFeedback(null);
    try {
      const res = await verifyLiveJobPosting(jobId, query.trim(), trackFilter);
      setData(res);
      if (res.last_verification) {
        setScanFeedback(
          `Posting Verification (${res.last_verification.status}): ${res.last_verification.reason}`
        );
      }
    } catch (err: unknown) {
      setScanFeedback(
        err instanceof Error ? err.message : 'Could not verify job posting'
      );
    } finally {
      setVerifyingJobId(null);
    }
  };

  const tfStatus = data?.tinyfish_status;
  const liveListings: InternshipItem[] = data?.live_internships || [];
  const demoListings: InternshipItem[] =
    data?.demo_internships ||
    (data?.internships || []).filter((i) => i.is_demo);

  return (
    <div className="space-y-6">
      {/* 1. Secure TinyFish Backend Integration Architecture Banner */}
      <div className="bg-gradient-to-r from-[#0D1330] via-[#13183D] to-[#0C1938] border border-cyan-500/35 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40">
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                Secure Backend Integration Structure (TinyFish API)
              </span>

              {tfStatus?.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  LIVE TINYFISH CONNECTION VERIFIED
                </span>
              ) : tfStatus?.key_present ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  KEY IN BACKEND/.ENV (UNVERIFIED — CLICK SCAN TO TEST)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  TINYFISH NOT CONNECTED YET — DEMO DATA ACTIVE
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white">
              Career Research: Live Job Extraction &amp; Skill Graph Matching
            </h2>
            {tfStatus?.connected ? (
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                <strong className="text-emerald-300">Live TinyFish Integration Active:</strong> The React frontend never stores or sees API keys. It calls{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono">
                  /api/career-research
                </code>{' '}
                on our Python Flask backend (<code className="text-purple-300 font-mono">backend/services/tinyfish_service.py</code>), which authenticates with{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 font-mono">
                  https://agent.tinyfish.ai/v1/automation/run
                </code>{' '}
                using your server-side <code className="text-cyan-300 font-mono">X-API-Key</code> header. Live-extracted listings and sample demo listings are shown in separate sections below.
              </p>
            ) : (
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                <strong className="text-cyan-300">How this works safely:</strong> The React frontend never stores or sees API keys. It calls{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono">
                  /api/career-research
                </code>{' '}
                on our Python Flask backend (<code className="text-purple-300 font-mono">backend/services/tinyfish_service.py</code>). Until{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono">
                  TINYFISH_API_KEY
                </code>{' '}
                is verified, the backend transparently serves clearly labelled Demo Data.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
            <button
              onClick={handleTriggerBackendCheck}
              disabled={scanning}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-95 transition cursor-pointer"
            >
              <Server className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning
                ? 'Running TinyFish Agent...'
                : tfStatus?.connected
                ? 'Run Live TinyFish Web Agent Scan'
                : 'Verify Backend TinyFish Integration'}
            </button>
            <span className="text-[11px] text-slate-400 font-mono text-center lg:text-right">
              Mode: {tfStatus?.mode || 'DEMO_DATA_FALLBACK'}
            </span>
          </div>
        </div>

        {scanFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-[#080D22] border border-cyan-400/40 text-xs text-cyan-200 flex items-center justify-between gap-3">
            <span>{scanFeedback}</span>
            <button
              onClick={() => setScanFeedback(null)}
              className="text-slate-400 hover:text-white text-xs font-mono shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Private Server-Side .env Key Input (Collapsed when already connected) */}
        {tfStatus?.connected && !showKeyForm ? (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              TINYFISH_API_KEY is stored securely in backend/.env (Server-Only)
            </span>
            <button
              type="button"
              onClick={() => setShowKeyForm(true)}
              className="text-cyan-300 hover:underline font-mono text-[11px]"
            >
              Rotate / Update API Key
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSaveSecretKey}
            className="mt-4 pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="flex-1">
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                Private Server Vault — Save <code className="text-cyan-300">TINYFISH_API_KEY</code> directly to <code className="text-purple-300">backend/.env</code> (Hidden &amp; Never Shown in Chat):
              </label>
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Paste your TINYFISH_API_KEY here (masked ••••••••)"
                autoComplete="off"
                className="w-full px-3.5 py-2 rounded-xl bg-[#070B1C] border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={savingSecret || !secretInput.trim()}
              className="sm:mt-5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition cursor-pointer shrink-0"
            >
              {savingSecret ? 'Saving to backend/.env...' : 'Save Key to backend/.env'}
            </button>
          </form>
        )}
      </div>

      {/* 2. Search & Track Filter Bar */}
      <div className="bg-[#0B1026] border border-purple-500/25 rounded-2xl p-5 shadow-xl">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter listings by role, company, skill (e.g., Python, React, ML, Backend), or location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080C1E] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Tracks' },
              { id: 'fullstack-ai', label: 'Full-Stack & AI' },
              { id: 'backend-cloud', label: 'Backend & Cloud' },
              { id: 'data-ml', label: 'ML & Data' },
              { id: 'frontend-ux', label: 'Frontend & UX' },
            ].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => {
                  setTrackFilter(t.id);
                  loadResearch(query, t.id);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  trackFilter === t.id
                    ? 'bg-purple-600/30 text-cyan-200 border-cyan-400'
                    : 'bg-[#101736] text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* 3. Main Content Grid: Separated Job Sections (8 cols) + Sample Skill Demand (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Two Distinct Sections (Live-Extracted vs. Demo Listings) */}
        <div className="lg:col-span-8 space-y-8">
          {/* SECTION A: LIVE-EXTRACTED JOB LISTINGS (TINYFISH WEB AGENT) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#09162B] border border-emerald-500/35 rounded-xl p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-base font-bold text-white">
                    Section 1: Live-Extracted Job Listings (TinyFish Web Agent)
                  </h3>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {liveListings.length} Live {liveListings.length === 1 ? 'Listing' : 'Listings'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Extracted from <code className="text-cyan-300 font-mono">https://www.python.org/jobs/</code>. Missing fields are marked <strong className="text-slate-200">&ldquo;Not available&rdquo;</strong>. Click <strong className="text-cyan-300">&ldquo;Verify posting&rdquo;</strong> on any listing to check if its URL is reachable and confirm the page matches the company and title.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 rounded-2xl bg-[#0B1026] border border-slate-800 text-center text-sm text-slate-400">
                Loading live career research dataset...
              </div>
            ) : liveListings.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#0B1026] border border-amber-500/30 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  No Live-Extracted Listings to Display
                </div>
                <p className="text-slate-300">
                  {data?.extraction_empty
                    ? 'The last TinyFish scan completed but returned 0 matching job listings from the target page.'
                    : 'No live listings match the current filter, or a live scan has not been run yet. Click "Run Live TinyFish Web Agent Scan" above.'}
                </p>
              </div>
            ) : (
              liveListings.map((item) => {
                const isVerified = item.verification_status === 'Verified';
                const isVerifyingThis = verifyingJobId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-5 border transition shadow-lg ${
                      isVerified
                        ? 'bg-gradient-to-b from-[#0A1D33] to-[#0B1026] border-emerald-500/50'
                        : 'bg-[#0B1026] border-cyan-500/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        {/* Status Badges: Reachability/Content Match kept separate from Application Status */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {item.source_label}
                          </span>

                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              URL Reachable (HTTP {item.http_status || 200}) • Title &amp; Company Matched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35">
                              <HelpCircle className="w-3.5 h-3.5" />
                              Unverified
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                              item.application_status === 'Currently accepting applications'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.application_status || 'Application status unknown'}
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-white">
                          {item.role}
                        </h4>
                        <p className="text-sm font-semibold text-cyan-300">
                          Company: <span className="text-white">{item.company}</span>
                        </p>
                      </div>

                      {/* Calculated Student Skill Graph Match Score */}
                      <div className="bg-[#090E24] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-right shrink-0">
                        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
                          {item.match_score > 0 ? `${item.match_score}% Match` : 'Not available'}
                        </span>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          Calculated from Skill Graph
                        </p>
                      </div>
                    </div>

                    {/* Only Extracted or Verified Fields — Missing Marked "Not available", Conflicts Explicitly Flagged */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 p-3 rounded-xl bg-[#080D20] border border-slate-800/90 text-xs">
                      <div className="flex items-start gap-2">
                        <MapPin
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            item.location_conflict ? 'text-amber-400' : 'text-cyan-400'
                          }`}
                        />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Location (Verified Posting)
                          </span>
                          <span
                            className={`font-medium ${
                              item.location_conflict
                                ? 'text-amber-300 font-bold'
                                : 'text-slate-200'
                            }`}
                          >
                            {item.location || 'Not available'}
                          </span>
                          {item.location_conflict && item.location_conflict_detail && (
                            <span className="block text-[11px] text-amber-200/90 mt-0.5 leading-snug">
                              {item.location_conflict_detail}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Compensation / Salary
                          </span>
                          <span className="text-slate-200 font-mono">
                            {item.stipend || 'Not available'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Type / Posted Date
                          </span>
                          <span className="text-slate-200">
                            {item.duration || 'Not available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Verification Status Reason Banner */}
                    <div
                      className={`mt-3 p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isVerified
                          ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>
                        <strong>Verification Status ({item.verification_status || 'Unverified'}):</strong>{' '}
                        {item.verification_reason}
                        {item.verified_at ? ` (Checked ${item.verified_at})` : ''}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVerifyPosting(item.id)}
                          disabled={isVerifyingThis}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck
                            className={`w-3.5 h-3.5 ${
                              isVerifyingThis ? 'animate-spin' : ''
                            }`}
                          />
                          {isVerifyingThis
                            ? 'Checking URL...'
                            : isVerified
                            ? 'Re-verify posting'
                            : 'Verify posting'}
                        </button>

                        {item.job_url && (
                          <a
                            href={item.job_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-xs font-bold inline-flex items-center gap-1"
                          >
                            Job URL
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Matched Skills from Student's Skill Graph */}
                    <div className="mt-4">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                        Matched Skills from Your Skill Graph (Based on Extracted/Verified Text)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.required_skills.map((req, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-[#121B3A] border border-purple-500/30 text-xs text-cyan-200 font-medium"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Extracted Details & Transparent Match Score Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-800/80">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Extracted / Verified Job Details
                        </p>
                        <ul className="space-y-1">
                          {item.highlights.map((h, i) => (
                            <li
                              key={i}
                              className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed"
                            >
                              <span className="text-cyan-400">•</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-[#0F1632] border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Transparent Match Score Breakdown ({item.match_score}%)
                          </p>
                          {item.score_explanation ? (
                            <div className="space-y-1.5 text-[11px] text-slate-300">
                              <p className="font-mono text-[10px] text-purple-300 bg-[#080C1E] p-1.5 rounded border border-slate-800">
                                {item.score_explanation.formula}
                              </p>
                              <p className="font-mono text-cyan-200">
                                <strong>Result:</strong> {item.score_explanation.arithmetic_summary}
                              </p>
                              <ul className="space-y-0.5 font-mono text-[10px] text-slate-300">
                                {item.score_explanation.calculation_steps.map((step, idx) => (
                                  <li key={idx}>• {step}</li>
                                ))}
                              </ul>
                              <div className="pt-1 border-t border-slate-800/80 space-y-0.5">
                                <p className="text-emerald-300">
                                  <strong>Meeting {item.score_explanation.role_target_pct}% Target:</strong>{' '}
                                  {item.score_explanation.skills_meeting_target.length > 0
                                    ? item.score_explanation.skills_meeting_target.join(', ')
                                    : 'None yet'}
                                </p>
                                <p className="text-amber-300">
                                  <strong>Below {item.score_explanation.role_target_pct}% Target (Gaps):</strong>{' '}
                                  {item.score_explanation.skills_below_target.length > 0
                                    ? item.score_explanation.skills_below_target.join('; ')
                                    : 'None'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <ul className="space-y-1">
                              {item.missing_skills_hint.map((hint, i) => (
                                <li key={i} className="text-xs text-slate-300">
                                  → {hint}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono mt-2 pt-2 border-t border-slate-800">
                          {item.apply_readiness}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* SECTION B: DEMO / SAMPLE INTERNSHIP LISTINGS (SEPARATED) */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#16122E] border border-amber-500/35 rounded-xl p-4">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-300" />
                  <h3 className="text-base font-bold text-white">
                    Section 2: Demo / Sample Internship Listings (Practice Dataset)
                  </h3>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    DEMO DATA ONLY
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  These sample listings are pre-loaded for ideathon demonstration and skill-gap practice. They are <strong className="text-amber-300">not live job postings</strong>.
                </p>
              </div>
            </div>

            {demoListings.map((item) => {
              const isPreferredTrack = item.career_track === selectedCareerId;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-5 border bg-[#0B1026]/80 border-amber-500/25 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          DEMO LISTING — SAMPLE DATA (NOT A LIVE JOB)
                        </span>
                        {isPreferredTrack && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Matches Active Career Track
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white">
                        {item.role}
                      </h4>
                      <p className="text-xs font-medium text-purple-300">
                        {item.company}
                      </p>
                    </div>

                    <div className="bg-[#090E24] border border-amber-500/30 rounded-xl px-3.5 py-2 text-right shrink-0">
                      <span className="text-lg font-extrabold text-amber-300">
                        {item.match_score}% Match
                      </span>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Demo Benchmark Fit
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {item.location} (Demo)
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-slate-300">
                      <Banknote className="w-3.5 h-3.5 text-amber-400" />
                      {item.stipend} (Demo)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      {item.duration}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                      Sample Required Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.required_skills.map((req, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-[#121B3A] border border-slate-700 text-xs text-slate-300"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Clearly Labelled Sample Skill Demand & Raw JSON Inspector */}
        <div className="lg:col-span-4 space-y-5">
          {/* Clearly Labelled Sample Skill Demand Benchmark (Requirement 7) */}
          <div className="bg-[#0B1026] border border-amber-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Sample Skill Demand Metrics
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                DEMO / SAMPLE DATASET
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 mb-4 leading-relaxed">
              <strong>Demo Notice:</strong> These percentages are illustrative sample benchmarks for college ideathon demonstration — they do not come from a live market telemetry dataset.
            </p>

            <div className="space-y-3.5">
              {data?.market_skill_demand.map((m, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {m.skill}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-300 font-mono">
                        [{m.trend}]
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {m.demand_pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-cyan-400 rounded-full"
                      style={{ width: `${m.demand_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw TinyFish Extraction Payload Box */}
          {Boolean(data?.live_agent_result) && (
            <div className="bg-[#0B1026] border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Raw TinyFish Extraction JSON
                </h4>
                <span className="text-[10px] font-mono text-cyan-300">
                  {data?.extracted_count || 0} Jobs
                </span>
              </div>
              <pre className="p-3 rounded-xl bg-[#050814] border border-slate-800 text-[10px] font-mono text-slate-200 overflow-x-auto max-h-72">
                {JSON.stringify(data?.live_agent_result, null, 2)}
              </pre>
            </div>
          )}

          {/* Security Architecture Note */}
          <div className="bg-[#0B1026] border border-cyan-500/25 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              How Posting Verification Works
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              When you click <strong>&ldquo;Verify posting&rdquo;</strong> on a live listing:
            </p>
            <div className="p-3 rounded-xl bg-[#070B1A] border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <p className="text-cyan-300"># Backend Verification Steps:</p>
              <p>1. Fetches the extracted job_url</p>
              <p>2. Checks HTTP 200 reachability</p>
              <p>3. Confirms title &amp; company on page</p>
              <p>4. Extracts real description text</p>
              <p>5. Computes Skill Graph match %</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
