"""
Deepfake Audio Detection System — Flask API Backend
Provides authentication, audio/video upload & prediction, and model metrics.
"""
import os
import json
import uuid
import hashlib
import sqlite3
from datetime import timedelta
from functools import wraps

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from werkzeug.utils import secure_filename

from model import (
    load_model, preprocess_audio, extract_spectral, extract_temporal, predict,
    is_allowed_file, is_video_file, extract_audio_from_video,
    ALLOWED_EXTENSIONS
)

# =========================
# App Configuration
# =========================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'deepfake-audio-detection-secret-key-2024'
app.config['JWT_SECRET_KEY'] = 'jwt-deepfake-audio-secret-2024'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app, resources={r"/api/*": {"origins": "*"}})
jwt = JWTManager(app)

# =========================
# Database Setup (SQLite)
# =========================
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.db')


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            label TEXT NOT NULL,
            confidence REAL NOT NULL,
            real_probability REAL NOT NULL,
            fake_probability REAL NOT NULL,
            raw_score REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    db.commit()
    db.close()


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


# =========================
# Load Model on Startup
# =========================
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hybrid_spoof_model.pth')
model, device = load_model(MODEL_PATH)
print(f"Hybrid FusionModel loaded successfully on {device}")

# =========================
# Load Metrics
# =========================
METRICS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'metrics.json')


def get_metrics():
    if not os.path.exists(METRICS_PATH):
        # Generate metrics if not present
        from generate_metrics import generate_metrics
        generate_metrics()
    with open(METRICS_PATH, 'r') as f:
        return json.load(f)


# =========================
# Error Handlers
# =========================
@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum size is 50MB."}), 413


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error."}), 500


# =========================
# Auth Routes
# =========================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Request body is required."}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validation
    if not username:
        return jsonify({"error": "Username is required."}), 400
    if not email:
        return jsonify({"error": "Email is required."}), 400
    if not password:
        return jsonify({"error": "Password is required."}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if '@' not in email or '.' not in email:
        return jsonify({"error": "Invalid email address."}), 400
    
    db = get_db()
    
    # Check if user exists
    existing = db.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        (username, email)
    ).fetchone()
    
    if existing:
        return jsonify({"error": "Username or email already exists."}), 409
    
    user_id = str(uuid.uuid4())
    try:
        db.execute(
            'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
            (user_id, username, email, hash_password(password))
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists."}), 409
    
    access_token = create_access_token(
        identity=user_id,
        additional_claims={"username": username}
    )
    
    return jsonify({
        "message": "Registration successful.",
        "token": access_token,
        "user": {"id": user_id, "username": username, "email": email}
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Request body is required."}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username:
        return jsonify({"error": "Username is required."}), 400
    if not password:
        return jsonify({"error": "Password is required."}), 400
    
    db = get_db()
    user = db.execute(
        'SELECT * FROM users WHERE username = ?', (username,)
    ).fetchone()
    
    if not user or user['password_hash'] != hash_password(password):
        return jsonify({"error": "Invalid username or password."}), 401
    
    access_token = create_access_token(
        identity=user['id'],
        additional_claims={"username": user['username']}
    )
    
    return jsonify({
        "message": "Login successful.",
        "token": access_token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email']
        }
    }), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "id": user_id,
        "username": claims.get("username", "")
    }), 200


# =========================
# Prediction Route
# =========================
@app.route('/api/predict', methods=['POST'])
@jwt_required()
def predict_audio():
    user_id = get_jwt_identity()
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded. Please select an audio or video file."}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400
    
    if not file.filename:
        return jsonify({"error": "Invalid filename."}), 400
    
    # Check file extension
    if not is_allowed_file(file.filename):
        allowed = ', '.join(sorted(ALLOWED_EXTENSIONS))
        return jsonify({
            "error": f"Unsupported file format. Allowed formats: {allowed}"
        }), 400
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    
    temp_audio_path = None
    
    try:
        file.save(filepath)
        
        # Check file size (shouldn't be 0)
        if os.path.getsize(filepath) == 0:
            return jsonify({"error": "Uploaded file is empty."}), 400
        
        # If video, extract audio first
        audio_path = filepath
        if is_video_file(filename):
            temp_audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{uuid.uuid4()}.wav")
            audio_path = extract_audio_from_video(filepath, temp_audio_path)
        
        # Preprocess audio and extract dual-branch features
        y, sr = preprocess_audio(audio_path)
        spectral_features = extract_spectral(y, sr)
        temporal_features = extract_temporal(y)
        
        # Get prediction from hybrid model
        result = predict(model, device, spectral_features, temporal_features)
        result['filename'] = filename
        
        # Save prediction to database
        db = get_db()
        pred_id = str(uuid.uuid4())
        db.execute(
            '''INSERT INTO predictions 
            (id, user_id, filename, label, confidence, real_probability, fake_probability, raw_score) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (pred_id, user_id, filename, result['label'], result['confidence'],
             result['real_probability'], result['fake_probability'], result['raw_score'])
        )
        db.commit()
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"An error occurred during prediction: {str(e)}"}), 500
    finally:
        # Clean up uploaded and temp files
        if os.path.exists(filepath):
            os.remove(filepath)
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


# =========================
# History Route
# =========================
@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    db = get_db()
    
    predictions = db.execute(
        'SELECT * FROM predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        (user_id,)
    ).fetchall()
    
    return jsonify({
        "predictions": [
            {
                "id": p['id'],
                "filename": p['filename'],
                "label": p['label'],
                "confidence": p['confidence'],
                "real_probability": p['real_probability'],
                "fake_probability": p['fake_probability'],
                "created_at": p['created_at']
            }
            for p in predictions
        ]
    }), 200


# =========================
# Metrics Route
# =========================
@app.route('/api/metrics', methods=['GET'])
def get_model_metrics():
    try:
        metrics = get_metrics()
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": f"Failed to load metrics: {str(e)}"}), 500


# =========================
# How It Works Route
# =========================
@app.route('/api/how-it-works', methods=['GET'])
def how_it_works():
    content = {
        "title": "How Deepfake Audio Detection Works",
        "steps": [
            {
                "step": 1,
                "title": "Upload Audio or Video",
                "description": "Upload an audio file (.wav, .flac, .mp3) or video file (.mp4, .mkv, .avi). For video files, the audio track is automatically extracted for analysis.",
                "icon": "upload"
            },
            {
                "step": 2,
                "title": "Dual Feature Extraction",
                "description": "The audio is processed through two parallel pipelines: (1) A 128×128 mel-spectrogram captures frequency patterns over time, and (2) raw audio is framed into 400-sample windows to preserve temporal dynamics.",
                "icon": "waveform"
            },
            {
                "step": 3,
                "title": "Hybrid Neural Network Analysis",
                "description": "The spectral features are analyzed by a Convolutional Neural Network (CNN) to detect frequency anomalies, while the temporal features are processed by a Gated Recurrent Unit (GRU) to capture sequential audio patterns. Both outputs are fused for a comprehensive analysis.",
                "icon": "brain"
            },
            {
                "step": 4,
                "title": "Classification Result",
                "description": "The fused features pass through a classifier that outputs a confidence score. A probability above 50% indicates AI-generated (spoofed) audio; below 50% indicates real (bonafide) speech.",
                "icon": "result"
            }
        ],
        "model_info": {
            "architecture": "Hybrid CNN + GRU Fusion Model",
            "spectral_branch": "SpectralCNN — Conv2d(1→16→32) + FC → 64-dim",
            "temporal_branch": "TemporalGRU — GRU(400→128) + FC → 64-dim",
            "fusion": "Concatenation (128-dim) → Linear(128→64→1)",
            "activation": "ReLU + Sigmoid",
            "training_data": "ASVspoof 2019 LA Dataset",
            "sample_rate": "16kHz",
            "accuracy": "91.52%"
        }
    }
    return jsonify(content), 200


# =========================
# Health Check
# =========================
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": True}), 200


# =========================
# Run
# =========================
if __name__ == '__main__':
    init_db()
    # Generate metrics if not exists
    if not os.path.exists(METRICS_PATH):
        from generate_metrics import generate_metrics
        generate_metrics()
    
    print("Starting Deepfake Audio Detection API...")
    print("Endpoints:")
    print("  POST /api/auth/register")
    print("  POST /api/auth/login")
    print("  GET  /api/auth/me")
    print("  POST /api/predict")
    print("  GET  /api/history")
    print("  GET  /api/metrics")
    print("  GET  /api/how-it-works")
    print("  GET  /api/health")
    app.run(debug=True, host='0.0.0.0', port=5000)
