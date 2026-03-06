import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import './DetectionResult.css';

/* Animated SVG Gauge — semicircular confidence meter */
function GaugeChart({ value, isFake }) {
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedValue(value), 100);
        return () => clearTimeout(timer);
    }, [value]);

    const radius = 80;
    const strokeWidth = 14;
    const cx = 100;
    const cy = 95;
    const circumference = Math.PI * radius;
    const offset = circumference - (animatedValue / 100) * circumference;

    const color = isFake ? '#ef4444' : '#10b981';
    const glowColor = isFake ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)';

    return (
        <div className="gauge-container">
            <svg viewBox="0 0 200 120" className="gauge-svg">
                <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={isFake ? '#f97316' : '#06b6d4'} />
                        <stop offset="100%" stopColor={color} />
                    </linearGradient>
                    <filter id="gaugeShadow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                    </filter>
                </defs>
                {/* Track */}
                <path
                    d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Glow */}
                <path
                    d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                    fill="none"
                    stroke={glowColor}
                    strokeWidth={strokeWidth + 8}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    filter="url(#gaugeShadow)"
                    className="gauge-glow"
                />
                {/* Active arc */}
                <path
                    d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                    fill="none"
                    stroke="url(#gaugeGrad)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="gauge-arc"
                />
                {/* Center text */}
                <text x={cx} y={cy - 15} textAnchor="middle" className="gauge-value" fill={color}>
                    {Math.round(animatedValue)}%
                </text>
                <text x={cx} y={cy + 5} textAnchor="middle" className="gauge-label-text" fill="#94a3b8">
                    Confidence
                </text>
            </svg>
        </div>
    );
}

/* Donut chart with real vs fake probabilities */
function ProbabilityDonut({ realProb, fakeProb }) {
    const data = [
        { name: 'Real', value: realProb },
        { name: 'Fake', value: fakeProb },
    ];
    const COLORS = ['#10b981', '#ef4444'];

    const renderLabel = ({ cx, cy }) => (
        <>
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9" fontSize="20" fontWeight="700">
                {realProb > fakeProb ? `${realProb.toFixed(1)}%` : `${fakeProb.toFixed(1)}%`}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">
                {realProb > fakeProb ? 'Real' : 'Fake'}
            </text>
        </>
    );

    return (
        <div className="donut-container">
            <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        labelLine={false}
                        label={renderLabel}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={entry.name}
                                fill={COLORS[index]}
                                stroke="none"
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
                <span className="legend-dot real-dot"></span>
                <span>Real {realProb.toFixed(1)}%</span>
                <span className="legend-dot fake-dot"></span>
                <span>Fake {fakeProb.toFixed(1)}%</span>
            </div>
        </div>
    );
}

export default function DetectionResult({ result, onUploadAnother }) {
    const isFake = result.label === 'FAKE';

    return (
        <div className="detection-result animate-fade-in-up">
            <div className="result-header">
                <div className="result-filename-badge">
                    <span className="filename-icon">{isFake ? '⚠️' : '✅'}</span>
                    <span>{result.filename}</span>
                </div>
            </div>

            {/* Main Verdict Card */}
            <div className={`result-card ${isFake ? 'result-fake' : 'result-real'}`}>
                <div className="result-badge-container">
                    <div className={`result-pulse ${isFake ? 'pulse-fake' : 'pulse-real'}`}></div>
                    <div className={`result-label-badge ${isFake ? 'badge-fake' : 'badge-real'}`}>
                        {result.label}
                    </div>
                </div>
                <p className="result-verdict-text">
                    {isFake
                        ? 'This audio appears to be AI-generated or spoofed'
                        : 'This audio appears to be authentic and genuine'}
                </p>
            </div>

            {/* Charts Row: Gauge + Donut */}
            <div className="charts-row">
                <div className="chart-panel glass-card">
                    <h4>Confidence Meter</h4>
                    <GaugeChart value={result.confidence} isFake={isFake} />
                </div>
                <div className="chart-panel glass-card">
                    <h4>Probability Distribution</h4>
                    <ProbabilityDonut
                        realProb={result.real_probability}
                        fakeProb={result.fake_probability}
                    />
                </div>
            </div>

            {/* Probability Bars */}
            <div className="prob-bars">
                <div className="prob-item">
                    <div className="prob-header">
                        <span className="prob-label-text real-label">
                            <span className="prob-dot real-dot"></span>
                            REAL
                        </span>
                        <span className="prob-value">{result.real_probability}%</span>
                    </div>
                    <div className="prob-track">
                        <div
                            className="prob-fill real-fill"
                            style={{ width: `${result.real_probability}%` }}
                        ></div>
                    </div>
                </div>

                <div className="prob-item">
                    <div className="prob-header">
                        <span className="prob-label-text fake-label">
                            <span className="prob-dot fake-dot"></span>
                            FAKE
                        </span>
                        <span className="prob-value">{result.fake_probability}%</span>
                    </div>
                    <div className="prob-track">
                        <div
                            className="prob-fill fake-fill"
                            style={{ width: `${result.fake_probability}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="result-details glass-card">
                <h4>Analysis Details</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="detail-label">Classification</span>
                        <span className={`detail-value ${isFake ? 'text-red' : 'text-green'}`}>
                            {isFake ? 'AI-Generated / Spoofed' : 'Bonafide / Authentic'}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Confidence</span>
                        <span className="detail-value">{result.confidence}%</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Raw Score</span>
                        <span className="detail-value">{result.raw_score}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Features Used</span>
                        <span className="detail-value">Mel Spectrogram + Audio Frames</span>
                    </div>
                </div>
            </div>

            {/* Upload Another */}
            <button className="btn-secondary upload-another-btn" onClick={onUploadAnother}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 2v12M9 2L5 6M9 2l4 4M3 12v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                Upload Another File
            </button>
        </div>
    );
}
