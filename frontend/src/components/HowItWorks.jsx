import { useState, useEffect } from 'react';
import { metricsAPI } from '../services/api';
import './HowItWorks.css';

const ICONS = {
    upload: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4v20M16 4l-6 6M16 4l6 6" />
            <path d="M6 20v6a2 2 0 002 2h16a2 2 0 002-2v-6" />
        </svg>
    ),
    waveform: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 16h2l2-8 3 16 3-12 3 8 2-4 3 10 2-10 2 4h2" />
        </svg>
    ),
    brain: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="3" />
            <circle cx="22" cy="10" r="3" />
            <circle cx="10" cy="22" r="3" />
            <circle cx="22" cy="22" r="3" />
            <circle cx="16" cy="16" r="3" />
            <path d="M13 10h6M10 13v6M22 13v6M13 22h6" />
            <path d="M13 13l3 3M19 13l-3 3M13 19l3-3M19 19l-3-3" />
        </svg>
    ),
    result: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11L13 20l-4-4" />
            <circle cx="16" cy="16" r="12" />
        </svg>
    ),
};

export default function HowItWorks() {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            const res = await metricsAPI.howItWorks();
            setContent(res.data);
        } catch {
            // Fallback content
            setContent({
                title: 'How Deepfake Audio Detection Works',
                steps: [
                    { step: 1, title: 'Upload Audio or Video', description: 'Upload an audio or video file for analysis.', icon: 'upload' },
                    { step: 2, title: 'Dual Feature Extraction', description: 'A mel-spectrogram captures spectral patterns while raw audio frames preserve temporal dynamics.', icon: 'waveform' },
                    { step: 3, title: 'Hybrid Neural Network Analysis', description: 'A CNN analyzes spectral features and a GRU processes temporal patterns. Both are fused for comprehensive detection.', icon: 'brain' },
                    { step: 4, title: 'Classification Result', description: 'Get a confidence score for real vs AI-generated audio.', icon: 'result' },
                ],
                model_info: {
                    architecture: 'Hybrid CNN + GRU Fusion Model',
                    spectral_branch: 'SpectralCNN — Conv2d(1→16→32) + FC → 64-dim',
                    temporal_branch: 'TemporalGRU — GRU(400→128) + FC → 64-dim',
                    fusion: 'Concatenation (128-dim) → Linear(128→64→1)',
                    activation: 'ReLU + Sigmoid',
                    training_data: 'ASVspoof 2019 LA Dataset',
                    sample_rate: '16kHz',
                    accuracy: '91.52%',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="metrics-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!content) return null;

    return (
        <div className="how-it-works animate-fade-in-up">
            <div className="hiw-header">
                <h2>{content.title}</h2>
                <p>Understanding the AI-powered deepfake detection pipeline</p>
            </div>

            {/* Steps */}
            <div className="hiw-steps">
                {content.steps.map((step, i) => (
                    <div key={step.step} className="hiw-step glass-card" style={{ animationDelay: `${i * 0.12}s` }}>
                        <div className="step-icon-wrapper">
                            <span className="step-number">{step.step}</span>
                            <div className="step-icon">{ICONS[step.icon] || ICONS.result}</div>
                        </div>
                        <div className="step-content">
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                        </div>
                        {i < content.steps.length - 1 && <div className="step-connector"></div>}
                    </div>
                ))}
            </div>

            {/* Model Info */}
            {content.model_info && (
                <div className="model-info glass-card">
                    <h3>🧠 Model Architecture</h3>
                    <div className="model-info-grid">
                        {Object.entries(content.model_info).map(([key, value]) => (
                            <div key={key} className="model-info-item">
                                <span className="info-label">{key.replace(/_/g, ' ')}</span>
                                <span className="info-value">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tech Stack */}
            <div className="tech-stack glass-card">
                <h3>🛠️ Technology Stack</h3>
                <div className="tech-tags">
                    {['PyTorch', 'Librosa', 'Mel Spectrogram', 'CNN', 'GRU', 'Flask', 'React', 'ASVspoof 2019'].map((tech) => (
                        <span key={tech} className="tech-tag">{tech}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
