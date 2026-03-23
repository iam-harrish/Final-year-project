import torch
import librosa
import numpy as np
import os
import sys
from moviepy import AudioFileClip, VideoFileClip

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))
from model import load_model, preprocess_audio, extract_spectral, extract_temporal, predict

def simulate_extraction(input_audio_path, output_wav_path):
    """Simulate what happens when we extract audio using moviepy."""
    # We use AudioFileClip to simulate extraction if we don't have a video
    # But we can also create a dummy video if needed.
    # For now, let's just use AudioFileClip and write_audiofile with fps=16000
    clip = AudioFileClip(input_audio_path)
    clip.write_audiofile(output_wav_path, fps=16000, logger=None)
    clip.close()

def run_diagnostic():
    MODEL_PATH = "hybrid_efficientnet_gru_prefinal.pth"
    if not os.path.exists(MODEL_PATH):
        MODEL_PATH = "backend/hybrid_efficientnet_gru.pth"
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, _ = load_model(MODEL_PATH)
    
    # Test file
    test_file = r"c:\Users\HARRISH\Final-year-project\fake\fake1.flac"
    if not os.path.exists(test_file):
        test_file = r"c:\Users\HARRISH\Final-year-project\fake\fake10.flac"
    
    if not os.path.exists(test_file):
        print(f"Test file {test_file} not found.")
        return

    print(f"--- Testing {test_file} ---")
    
    # 1. Direct Load
    y_direct, sr_direct = preprocess_audio(test_file)
    spec_direct = extract_spectral(y_direct, sr_direct)
    temp_direct = extract_temporal(y_direct)
    res_direct = predict(model, device, spec_direct, temp_direct)
    print(f"Direct Prediction: {res_direct['label']} (Confidence: {res_direct['confidence']}%)")

    # 2. MoviePy Round-trip
    temp_roundtrip = "temp_roundtrip.wav"
    simulate_extraction(test_file, temp_roundtrip)
    
    y_rt, sr_rt = preprocess_audio(temp_roundtrip)
    spec_rt = extract_spectral(y_rt, sr_rt)
    temp_rt = extract_temporal(y_rt)
    res_rt = predict(model, device, spec_rt, temp_rt)
    print(f"Round-trip Prediction: {res_rt['label']} (Confidence: {res_rt['confidence']}%)")
    print(f"Round-trip Full Result: {res_rt}")

    # 3. Silence Pad (+2s silence at start)
    print("\n--- Testing with 2s silence at start ---")
    y_padded = np.pad(y_direct, (2 * 16000, 0)) # Add 2s silence
    if len(y_padded) > 4 * 16000:
        y_padded = y_padded[:4 * 16000] # Trim to 4s as preprocess_audio would
    
    # We need to normalize as preprocess_audio does
    import librosa.util
    y_padded = librosa.util.normalize(y_padded)
    
    spec_pad = extract_spectral(y_padded, 16000)
    temp_pad = extract_temporal(y_padded)
    res_pad = predict(model, device, spec_pad, temp_pad)
    print(f"Padded Prediction: {res_pad['label']} (Confidence: {res_pad['confidence']}%)")
    print(f"Padded Full Result: {res_pad}")
    
    # Cleanup
    if os.path.exists(temp_roundtrip):
        os.remove(temp_roundtrip)

if __name__ == "__main__":
    run_diagnostic()
