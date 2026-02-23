import { useState, useEffect } from 'react';
import { predictionAPI } from '../services/api';
import './History.css';

export default function History() {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await predictionAPI.history();
            setPredictions(res.data.predictions);
        } catch {
            setError('Failed to load prediction history.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="metrics-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading history...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="history-page animate-fade-in-up">
            <div className="history-header">
                <h2>Detection History</h2>
                <p>Your past audio analysis results</p>
            </div>

            {predictions.length === 0 ? (
                <div className="history-empty glass-card">
                    <span className="empty-icon">📋</span>
                    <h3>No predictions yet</h3>
                    <p>Upload an audio or video file to get started</p>
                </div>
            ) : (
                <div className="history-list">
                    {predictions.map((pred, i) => (
                        <div
                            key={pred.id}
                            className="history-item glass-card"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <div className="history-icon">
                                {pred.label === 'FAKE' ? '🔴' : '🟢'}
                            </div>
                            <div className="history-info">
                                <span className="history-filename">{pred.filename}</span>
                                <span className="history-date">
                                    {new Date(pred.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="history-result">
                                <span className={`history-label ${pred.label === 'FAKE' ? 'label-fake' : 'label-real'}`}>
                                    {pred.label}
                                </span>
                                <span className="history-confidence">{pred.confidence}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
