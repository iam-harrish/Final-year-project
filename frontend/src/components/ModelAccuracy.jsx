import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { metricsAPI } from '../services/api';
import './ModelAccuracy.css';

export default function ModelAccuracy() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        try {
            const res = await metricsAPI.getMetrics();
            setMetrics(res.data);
        } catch (err) {
            setError('Failed to load model metrics.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="metrics-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading model metrics...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!metrics) return null;

    const { confusion_matrix: cm } = metrics;
    const total = cm.true_positive + cm.true_negative + cm.false_positive + cm.false_negative;

    // ROC data
    const rocData = metrics.roc_curve.fpr.map((fpr, i) => ({
        fpr: parseFloat(fpr.toFixed(3)),
        tpr: parseFloat(metrics.roc_curve.tpr[i].toFixed(3)),
    }));

    // Loss data
    const lossData = metrics.loss_history.epochs.map((epoch, i) => ({
        epoch,
        train: metrics.loss_history.train_loss[i],
        val: metrics.loss_history.val_loss[i],
    }));

    const metricCards = [
        { label: 'Accuracy', value: `${metrics.accuracy}%`, color: '#06b6d4' },
        { label: 'Precision', value: `${metrics.precision}%`, color: '#8b5cf6' },
        { label: 'Recall', value: `${metrics.recall}%`, color: '#10b981' },
        { label: 'F1-Score', value: `${metrics.f1_score}%`, color: '#f59e0b' },
    ];

    const CustomTooltip = ({ active, payload, label, type }) => {
        if (!active || !payload) return null;
        return (
            <div className="chart-tooltip">
                {type === 'roc' ? (
                    <>
                        <p>FPR: {payload[0]?.payload?.fpr}</p>
                        <p>TPR: {payload[0]?.payload?.tpr}</p>
                    </>
                ) : (
                    <>
                        <p>Epoch {label}</p>
                        {payload.map((p, i) => (
                            <p key={i} style={{ color: p.color }}>
                                {p.name}: {p.value.toFixed(4)}
                            </p>
                        ))}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="model-accuracy animate-fade-in-up">
            <div className="accuracy-header">
                <h2>Model Performance</h2>
                <p>Evaluation metrics for the deepfake detection model</p>
            </div>

            {/* Metric Cards */}
            <div className="metric-cards">
                {metricCards.map((m, i) => (
                    <div
                        key={m.label}
                        className="metric-card glass-card"
                        style={{ '--accent': m.color, animationDelay: `${i * 0.1}s` }}
                    >
                        <span className="metric-label">{m.label}</span>
                        <span className="metric-value">{m.value}</span>
                        <div className="metric-bar">
                            <div
                                className="metric-bar-fill"
                                style={{
                                    width: m.value,
                                    background: m.color,
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
                {/* Confusion Matrix */}
                <div className="chart-card glass-card">
                    <h3>Confusion Matrix</h3>
                    <div className="confusion-matrix">
                        <div className="cm-labels-top">
                            <span></span>
                            <span className="cm-header">Predicted Real</span>
                            <span className="cm-header">Predicted Fake</span>
                        </div>
                        <div className="cm-row">
                            <span className="cm-row-label">Actual Real</span>
                            <div className="cm-cell cm-tp">
                                <span className="cm-cell-value">{cm.true_positive}</span>
                                <span className="cm-cell-label">TP</span>
                                <span className="cm-cell-pct">{((cm.true_positive / total) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="cm-cell cm-fn">
                                <span className="cm-cell-value">{cm.false_negative}</span>
                                <span className="cm-cell-label">FN</span>
                                <span className="cm-cell-pct">{((cm.false_negative / total) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="cm-row">
                            <span className="cm-row-label">Actual Fake</span>
                            <div className="cm-cell cm-fp">
                                <span className="cm-cell-value">{cm.false_positive}</span>
                                <span className="cm-cell-label">FP</span>
                                <span className="cm-cell-pct">{((cm.false_positive / total) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="cm-cell cm-tn">
                                <span className="cm-cell-value">{cm.true_negative}</span>
                                <span className="cm-cell-label">TN</span>
                                <span className="cm-cell-pct">{((cm.true_negative / total) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    <p className="chart-note">Total samples: {total} ({metrics.real_samples} real, {metrics.fake_samples} fake)</p>
                </div>

                {/* ROC Curve */}
                <div className="chart-card glass-card">
                    <h3>ROC Curve <span className="auc-badge">AUC: {metrics.auc}</span></h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={rocData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                <defs>
                                    <linearGradient id="rocGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="fpr"
                                    label={{ value: 'False Positive Rate', position: 'bottom', fill: '#64748b', fontSize: 11 }}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                                <YAxis
                                    label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                                <Tooltip content={<CustomTooltip type="roc" />} />
                                <Line
                                    type="monotone"
                                    dataKey="tpr"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeDasharray="4 4"
                                    dot={false}
                                    data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tpr"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    fill="url(#rocGrad)"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Loss vs Epoch */}
                <div className="chart-card glass-card">
                    <h3>Loss vs Epoch</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={lossData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="epoch"
                                    label={{ value: 'Epoch', position: 'bottom', fill: '#64748b', fontSize: 11 }}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                                <YAxis
                                    label={{ value: 'Loss', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                                <Tooltip content={<CustomTooltip type="loss" />} />
                                <Line
                                    type="monotone"
                                    dataKey="train"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Training Loss"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Validation Loss"
                                    strokeDasharray="5 3"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="chart-legend">
                        <span className="legend-item"><span className="legend-line" style={{ background: '#8b5cf6' }}></span>Training</span>
                        <span className="legend-item"><span className="legend-line dashed" style={{ background: '#f59e0b' }}></span>Validation</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
