import torch
import librosa
import numpy as np
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))
from model import load_model, preprocess_audio, predict_robust

def run_verification():
    MODEL_PATH = "backend/hybrid_efficientnet_gru.pth"
    if not os.path.exists(MODEL_PATH):
        print(f"Model path {MODEL_PATH} not found.")
        return
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, _ = load_model(MODEL_PATH)
    
    # Use a confirmed 'FAKE' test file
    test_file = r"c:\Users\HARRISH\Final-year-project\fake\fake1.flac"
    if not os.path.exists(test_file):
        test_file = r"c:\Users\HARRISH\Final-year-project\fake\fake10.flac"
    
    if not os.path.exists(test_file):
        print(f"Test file {test_file} not found.")
        return

    print(f"--- Verifying Fix with {test_file} ---")
    
    # 1. Load the fake audio
    y, sr = librosa.load(test_file, sr=16000)
    
    # 2. Simulate a video with leading silence (5 seconds)
    # This would have failed with the old logic because it only checked the first 4s.
    print("Simulating 5 seconds of leading silence...")
    y_padded = np.pad(y, (5 * 16000, 0))
    y_padded = librosa.util.normalize(y_padded)
    
    # 3. Predict using the new robust method
    result = predict_robust(model, device, y_padded, 16000)
    
    print(f"Result: {result['label']}")
    print(f"Confidence: {result['confidence']}%")
    print(f"Chunks analyzed: {result['num_chunks']}")
    
    if result['label'] == "FAKE":
        print("\nSUCCESS: Deepfake detected correctly despite leading silence!")
    else:
        print("\nFAILURE: Deepfake not detected.")

if __name__ == "__main__":
    run_verification()
