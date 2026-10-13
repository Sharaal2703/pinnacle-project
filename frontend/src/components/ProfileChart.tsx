import React from 'react';
import type { PathwayScoreRow } from '@pinnacle/shared';

interface ProfileChartProps {
  scores: PathwayScoreRow[];
}

const PATHWAY_COLORS: Record<string, string> = {
  LING: '#3b82f6', // Blue
  LOGI: '#8b5cf6', // Violet
  SPAT: '#06b6d4', // Cyan
  MUSI: '#ec4899', // Pink
  BODY: '#f59e0b', // Amber
  NATU: '#10b981'  // Emerald
};

export const ProfileChart: React.FC<ProfileChartProps> = ({ scores }) => {
  // Sort scores by rank ascending
  const sortedScores = [...scores].sort((a, b) => a.rank - b.rank);

  return (
    <div className="card" aria-label="Learning Preference Profile Breakdown">
      <div className="card-header">
        <h2 className="card-title">Preference Profile Breakdown</h2>
        <p className="card-subtitle">
          Normalized score (0–100%) for each of the six learning pathways based on your self-report and scenario choices.
        </p>
      </div>

      <div className="chart-container" role="region" aria-label="Visual Preference Scores Chart">
        {sortedScores.map((item) => {
          const color = PATHWAY_COLORS[item.pathway_code] || '#4f46e5';
          const percent = item.score_0_100 != null ? Math.round(item.score_0_100) : null;
          const displayPercent = percent !== null ? `${percent}%` : 'Unavailable';

          return (
            <div key={item.pathway_code} className="chart-bar-row">
              <div className="chart-label-group">
                <span>
                  <strong>#{item.rank}</strong> {item.pathway_name}
                </span>
                <span aria-label={`Score: ${displayPercent}`}>
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
                    backgroundColor: color
                  }}
                >
                  {percent !== null && percent >= 15 ? `${percent}%` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessible Text Alternative Table */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Detailed Data View</h3>
        <table className="data-table" aria-label="Summary table of learning pathway preference scores">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Pathway</th>
              <th scope="col">Normalized Score</th>
              <th scope="col">Raw Score</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((s) => (
              <tr key={s.pathway_code}>
                <td><strong>#{s.rank}</strong></td>
                <td>{s.pathway_name} ({s.pathway_code})</td>
                <td>{s.score_0_100 != null ? `${s.score_0_100}%` : 'N/A'}</td>
                <td>{s.raw_score.toFixed(2)} / {s.max_score.toFixed(2)}</td>
                <td>
                  <span className="badge-tag" style={{ background: '#f1f5f9', color: '#334155' }}>
                    {s.available ? 'Calculated' : 'Unavailable'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
