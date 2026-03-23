"""
Hybrid Deepfake Audio Detection Model — EfficientNet-B0 + GRU Fusion
Matches the architecture from train_improved.py for loading hybrid_efficientnet_gru.pth
"""
import torch
import torch.nn as nn
import librosa
import numpy as np
import os
from torchvision import models
from moviepy import VideoFileClip

IMG_SIZE = 224


# =========================
# Model Architecture
# =========================
class SpectralEfficientNet(nn.Module):
    """EfficientNet-B0 branch for mel-spectrogram (spectral) features."""
    def __init__(self):
        super().__init__()
        self.backbone = models.efficientnet_b0(weights="IMAGENET1K_V1")
        self.backbone.classifier = nn.Identity()
        self.fc = nn.Linear(1280, 64)

    def forward(self, x):
        x = self.backbone(x)
        return self.fc(x)


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
    """Hybrid model fusing SpectralEfficientNet and TemporalGRU branches.

    Architecture:
        - SpectralEfficientNet: EfficientNet-B0 + FC → 64-dim
        - TemporalGRU: GRU(400→128) + FC → 64-dim
        - Fusion: Concat(64+64=128) → Linear(128→64) → ReLU → Linear(64→1)

    Output: Single logit (apply sigmoid for probability)
        - probability > 0.5 → AI-generated (spoof)
        - probability ≤ 0.5 → REAL (bonafide)
    """
    def __init__(self):
        super().__init__()
        self.spectral = SpectralEfficientNet()
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
    """Load audio, resample to 16 kHz, and normalize.
    Does NOT trim to 4s here anymore to allow sliding window.

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

        y = librosa.util.normalize(y)
        return y, sr
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to preprocess audio: {str(e)}")


def get_audio_chunks(y, sr, duration=4, overlap=2):
    """Split audio into overlapping chunks.
    
    Args:
        y: Audio waveform
        sr: Sample rate
        duration: Duration of each chunk in seconds
        overlap: Overlap between chunks in seconds
        
    Returns:
        List of chunks, each being a numpy array
    """
    chunk_size = duration * sr
    hop_size = (duration - overlap) * sr
    
    if len(y) <= chunk_size:
        # Pad to chunk_size if shorter
        padded = np.pad(y, (0, max(0, chunk_size - len(y))))
        return [padded]
    
    chunks = []
    for i in range(0, len(y) - chunk_size + 1, hop_size):
        chunks.append(y[i:i + chunk_size])
    
    # If there's a significant remainder, pad and add the last chunk
    if len(y) % hop_size != 0 and (len(y) - chunks[-1].size) > sr * 0.5:
        last_chunk = y[-chunk_size:]
        chunks.append(last_chunk)
        
    return chunks


def extract_spectral(y, sr):
    """Extract normalized mel-spectrogram features (3×224×224).

    Args:
        y: Audio waveform array (4s at 16kHz)
        sr: Sample rate

    Returns:
        torch.Tensor of shape (3, 224, 224) — 3-channel mel spectrogram for EfficientNet
    """
    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    mel_db = librosa.power_to_db(mel)

    # Min-max normalize
    mel_db = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-6)

    mel_db = torch.tensor(mel_db).unsqueeze(0)  # (1, 128, T)

    # Resize to IMG_SIZE x IMG_SIZE
    mel_db = torch.nn.functional.interpolate(
        mel_db.unsqueeze(0),
        size=(IMG_SIZE, IMG_SIZE),
        mode="bilinear",
        align_corners=False
    ).squeeze(0)  # (1, 224, 224)

    # Repeat to 3 channels for EfficientNet
    mel_db = mel_db.repeat(3, 1, 1)  # (3, 224, 224)

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
    """Run prediction on a single 4s chunk."""
    spectral = spectral_features.unsqueeze(0).to(device)
    temporal = temporal_features.unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(spectral, temporal)
        probability = torch.sigmoid(output).item()

    return probability


def predict_robust(model, device, y, sr):
    """Run prediction on multiple chunks and aggregate results.
    
    Returns the maximum fake probability found across all chunks
    to ensure we catch deepfakes even if they only appear in part of the audio.
    """
    chunks = get_audio_chunks(y, sr)
    probabilities = []
    
    for chunk in chunks:
        spec = extract_spectral(chunk, sr)
        temp = extract_temporal(chunk)
        prob = predict(model, device, spec, temp)
        probabilities.append(prob)
    
    # Aggregate: Use max probability for deepfake detection
    max_prob = max(probabilities)
    
    # probability > 0.5 → FAKE (AI-generated/spoof), else → REAL (bonafide)
    is_fake = max_prob > 0.5

    if is_fake:
        label = "FAKE"
        confidence = max_prob * 100
    else:
        label = "REAL"
        confidence = (1 - max_prob) * 100

    return {
        "label": label,
        "confidence": round(confidence, 2),
        "real_probability": round((1 - max_prob) * 100, 2),
        "fake_probability": round(max_prob * 100, 2),
        "raw_score": round(max_prob, 6),
        "num_chunks": len(chunks)
    }
