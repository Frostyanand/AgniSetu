import os
import cv2
import torch
import numpy as np
import shutil
import uuid
import requests
import base64
import time
from typing import Dict
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from ultralytics import YOLO
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ------------------------------
# Setup
# ------------------------------
# Create a temporary directory to store uploaded videos
TEMP_DIR = "temp_videos"
os.makedirs(TEMP_DIR, exist_ok=True)

# Create a directory to store detection snapshots
SNAPSHOT_DIR = "saved_snapshots"
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

# Snapshot throttle configuration (per camera)
SNAPSHOT_THROTTLE_SECONDS = 5
_last_snapshot_epoch_by_camera: Dict[str, float] = {}

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
def infer_and_draw(frame, camera_id=None):
    """Runs YOLO inference and draws bounding boxes on the frame."""
    results = model(frame, imgsz=640, verbose=False)
    
    # Collect detections for alerting
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

            # Check for fire/smoke detection and trigger alert
            if name in ["fire", "smoke"] and conf > 0.75:
                detections.append({
                    "class": name, 
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2]
                })
                
                # Send alert to backend with camera ID
                if _should_send_snapshot(camera_id):
                    send_alert_to_backend(frame, name, conf, [x1, y1, x2, y2], camera_id)

    return frame

# ------------------------------
# Alert Functions
# ------------------------------
def send_alert_to_backend(frame, className, confidence, bbox, camera_id=None):
    """Send alert to Node.js backend with imageId instead of base64 data."""
    try:
        # Generate unique image ID
        image_id = f"{uuid.uuid4()}.jpg"
        
        # Define the full save path
        snapshot_path = os.path.join(SNAPSHOT_DIR, image_id)
        
        # Save the clean frame to local storage
        success = cv2.imwrite(snapshot_path, frame)
        if not success:
            print(f"[ERROR] Failed to save snapshot: {snapshot_path}")
            return
        
        # Use provided camera_id or fallback to environment variable
        camera_id = camera_id or os.getenv("DEFAULT_CAMERA_ID", "default_camera_id")
        
        # Prepare the payload with imageId instead of base64
        payload = {
            "serviceKey": os.getenv("SERVICE_KEY", "my_secret_service_key"),
            "cameraId": camera_id,
            "className": className,
            "confidence": confidence,
            "bbox": bbox,
            "imageId": image_id,  # New field instead of snapshotBase64
            "timestamp": None  # Will be set by backend
        }
        
        # Send to Node.js backend
        backend_url = os.getenv("NEXTJS_API_URL", "http://localhost:3000/api/alerts/trigger")
        headers = {
            "x-service-key": os.getenv("SERVICE_KEY", "my_secret_service_key"),
            "Content-Type": "application/json"
        }
        
        response = requests.post(backend_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print(f"[ALERT] Successfully sent alert for {className} detection")
        else:
            print(f"[ALERT] Failed to send alert: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"[ALERT] Error sending alert: {e}")

def _should_send_snapshot(camera_id: str | None) -> bool:
    """Return True if enough time has elapsed since the last snapshot for this camera.
    Updates the last snapshot timestamp when returning True.
    """
    safe_camera_id = camera_id or os.getenv("DEFAULT_CAMERA_ID", "default_camera_id")
    now = time.time()
    last = _last_snapshot_epoch_by_camera.get(safe_camera_id, 0.0)
    if now - last >= SNAPSHOT_THROTTLE_SECONDS:
        _last_snapshot_epoch_by_camera[safe_camera_id] = now
        return True
    return False

# # ------------------------------
# # Core Inference Logic
# # ------------------------------
# def infer_and_draw(frame):
#     """Runs YOLO inference and draws bounding boxes on the frame for high-confidence detections."""
    
#     # Define a confidence threshold to filter out weak detections
#     CONFIDENCE_THRESHOLD = 0.6  # You can adjust this value as needed
    
#     results = model(frame, imgsz=640, verbose=False)
    
#     for r in results:
#         for box in r.boxes:
#             conf = float(box.conf[0])
#             cls = int(box.cls[0])
#             name = class_names[cls]
            
#             # Only draw if the confidence is above the threshold AND it's a "fire" or "smoke" detection
#             if conf > CONFIDENCE_THRESHOLD and name in ["fire", "smoke"]:
#                 x1, y1, x2, y2 = map(int, box.xyxy[0])
                
#                 # Draw the bounding box
#                 cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)  # Green box for detected fire/smoke
                
#                 # Draw the label with confidence score
#                 label = f"{name} {conf:.2f}"
#                 cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
#     return frame

# ------------------------------
# Video Processing Generator
# ------------------------------
def process_video_stream(video_source, camera_id=None):
    """
    Opens a video source, processes each frame, and yields it as JPEG bytes.
    'video_source' can be a file path or a camera index (e.g., 0).
    'camera_id' is extracted from filename if not provided.
    """
    # Extract camera ID from filename if it's a file path and camera_id not provided
    if camera_id is None and isinstance(video_source, str) and os.path.isfile(video_source):
        filename = os.path.basename(video_source)
        if '_' in filename:
            camera_id = filename.split('_')[0]
            print(f"[INFO] Extracted camera ID from filename: {camera_id}")
    
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
            
            # Run inference with camera ID context
            processed_frame = infer_and_draw(frame, camera_id)
            
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
        # Ensure temporary uploaded files are removed after streaming completes
        try:
            if isinstance(video_source, str) and os.path.isfile(video_source):
                os.remove(video_source)
                print(f"[CLEANUP] Deleted temporary video file: {video_source}")
        except Exception as e:
            print(f"[CLEANUP] Failed to delete video file {video_source}: {e}")


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

@app.post("/upload_video/{camera_id}")
async def upload_video_for_camera(camera_id: str, video: UploadFile = File(...)):
    """
    Accepts a video file for a specific camera, saves it locally, and returns the filename
    for streaming. This endpoint associates the video with a specific camera ID.
    """
    # Generate a unique filename with camera ID prefix
    unique_filename = f"{camera_id}_{uuid.uuid4()}_{video.filename}"
    file_path = os.path.join(TEMP_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Store camera ID mapping for this video
        camera_video_mapping = {
            "filename": unique_filename,
            "camera_id": camera_id,
            "original_filename": video.filename,
            "uploaded_at": None  # Will be set by backend if needed
        }
        
        return JSONResponse(content=camera_video_mapping)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to save file: {e}"}, status_code=500)

@app.get("/video_feed/{video_name}")
def video_feed(video_name: str):
    """Streams a processed video file from the temporary directory."""
    video_path = os.path.join(TEMP_DIR, video_name)
    if not os.path.exists(video_path):
        return JSONResponse(content={"error": "Video not found"}, status_code=404)
    
    # Extract camera_id from filename if it starts with camera_id_
    camera_id = None
    if '_' in video_name:
        potential_camera_id = video_name.split('_')[0]
        # Basic validation: camera IDs are typically alphanumeric and reasonable length
        if potential_camera_id and len(potential_camera_id) < 100:
            camera_id = potential_camera_id
            print(f"[INFO] Extracted camera ID from filename: {camera_id}")
        
    return StreamingResponse(process_video_stream(video_path, camera_id=camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/video_feed/{camera_id}/{video_name}")
def video_feed_for_camera(camera_id: str, video_name: str):
    """Streams a processed video file for a specific camera."""
    video_path = os.path.join(TEMP_DIR, video_name)
    if not os.path.exists(video_path):
        return JSONResponse(content={"error": "Video not found"}, status_code=404)
    
    # Verify the video belongs to this camera (filename should start with camera_id)
    if not video_name.startswith(f"{camera_id}_"):
        return JSONResponse(content={"error": "Video does not belong to this camera"}, status_code=403)
        
    return StreamingResponse(process_video_stream(video_path, camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/webcam_feed")
def webcam_feed():
    """Streams processed video from the primary webcam (index 0)."""
    return StreamingResponse(process_video_stream(0), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/webcam_feed/{camera_id}")
def webcam_feed_for_camera(camera_id: str):
    """Streams processed video from the primary webcam (index 0) with a specific camera ID."""
    return StreamingResponse(process_video_stream(0, camera_id=camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/snapshots/{image_id}")
def get_snapshot(image_id: str):
    """Serves saved detection images by their unique ID."""
    snapshot_path = os.path.join(SNAPSHOT_DIR, image_id)
    
    if not os.path.exists(snapshot_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(snapshot_path, media_type="image/jpeg")

@app.post("/capture_frame/{camera_id}")
async def capture_frame(camera_id: str):
    """
    Captures current frame from camera without triggering alerts.
    Used for periodic image updates during active alerts.
    Returns the imageId of the saved snapshot.
    """
    try:
        # Get camera ID, or use default webcam (0) if camera_id not found
        cap = cv2.VideoCapture(0)  # Using default webcam, can be enhanced to map camera_id to specific cameras
        
        ret, frame = cap.read()
        cap.release()
        
        if not ret or frame is None:
            return JSONResponse(
                content={"error": "Failed to capture frame from camera"},
                status_code=500
            )
        
        # Save the frame without running inference (no alert trigger)
        image_id = f"{uuid.uuid4()}.jpg"
        snapshot_path = os.path.join(SNAPSHOT_DIR, image_id)
        success = cv2.imwrite(snapshot_path, frame)
        
        if not success:
            return JSONResponse(
                content={"error": "Failed to save snapshot"},
                status_code=500
            )
        
        print(f"[PYTHON] [Capture Frame] Saved snapshot for camera {camera_id}: {image_id}")
        return JSONResponse(content={"imageId": image_id, "cameraId": camera_id})
        
    except Exception as e:
        print(f"[PYTHON] [Capture Frame] Error: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/latest_snapshot/{camera_id}")
async def get_latest_snapshot(camera_id: str):
    """
    Returns the most recently saved snapshot ID for a camera.
    This gets the latest snapshot from the saved_snapshots directory.
    Used for periodic image updates during active alerts.
    """
    try:
        if not os.path.exists(SNAPSHOT_DIR):
            return JSONResponse(
                content={"error": "Snapshot directory not found", "imageId": None},
                status_code=404
            )
        
        # Get all snapshot files
        snapshot_files = [f for f in os.listdir(SNAPSHOT_DIR) if f.endswith('.jpg')]
        
        if not snapshot_files:
            return JSONResponse(
                content={"error": "No snapshots found", "imageId": None},
                status_code=404
            )
        
        # Sort by modification time (most recent first)
        snapshot_files.sort(
            key=lambda x: os.path.getmtime(os.path.join(SNAPSHOT_DIR, x)),
            reverse=True
        )
        
        # Return the most recent snapshot
        latest_image_id = snapshot_files[0]
        print(f"[PYTHON] [Latest Snapshot] Returning latest snapshot for camera {camera_id}: {latest_image_id}")
        return JSONResponse(content={"imageId": latest_image_id, "cameraId": camera_id})
        
    except Exception as e:
        print(f"[PYTHON] [Latest Snapshot] Error: {e}")
        return JSONResponse(
            content={"error": str(e), "imageId": None},
            status_code=500
        )

@app.post("/analyze_and_save_frame")
async def analyze_and_save_frame(file: UploadFile = File(...)):
    """
    Analyzes a single frame. If fire/smoke is detected, it saves the image
    to the 'saved_snapshots' dir and returns the new imageId along
    with the detection data.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            print("[PYTHON] ❌ Error: Could not decode image.")
            return JSONResponse(content={"error": "Could not decode image."}, status_code=400)

        # --- START OF VERBOSE LOGGING ---
        print("\n[PYTHON] ---------------- NEW FRAME ----------------")
        print("[PYTHON] ✅ Frame received. Running YOLO model...")
        
        results = model(frame, imgsz=640, verbose=False)
        
        best_detection = None
        
        # Log *all* detections, even low-confidence ones
        found_anything = False
        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0].item())
                cls_id = int(box.cls[0].item())
                class_name = model.names[cls_id]
                
                # Log everything the model sees
                print(f"[PYTHON]   - Found: {class_name} (Confidence: {conf:.2f})")
                found_anything = True
                
                # Now, check if it's our target (0.75 threshold)
                if class_name in ['fire', 'smoke'] and conf > 0.75:
                    if best_detection is None: 
                        best_detection = {
                            "class": class_name,
                            "confidence": conf,
                            "bbox": box.xyxy[0].tolist()
                        }
        
        if not found_anything:
            print("[PYTHON]   - Model found no objects in this frame.")
        # --- END OF VERBOSE LOGGING ---
        
        if best_detection:
            # Fire IS detected. Save the image.
            image_id = f"{uuid.uuid4()}.jpg"
            snapshot_path = os.path.join(SNAPSHOT_DIR, image_id)
            
            success = cv2.imwrite(snapshot_path, frame)
            
            if success:
                print(f"[PYTHON] 🔥🔥🔥 SUCCESS! Fire detected! Conf: {best_detection['confidence']:.2f}. Saved as: {image_id}")
                return JSONResponse(content={
                    "detection": best_detection,
                    "imageId": image_id
                })
            else:
                print(f"[PYTHON] ❌ Error: Fire detected, but FAILED to save snapshot.")
                return JSONResponse(content={"error": "Failed to save snapshot."}, status_code=500)
        
        else:
            # No fire detected that passes the 0.75 threshold.
            print("[PYTHON] ✅ No fire detected *above 0.75 threshold*. Returning null.")
            return JSONResponse(content={"detection": None, "imageId": None})

    except Exception as e:
        print(f"[PYTHON] ❌ CRITICAL ERROR in /analyze_and_save_frame: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)