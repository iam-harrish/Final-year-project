import librosa
import numpy as np
import torch
import os
from moviepy import VideoFileClip
import sys

# Mocking model definitions for diagnostic script if needed, or just import from model.py
sys.path.append(os.path.join(os.getcwd(), "backend"))
from model import preprocess_audio, extract_spectral, extract_temporal

def analyze_audio(filepath, label):
    print(f"\n--- Analyzing {label}: {filepath} ---")
    y, sr = librosa.load(filepath, sr=16000)
    print(f"Sample Rate: {sr}")
    print(f"Duration: {len(y)/sr:.2f}s")
    print(f"Max Amplitude: {np.max(np.abs(y)):.4f}")
    print(f"Mean Amplitude: {np.mean(y):.4f}")
    print(f"RMS Energy: {np.sqrt(np.mean(y**2)):.4f}")
    
    # Check for silence or clipping
    silence_threshold = 1e-4
    silence_ratio = np.mean(np.abs(y) < silence_threshold)
    print(f"Silence Ratio: {silence_ratio:.2f}")
    
    # Preprocess as model would
    y_proc, sr_proc = preprocess_audio(filepath)
    print(f"Preprocessed Max: {np.max(np.abs(y_proc)):.4f}")
    
    return y_proc

if __name__ == "__main__":
    # Test with a real audio file if available
    real_audio = r"c:\Users\HARRISH\Final-year-project\real\real1.flac"
    if os.path.exists(real_audio):
        analyze_audio(real_audio, "Original Audio")
    else:
        print("Real audio sample not found.")
