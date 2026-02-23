import './DetectionResult.css';

export default function DetectionResult({ result, onUploadAnother }) {
    const isFake = result.label === 'FAKE';

    return (
        <div className="detection-result animate-fade-in-up">
            <div className="result-header">
                <p className="result-filename">{result.filename}</p>
            </div>

            {/* Main Result Card */}
            <div className={`result-card ${isFake ? 'result-fake' : 'result-real'}`}>
                <div className="result-badge-container">
                    <div className={`result-pulse ${isFake ? 'pulse-fake' : 'pulse-real'}`}></div>
                    <div className={`result-label-badge ${isFake ? 'badge-fake' : 'badge-real'}`}>
                        {result.label}
                    </div>
                </div>
                <span className="result-confidence">
                    Confidence: {result.confidence}%
                </span>
            </div>

            {/* Probability Bars */}
            <div className="prob-bars">
                <div className="prob-item">
                    <div className="prob-header">
                        <span className="prob-label-text real-label">REAL</span>
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
                        <span className="prob-label-text fake-label">FAKE</span>
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
                        <span className="detail-value">40 MFCCs</span>
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
