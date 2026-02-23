"""
Hybrid Deepfake Audio Detection Model — SpectralCNN + TemporalGRU Fusion
Matches the architecture from detection.ipynb for loading hybrid_spoof_model.pth
"""
import torch
import torch.nn as nn
import librosa
import numpy as np
import os
from moviepy import VideoFileClip


# =========================
# Model Architecture
# =========================
class SpectralCNN(nn.Module):
    """CNN branch for mel-spectrogram (spectral) features."""
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.fc = nn.Linear(32 * 32 * 32, 64)

    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        return x


class TemporalGRU(nn.Module):
    """GRU branch for raw temporal audio frame features."""
    def __init__(self):
        super().__init__()
        self.gru = nn.GRU(input_size=400, hidden_size=128, batch_first=True)
        self.fc = nn.Linear(128, 64)

    def forward(self, x):
        _, h = self.gru(x)
        x = self.fc(h[-1])
        return x


class FusionModel(nn.Module):
    """Hybrid model fusing SpectralCNN and TemporalGRU branches.

    Architecture:
        - SpectralCNN: Conv2d(1→16→32) + FC → 64-dim
        - TemporalGRU: GRU(400→128) + FC → 64-dim
        - Fusion: Concat(64+64=128) → Linear(128→64) → ReLU → Linear(64→1)

    Output: Single logit (apply sigmoid for probability)
        - probability > 0.5 → AI-generated (spoof)
        - probability ≤ 0.5 → REAL (bonafide)
    """
    def __init__(self):
        super().__init__()
        self.spectral = SpectralCNN()
        self.temporal = TemporalGRU()
        self.classifier = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )

    def forward(self, spec, temp):
        f1 = self.spectral(spec)
        f2 = self.temporal(temp)
        fused = torch.cat((f1, f2), dim=1)
        out = self.classifier(fused)
        return out.squeeze()


# =========================
# Supported File Extensions
# =========================
AUDIO_EXTENSIONS = {'.wav', '.flac', '.mp3', '.ogg', '.m4a', '.aac', '.wma'}
VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv'}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS


def is_allowed_file(filename):
    """Check if the file extension is supported."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def is_video_file(filename):
    """Check if the file is a video file."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in VIDEO_EXTENSIONS


# =========================
# Audio / Video Processing
# =========================
def extract_audio_from_video(video_path, output_path="temp_audio.wav"):
    """Extract audio track from a video file."""
    try:
        clip = VideoFileClip(video_path)
        if clip.audio is None:
            clip.close()
            raise ValueError("Video file contains no audio track")
        clip.audio.write_audiofile(output_path, fps=16000, logger=None)
        clip.close()
        return output_path
    except Exception as e:
        raise ValueError(f"Failed to extract audio from video: {str(e)}")


def preprocess_audio(filepath):
    """Load audio, resample to 16 kHz, pad/trim to 4 seconds, and normalize.

    Args:
        filepath: Path to audio file

    Returns:
        Tuple of (audio_array, sample_rate)
    """
    try:
        y, sr = librosa.load(filepath, sr=16000)

        if len(y) == 0:
            raise ValueError("Audio file is empty or contains no data")

        # Minimum audio length check (at least 0.1 seconds)
        if len(y) < sr * 0.1:
            raise ValueError("Audio file is too short (minimum 0.1 seconds required)")

        # Pad or trim to exactly 4 seconds
        max_len = 4 * 16000
        if len(y) > max_len:
            y = y[:max_len]
        else:
            y = np.pad(y, (0, max_len - len(y)))

        y = librosa.util.normalize(y)
        return y, sr
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to preprocess audio: {str(e)}")


def extract_spectral(y, sr):
    """Extract normalized mel-spectrogram features (128×128).

    Args:
        y: Audio waveform array (4s at 16kHz)
        sr: Sample rate

    Returns:
        torch.Tensor of shape (1, 128, 128) — single-channel mel spectrogram
    """
    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    mel_db = librosa.power_to_db(mel)

    # Min-max normalize
    mel_db = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-6)

    # Ensure exactly 128 time frames
    mel_db = mel_db[:, :128]
    if mel_db.shape[1] < 128:
        mel_db = np.pad(mel_db, ((0, 0), (0, 128 - mel_db.shape[1])))

    mel_db = torch.tensor(mel_db).unsqueeze(0)
    return mel_db.float()


def extract_temporal(y):
    """Extract raw audio frames for temporal (GRU) branch.

    Args:
        y: Audio waveform array (4s at 16kHz)

    Returns:
        torch.Tensor of shape (num_frames, 400) — framed audio
    """
    frames = librosa.util.frame(y, frame_length=400, hop_length=160)
    frames = frames.T
    return torch.tensor(frames).float()


# =========================
# Model Loading & Prediction
# =========================
def load_model(model_path):
    """Load the pretrained hybrid FusionModel.

    Args:
        model_path: Path to hybrid_spoof_model.pth

    Returns:
        Tuple of (model, device)
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FusionModel().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model.eval()
    return model, device


def predict(model, device, spectral_features, temporal_features):
    """Run prediction on spectral + temporal features.

    Args:
        model: The loaded FusionModel
        device: torch device
        spectral_features: Tensor of shape (1, 128, 128) — mel spectrogram
        temporal_features: Tensor of shape (num_frames, 400) — audio frames

    Returns:
        dict with prediction results
    """
    spectral = spectral_features.unsqueeze(0).to(device)
    temporal = temporal_features.unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(spectral, temporal)
        probability = torch.sigmoid(output).item()

    # probability > 0.5 → FAKE (AI-generated/spoof), else → REAL (bonafide)
    is_fake = probability > 0.5

    if is_fake:
        label = "FAKE"
        confidence = probability * 100
        real_prob = (1 - probability) * 100
        fake_prob = probability * 100
    else:
        label = "REAL"
        confidence = (1 - probability) * 100
        real_prob = (1 - probability) * 100
        fake_prob = probability * 100

    return {
        "label": label,
        "confidence": round(confidence, 2),
        "real_probability": round(real_prob, 2),
        "fake_probability": round(fake_prob, 2),
        "raw_score": round(probability, 6)
    }
