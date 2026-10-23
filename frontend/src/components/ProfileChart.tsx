import React, { useState } from 'react';
import type { PathwayScoreRow } from '@pinnacle/shared';
import {
  BarChart3,
  Radar,
  PieChart,
  Table as TableIcon,
  LayoutGrid,
  Sparkles,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

interface ProfileChartProps {
  scores: PathwayScoreRow[];
  dominantCode?: string;
  secondaryCode?: string;
}

const PATHWAY_CONFIG: Record<
  string,
  { name: string; color: string; icon: string; strategy: string }
> = {
  LING: {
    name: 'Linguistic',
    color: '#3b82f6',
    icon: '📖',
    strategy: 'Narrative stories, text explanations, guided reading passages, vocabulary analogies, and discussions.'
  },
  LOGI: {
    name: 'Logical-Mathematical',
    color: '#8b5cf6',
    icon: '🧩',
    strategy: 'Flowcharts, cause-and-effect reasoning, structured formula problems, data tables, and logic puzzles.'
  },
  VIS: {
    name: 'Visual',
    color: '#06b6d4',
    icon: '🗺️',
    strategy: 'Animated diagrams, 3D visual models, geographic maps, concept graphs, and visual color guides.'
  },
  MUSI: {
    name: 'Musical',
    color: '#ec4899',
    icon: '🎵',
    strategy: 'Rhythmic mnemonics, educational rhymes, audio explanations, songs, and melodic memory aids.'
  },
  BODY: {
    name: 'Bodily-Kinesthetic',
    color: '#f59e0b',
    icon: '🛠️',
    strategy: 'Interactive drag-and-drop simulations, physical building tasks, gestures, and practical experiments.'
  },
  NAT: {
    name: 'Naturalistic',
    color: '#10b981',
    icon: '🌿',
    strategy: 'Nature-based examples, living specimen observation, outdoor classification, and environmental connections.'
  },
  INTER: {
    name: 'Interpersonal',
    color: '#14b8a6',
    icon: '🤝',
    strategy: 'Collaborative problem solving, peer discussion, group explanations, and shared learning activities.'
  },
  INTRA: {
    name: 'Intrapersonal',
    color: '#6366f1',
    icon: '🪞',
    strategy: 'Self-paced practice, reflection prompts, personal goals, and independent learning choices.'
  }
};

type ViewMode = 'all' | 'radar' | 'bars' | 'radial' | 'table';

export const ProfileChart: React.FC<ProfileChartProps> = ({
  scores,
  dominantCode,
  secondaryCode
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

  // Ensure scores is a safe array
  const safeScores = Array.isArray(scores) ? scores : [];

  // Order for radar chart polygon (clockwise fixed order)
  const RADAR_ORDER = ['LING', 'LOGI', 'VIS', 'MUSI', 'BODY', 'NAT', 'INTER', 'INTRA'];

  // Map scores by pathway code
  const scoreMap = new Map<string, PathwayScoreRow>();
  for (const s of safeScores) {
    if (s && s.pathway_code) {
      scoreMap.set(s.pathway_code, s);
    }
  }

  // Sorted descending by rank
  const rankedScores = [...safeScores].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  if (safeScores.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <p>No score calculations available to visualize yet.</p>
      </div>
    );
  }

  // --- 1. Radar Chart Mathematics ---
  const cx = 220;
  const cy = 200;
  const radius = 130;
  const numAxes = RADAR_ORDER.length;

  const getCoordinates = (index: number, val: number) => {
    // Angle starting from top (-pi/2)
    const angle = (index * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = (radius * Math.max(0, Math.min(100, val))) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate web rings (20%, 40%, 60%, 80%, 100%)
  const webLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const webRings = webLevels.map((lvl) => {
    const points = RADAR_ORDER.map((_, i) => {
      const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
      const x = cx + radius * lvl * Math.cos(angle);
      const y = cy + radius * lvl * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return { level: lvl * 100, points };
  });

  // Calculate polygon points for student scores
  const radarPoints = RADAR_ORDER.map((code, i) => {
    const s = scoreMap.get(code);
    const val = s?.score_0_100 ?? 0;
    const { x, y } = getCoordinates(i, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="card" style={{ padding: '2rem 1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="card-title">Preference Intelligence Type Visualization</h2>
          <p className="card-subtitle">
            Explore your learning preference distribution through multimodal charts and analytical views.
          </p>
        </div>

        {/* View Mode Toggle Bar */}
        <div className="plot-selector-bar" role="tablist" aria-label="Chart Views">
          <button
            type="button"
            className={`plot-toggle-btn ${viewMode === 'radar' ? 'active' : ''}`}
            onClick={() => setViewMode('radar')}
          >
            <Radar size={16} />
            <span>Radar Spider</span>
          </button>
          <button
            type="button"
            className={`plot-toggle-btn ${viewMode === 'bars' ? 'active' : ''}`}
            onClick={() => setViewMode('bars')}
          >
            <BarChart3 size={16} />
            <span>Bar Rank</span>
          </button>
          <button
            type="button"
            className={`plot-toggle-btn ${viewMode === 'radial' ? 'active' : ''}`}
            onClick={() => setViewMode('radial')}
          >
            <PieChart size={16} />
            <span>Radial Meters</span>
          </button>
          <button
            type="button"
            className={`plot-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <TableIcon size={16} />
            <span>Data Table</span>
          </button>
        </div>
      </div>

      {/* --- 1. RADAR / SPIDER WEB PLOT --- */}
      {(viewMode === 'all' || viewMode === 'radar') && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem 1rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Multimodal Radar Profile</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Spider polygon showing balance across the eight intelligence pathways. Outer ring represents 100%.
            </p>
          </div>

          <div className="radar-svg-container">
            <svg viewBox="0 0 440 400" width="100%" height="auto" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Concentric Web Rings */}
              {webRings.map((ring) => (
                <polygon
                  key={ring.level}
                  points={ring.points}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray={ring.level === 100 ? 'none' : '3,3'}
                />
              ))}

              {/* Ring percentage markers */}
              {webLevels.map((lvl) => (
                <text
                  key={lvl}
                  x={cx + 4}
                  y={cy - radius * lvl + 10}
                  fontSize="9"
                  fill="#94a3b8"
                  fontWeight="600"
                >
                  {lvl * 100}%
                </text>
              ))}

              {/* Spokes / Axis Lines */}
              {RADAR_ORDER.map((code, i) => {
                const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);

                // Label positioning slightly outside radius
                const lx = cx + (radius + 28) * Math.cos(angle);
                const ly = cy + (radius + 24) * Math.sin(angle);
                const cfg = PATHWAY_CONFIG[code];
                const s = scoreMap.get(code);
                const scoreVal = s?.score_0_100 != null ? `${Math.round(s.score_0_100)}%` : 'N/A';
                const isDom = code === dominantCode;

                return (
                  <g key={code}>
                    <line x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1.5" />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="11"
                      fontWeight={isDom ? '800' : '600'}
                      fill={isDom ? '#4f46e5' : '#334155'}
                    >
                      {cfg?.icon} {cfg?.name}
                    </text>
                    <text
                      x={lx}
                      y={ly + 13}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fontWeight="700"
                      fill={cfg?.color || '#64748b'}
                    >
                      {scoreVal}
                    </text>
                  </g>
                );
              })}

              {/* Data Polygon */}
              <polygon
                points={radarPoints}
                fill="url(#radarFillGrad)"
                stroke="#4f46e5"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Data Point Dots */}
              {RADAR_ORDER.map((code, i) => {
                const s = scoreMap.get(code);
                const val = s?.score_0_100 ?? 0;
                const { x, y } = getCoordinates(i, val);
                const cfg = PATHWAY_CONFIG[code];

                return (
                  <circle
                    key={`dot-${code}`}
                    cx={x}
                    cy={y}
                    r={code === dominantCode ? 6 : 4.5}
                    fill={cfg?.color || '#4f46e5'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* --- 2. HORIZONTAL COMPARATIVE BAR PLOT --- */}
      {(viewMode === 'all' || viewMode === 'bars') && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1e293b' }}>
            Comparative Pathway Strength
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Ranked from highest relative preference score to lowest on a 0–100 scale.
          </p>

          <div className="chart-container">
            {rankedScores.map((item) => {
              const cfg = PATHWAY_CONFIG[item.pathway_code];
              const percent = item.score_0_100 != null ? Math.round(item.score_0_100) : null;
              const displayPercent = percent !== null ? `${percent}%` : 'Unavailable';
              const isDominant = item.pathway_code === dominantCode;
              const isSecondary = item.pathway_code === secondaryCode;

              return (
                <div key={item.pathway_code} className="chart-bar-row">
                  <div className="chart-label-group">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 800, color: '#64748b' }}>#{item.rank}</span>
                      <span>{cfg?.icon}</span>
                      <strong>{item.pathway_name}</strong>
                      {isDominant && <span className="badge-tag primary">Primary</span>}
                      {isSecondary && <span className="badge-tag secondary">Secondary</span>}
                    </span>
                    <span style={{ fontWeight: 800, color: cfg?.color || '#4f46e5' }}>
                      {displayPercent}
                    </span>
                  </div>

                  <div
                    className="chart-track"
                    role="meter"
                    aria-valuenow={percent ?? 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.pathway_name}: ${displayPercent}`}
                  >
                    <div
                      className="chart-fill"
                      style={{
                        width: `${percent ?? 0}%`,
                        backgroundColor: cfg?.color || '#4f46e5'
                      }}
                    >
                      {percent !== null && percent >= 18 ? `${percent}%` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 3. CIRCULAR RADIAL DIAL GAUGES --- */}
      {(viewMode === 'all' || viewMode === 'radial') && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1e293b' }}>
            Radial Pathway Gauges
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Individual dial meters measuring affinity score in each modality.
          </p>

          <div className="radial-gauges-grid">
            {rankedScores.map((item) => {
              const cfg = PATHWAY_CONFIG[item.pathway_code];
              const percent = item.score_0_100 != null ? Math.round(item.score_0_100) : 0;
              const r = 36;
              const circumference = 2 * Math.PI * r;
              const strokeDashoffset = circumference - (percent / 100) * circumference;

              return (
                <div key={item.pathway_code} className="radial-gauge-item">
                  <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                    <svg className="radial-gauge-svg" width="90" height="90" viewBox="0 0 90 90">
                      <circle
                        className="radial-circle-bg"
                        cx="45"
                        cy="45"
                        r={r}
                      />
                      <circle
                        className="radial-circle-fg"
                        cx="45"
                        cy="45"
                        r={r}
                        stroke={cfg?.color || '#4f46e5'}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: '#1e293b'
                      }}
                    >
                      {item.score_0_100 != null ? `${percent}%` : '--'}
                    </div>
                  </div>
                  <div className="radial-label-name">
                    {cfg?.icon} {item.pathway_name}
                  </div>
                  <div className="radial-rank-tag">Rank #{item.rank}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 4. ACCESSIBLE DATA SUMMARY TABLE --- */}
      {(viewMode === 'all' || viewMode === 'table') && (
        <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#1e293b' }}>
            Score Calculations Summary
          </h3>
          <table className="data-table" aria-label="Detailed breakdown table of pathway scores">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Pathway</th>
                <th scope="col">Normalized Score</th>
                <th scope="col">Raw Points</th>
                <th scope="col">Max Possible</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rankedScores.map((s) => {
                const rawVal = Number(s.raw_score ?? (s as any).rawScore ?? 0);
                const maxVal = Number(s.max_score ?? (s as any).maxScore ?? 0);
                return (
                  <tr key={s.pathway_code}>
                    <td><strong>#{s.rank}</strong></td>
                    <td>
                      {PATHWAY_CONFIG[s.pathway_code]?.icon} {s.pathway_name} ({s.pathway_code})
                    </td>
                    <td>
                      <strong>{s.score_0_100 != null ? `${s.score_0_100}%` : 'N/A'}</strong>
                    </td>
                    <td>{isNaN(rawVal) ? '0.00' : rawVal.toFixed(2)}</td>
                    <td>{isNaN(maxVal) ? '0.00' : maxVal.toFixed(2)}</td>
                    <td>
                      <span className="badge-tag" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {s.available ? 'Calculated' : 'Unavailable'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
