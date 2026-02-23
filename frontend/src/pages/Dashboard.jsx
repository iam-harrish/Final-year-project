import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioUpload from '../components/AudioUpload';
import DetectionResult from '../components/DetectionResult';
import ModelAccuracy from '../components/ModelAccuracy';
import HowItWorks from '../components/HowItWorks';
import History from '../components/History';
import './Dashboard.css';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('upload');
    const [result, setResult] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handlePrediction = (predResult) => {
        setResult(predResult);
    };

    const handleUploadAnother = () => {
        setResult(null);
    };

    const tabs = [
        { id: 'upload', label: 'Detect Audio', icon: '🎙️' },
        { id: 'how-it-works', label: 'How It Works', icon: '⚙️' },
        { id: 'accuracy', label: 'Model Accuracy', icon: '📊' },
        { id: 'history', label: 'History', icon: '📋' },
    ];

    return (
        <div className="dashboard-page">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="header-logo">
                        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                            <circle cx="20" cy="20" r="18" stroke="url(#hgrad)" strokeWidth="2.5" fill="none" />
                            <path d="M12 20 C12 14, 16 10, 20 10 C24 10, 28 14, 28 20 C28 26, 24 30, 20 30" stroke="url(#hgrad)" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <circle cx="20" cy="20" r="2" fill="url(#hgrad)" />
                            <defs>
                                <linearGradient id="hgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="header-title">Deepfake Audio Detection</h1>
                </div>
                <div className="header-right">
                    <span className="header-user">
                        <span className="user-avatar">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                        {user?.username || 'User'}
                    </span>
                    <button onClick={handleLogout} className="btn-logout">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6 1a1 1 0 00-1 1v1.5a.5.5 0 01-1 0V2a2 2 0 012-2h7a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.5a.5.5 0 011 0V14a1 1 0 001 1h7a1 1 0 001-1V2a1 1 0 00-1-1H6z" />
                            <path d="M1.146 7.646a.5.5 0 010 .708l2.5 2.5a.5.5 0 00.708-.708L2.707 8.5H10.5a.5.5 0 000-1H2.707l1.647-1.646a.5.5 0 10-.708-.708l-2.5 2.5z" />
                        </svg>
                        Logout
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="tab-nav">
                <div className="tab-nav-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab.id); if (tab.id === 'upload') setResult(null); }}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Content */}
            <main className="dashboard-content">
                <div className="content-wrapper">
                    {activeTab === 'upload' && (
                        result ? (
                            <DetectionResult result={result} onUploadAnother={handleUploadAnother} />
                        ) : (
                            <AudioUpload onPrediction={handlePrediction} />
                        )
                    )}
                    {activeTab === 'how-it-works' && <HowItWorks />}
                    {activeTab === 'accuracy' && <ModelAccuracy />}
                    {activeTab === 'history' && <History />}
                </div>
            </main>
        </div>
    );
}
