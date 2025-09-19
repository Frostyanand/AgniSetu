import os
import cv2
import torch
import shutil
import uuid
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from ultralytics import YOLO

# ------------------------------
# Setup
# ------------------------------
# Create a temporary directory to store uploaded videos
TEMP_DIR = "temp_videos"
os.makedirs(TEMP_DIR, exist_ok=True)

# Model setup
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[INFO] Using device: {device}")
try:
    model = YOLO("best.pt").to(device)
    class_names = model.names
    print("[INFO] YOLO model loaded successfully.")
except Exception as e:
    print(f"[ERROR] Failed to load model: {e}")
    # Exit or handle the error appropriately if the model is critical
    exit()

# FastAPI app setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Be more specific in production, e.g., ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Core Inference Logic
# ------------------------------
def infer_and_draw(frame):
    """Runs YOLO inference and draws bounding boxes on the frame."""
    results = model(frame, imgsz=640, verbose=False)
    
    # Example of how you might collect detections, can be expanded
    detections = [] 

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            name = class_names[cls]
            
            # Draw rectangle and label
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            label = f"{name} {conf:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

            # Here you could add logic for triggering alerts if needed
            # if name in ["fire", "smoke"] and conf > 0.75:
            #     detections.append({"class": name, "confidence": conf})

    return frame

# ------------------------------
# Video Processing Generator
# ------------------------------
def process_video_stream(video_source):
    """
    Opens a video source, processes each frame, and yields it as JPEG bytes.
    'video_source' can be a file path or a camera index (e.g., 0).
    """
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video source: {video_source}")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[INFO] End of video stream.")
                break
            
            # Run inference
            processed_frame = infer_and_draw(frame)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode(".jpg", processed_frame)
            if not ret:
                print("[WARN] Failed to encode frame.")
                continue
                
            frame_bytes = buffer.tobytes()
            # Yield the frame in the format required for multipart/x-mixed-replace
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()
        print(f"[INFO] Released video source: {video_source}")


# ------------------------------
# API Endpoints
# ------------------------------
@app.post("/upload_video")
async def upload_video(video: UploadFile = File(...)):
    """
    Accepts a video file, saves it locally, and returns the filename
    for streaming.
    """
    # Generate a unique filename to avoid conflicts
    unique_filename = f"{uuid.uuid4()}_{video.filename}"
    file_path = os.path.join(TEMP_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        return JSONResponse(content={"filename": unique_filename})
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to save file: {e}"}, status_code=500)

@app.get("/video_feed/{video_name}")
def video_feed(video_name: str):
    """Streams a processed video file from the temporary directory."""
    video_path = os.path.join(TEMP_DIR, video_name)
    if not os.path.exists(video_path):
        return JSONResponse(content={"error": "Video not found"}, status_code=404)
        
    return StreamingResponse(process_video_stream(video_path), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/webcam_feed")
def webcam_feed():
    """Streams processed video from the primary webcam (index 0)."""
    return StreamingResponse(process_video_stream(0), media_type="multipart/x-mixed-replace; boundary=frame")