import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!username.trim()) return setError('Username is required.');
        if (!isLogin && !email.trim()) return setError('Email is required.');
        if (!password) return setError('Password is required.');
        if (!isLogin && password !== confirmPassword)
            return setError('Passwords do not match.');
        if (!isLogin && password.length < 6)
            return setError('Password must be at least 6 characters.');

        setLoading(true);
        try {
            let res;
            if (isLogin) {
                res = await authAPI.login(username, password);
            } else {
                res = await authAPI.register(username, email, password);
            }
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard');
        } catch (err) {
            const msg =
                err.response?.data?.error || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="login-page">
            <div className="login-bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <div className="login-container animate-fade-in-up">
                <div className="login-header">
                    <div className="login-logo">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                            <circle cx="20" cy="20" r="18" stroke="url(#grad)" strokeWidth="2.5" fill="none" />
                            <path d="M12 20 C12 14, 16 10, 20 10 C24 10, 28 14, 28 20 C28 26, 24 30, 20 30" stroke="url(#grad)" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <path d="M15 20 C15 16, 17 13, 20 13 C23 13, 25 16, 25 20" stroke="url(#grad)" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <circle cx="20" cy="20" r="2" fill="url(#grad)" />
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1>Deepfake Audio Detection</h1>
                    <p>AI-powered audio authenticity verification</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>

                    {error && (
                        <div className="error-message">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="input-field"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                        />
                    </div>

                    {!isLogin && (
                        <div className="form-group animate-fade-in">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className="input-field"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                        />
                    </div>

                    {!isLogin && (
                        <div className="form-group animate-fade-in">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="input-field"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    <button type="submit" className="btn-primary login-btn" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                            </>
                        ) : (
                            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                        )}
                    </button>

                    <p className="switch-mode">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button type="button" onClick={switchMode}>
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
