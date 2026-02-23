import { useState, useRef, useCallback } from 'react';
import { predictionAPI } from '../services/api';
import './AudioUpload.css';

const ALLOWED_AUDIO = ['.wav', '.flac', '.mp3', '.ogg', '.m4a', '.aac', '.wma'];
const ALLOWED_VIDEO = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv'];
const ALLOWED_ALL = [...ALLOWED_AUDIO, ...ALLOWED_VIDEO];
const MAX_SIZE_MB = 50;

export default function AudioUpload({ onPrediction }) {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const validateFile = useCallback((f) => {
        if (!f) return 'Please select a file.';
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        if (!ALLOWED_ALL.includes(ext)) {
            return `Unsupported format "${ext}". Allowed: ${ALLOWED_ALL.join(', ')}`;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
            return `File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_SIZE_MB}MB.`;
        }
        if (f.size === 0) {
            return 'File is empty.';
        }
        return null;
    }, []);

    const handleFile = useCallback((f) => {
        setError('');
        const validationError = validateFile(f);
        if (validationError) {
            setError(validationError);
            return;
        }
        setFile(f);
    }, [validateFile]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDetect = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setLoading(true);
        setError('');
        setProgress(0);

        // Simulated progress for UX
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + Math.random() * 15;
            });
        }, 300);

        try {
            const res = await predictionAPI.predict(file);
            clearInterval(progressInterval);
            setProgress(100);

            setTimeout(() => {
                onPrediction(res.data);
            }, 300);
        } catch (err) {
            clearInterval(progressInterval);
            setProgress(0);
            const msg = err.response?.data?.error || 'Failed to analyze file. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = () => {
        if (!file) return null;
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (ALLOWED_VIDEO.includes(ext)) return '🎬';
        return '🎵';
    };

    const getFileType = () => {
        if (!file) return '';
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (ALLOWED_VIDEO.includes(ext)) return 'Video';
        return 'Audio';
    };

    return (
        <div className="audio-upload animate-fade-in-up">
            <div className="upload-header">
                <h2>Detect Deepfake Audio</h2>
                <p>Upload an audio or video file to analyze its authenticity</p>
            </div>

            {/* Drop Zone */}
            <div
                className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !loading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_ALL.join(',')}
                    onChange={(e) => handleFile(e.target.files[0])}
                    hidden
                />

                {file ? (
                    <div className="file-info">
                        <span className="file-icon-large">{getFileIcon()}</span>
                        <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-meta">
                                {getFileType()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                        </div>
                        <button
                            className="file-change"
                            onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                        >
                            Change
                        </button>
                    </div>
                ) : (
                    <div className="drop-content">
                        <div className="drop-icon">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <path d="M24 4L24 32M24 4L16 12M24 4L32 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 28V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p className="drop-text">
                            Drag & drop your file here, or <span>browse</span>
                        </p>
                        <p className="drop-hint">
                            Supports audio ({ALLOWED_AUDIO.join(', ')}) and video ({ALLOWED_VIDEO.join(', ')})
                        </p>
                        <p className="drop-limit">Max file size: {MAX_SIZE_MB}MB</p>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {loading && (
                <div className="progress-container animate-fade-in">
                    <div className="progress-label">
                        <span>Analyzing {getFileType().toLowerCase()}...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="progress-step">
                        {progress < 30 ? 'Extracting audio features...' :
                            progress < 60 ? 'Computing MFCC coefficients...' :
                                progress < 90 ? 'Running neural network analysis...' :
                                    'Finalizing results...'}
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="error-message">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Detect Button */}
            <button
                className="btn-primary detect-btn"
                onClick={handleDetect}
                disabled={!file || loading}
            >
                {loading ? (
                    <>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2.5 }}></div>
                        Analyzing...
                    </>
                ) : (
                    <>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                        </svg>
                        Detect
                    </>
                )}
            </button>
        </div>
    );
}
