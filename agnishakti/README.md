# AgniSetu - AI-Powered Fire Detection and Alert System

## 🔥 Project Overview

**AgniSetu** (meaning "Fire Bridge" in Sanskrit) is a comprehensive, AI-powered fire safety system that uses computer vision (YOLOv8) and Google Gemini AI to identify fire and smoke in real-time through camera feeds. When fire or smoke is detected, the system automatically verifies with Gemini AI, then alerts property owners and nearby fire stations via email, enabling rapid emergency response.

### Key Features
- 🎥 **Real-time Fire Detection**: Uses YOLOv8 custom-trained model (confidence > 0.75) to detect fire and smoke
- 🧠 **AI Verification**: Google Gemini AI double-check for detection accuracy (reduces false positives)
- 🚨 **Automated Alerting**: Sends email notifications to owners and fire stations
- 🏠 **Multi-Property Management**: Property owners can monitor multiple houses/properties
- 📹 **Multi-Camera Support**: Each property can have multiple surveillance cameras
- 🔐 **Role-Based Access**: Separate dashboards for property owners and fire station providers
- 🗺️ **Location-Based Response**: Automatically finds and notifies nearest fire stations using Haversine distance
- ⏱️ **Alert Countdown System**: 30-second cancellation window for false alarms
- 📊 **Real-time Monitoring**: Start/stop camera monitoring from dashboard
- 🔄 **10-Minute Cooldown**: Prevents alert spam after notifications are sent
- 🗑️ **Auto-Cleanup**: Old alerts automatically deleted after cooldown expires

---

## 🏗️ System Architecture

The system consists of three main components:

1. **Python AI Service** (`src/ai_backend/ai_service.py`): FastAPI service running YOLOv8 model
   - Runs on port 8000 (default)
   - Handles frame analysis and image storage
   - Serves detection snapshots

2. **Next.js Backend** (`src/app/backend.js` + API routes): Server-side logic
   - Firebase Firestore integration
   - Gemini AI verification
   - Email sending via Nodemailer
   - Alert state machine management

3. **React Frontend** (`src/components/`): Client-side UI
   - Real-time camera feed monitoring
   - Alert management and countdown
   - Property and camera management

---

## 📊 Firebase Firestore Database Schema

### Collection: `users`
**Document ID**: Normalized email (lowercase, trimmed)

```javascript
{
  email: "user@example.com",           // Normalized email (used as doc ID)
  name: "John Doe",                     // User's display name
  role: "owner" | "provider",           // User role
  createdAt: Timestamp,                 // First registration timestamp
  assignedStations?: [string]           // Array of stationIds (for providers only)
}
```

**Queries**:
- Get user: `users/{normalizedEmail}`

---

### Collection: `houses`
**Document ID**: Auto-generated Firestore ID

```javascript
{
  houseId: "abc123",                    // Same as document ID
  ownerEmail: "user@example.com",       // Normalized email
  address: "123 Main St",               // Physical address
  coords: {
    lat: 40.7128,                       // Latitude
    lng: -74.0060                       // Longitude
  },
  nearestFireStationId: "station123",   // Auto-assigned during creation
  monitoringEnabled: true,              // Whether monitoring is active
  monitorPasswordHash: "$2a$10...",      // bcrypt hash of monitoring password
  createdAt: Timestamp                  // Creation timestamp
}
```

**Queries**:
- Get by owner: `houses` where `ownerEmail == {email}`
- Get by ID: `houses/{houseId}`

---

### Collection: `cameras`
**Document ID**: Auto-generated Firestore ID

```javascript
{
  cameraId: "camera123",                // Same as document ID
  houseId: "abc123",                    // Parent house ID
  label: "Front Door Camera",           // Display name
  source: "rtsp://...",                 // Stream source or device ID
  streamType: "rtsp" | "webcam" | "webrtc" | "other",
  isMonitoring: false,                  // Current monitoring status
  createdAt: Timestamp,                 // Creation timestamp
  lastSeen: Timestamp | null,           // Last activity timestamp
  updatedAt: Timestamp                  // Last update timestamp
}
```

**Queries**:
- Get by house: `cameras` where `houseId == {houseId}`
- Get by owner: Query all houses, then `cameras` where `houseId in [houseIds]` (chunked)

---

### Collection: `fireStations`
**Document ID**: Auto-generated Firestore ID

```javascript
{
  stationId: "station123",              // Same as document ID
  name: "Fire Station #1",              // Station name
  address: "456 Fire St",                // Physical address
  phone: "+1234567890",                 // Contact phone
  email: "station@fire.gov",            // Contact email (normalized)
  providerEmail: "station@fire.gov",    // Provider user email (normalized)
  coords: {
    lat: 40.7580,
    lng: -73.9855
  },
  createdAt: Timestamp                  // Registration timestamp
}
```

**Queries**:
- Get all: `fireStations` (for distance calculation)
- Nearest station: Calculated client-side using Haversine formula

---

### Collection: `alerts`
**Document ID**: Auto-generated Firestore ID

```javascript
{
  alertId: "alert123",                  // Same as document ID
  cameraId: "camera123",                // Source camera ID
  houseId: "abc123",                    // Parent house ID
  status: "PENDING" | "CONFIRMED_BY_GEMINI" | "REJECTED_BY_GEMINI" | 
          "SENDING_NOTIFICATIONS" | "NOTIFIED_COOLDOWN" | "CANCELLED_BY_USER",
  
  // Detection data
  detectionImage: "http://localhost:8000/snapshots/uuid.jpg",  // Full URL to saved image
  className: "fire" | "smoke",          // Detected class
  confidence: 0.84,                       // YOLO confidence score (0.75+)
  bbox: [x1, y1, x2, y2],               // Bounding box coordinates
  
  // Gemini verification (null if still pending)
  geminiCheck: {
    isFire: true | false,
    score: 0.95,                         // Gemini confidence (0.0-1.0)
    reason: "Detailed analysis...",
    fireIndicators: ["visible flames", "smoke"],
    falsePositiveReasons: [],
    sensitive: false,
    sensitiveReason: "No sensitive content"
  } | null,
  
  // Timestamps
  createdAt: Timestamp,                  // When alert was created
  cooldownExpiresAt: Timestamp | null,   // When cooldown ends (10 min after emails sent)
  lastImageUpdate: Timestamp | null,     // Last image update during cooldown
  
  // Email tracking
  sentEmails: {
    ownerSent: true,
    stationSent: true
  } | null,
  
  // Cancellation (if cancelled)
  canceledBy: "user@example.com" | null,
  canceledAt: Timestamp | null
}
```

**Alert Status Flow**:
1. `PENDING` → Created by frontend, Gemini verification starting
2. `CONFIRMED_BY_GEMINI` → Gemini verified it's real fire
3. `REJECTED_BY_GEMINI` → Gemini verified it's false positive
4. `SENDING_NOTIFICATIONS` → Emails being sent
5. `NOTIFIED_COOLDOWN` → Emails sent, 10-minute cooldown active
6. `CANCELLED_BY_USER` → User cancelled during 30s countdown

**Queries**:
- Active alerts: `alerts` where `cameraId == {id}` AND `status in ["PENDING", "CONFIRMED_BY_GEMINI", "SENDING_NOTIFICATIONS", "NOTIFIED_COOLDOWN"]`
- By owner: Get all houses → `alerts` where `houseId in [houseIds]`
- Cleanup: `alerts` where `cooldownExpiresAt <= now`

---

## 🔌 Complete API Documentation

### Authentication APIs

#### `POST /api/auth/register`
**Purpose**: Register a new user (owner or provider)

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "owner" | "provider"
}
```

**Response** (201):
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  }
}
```

**Firebase Operation**:
- Creates or updates document in `users` collection
- Document ID = normalized email (lowercase, trimmed)
- Sets `createdAt` only if user doesn't exist

---

#### `POST /api/auth/login`
**Purpose**: Authenticate and retrieve user data

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Firebase Operation**:
- Reads from `users/{normalizedEmail}`

---

### House Management APIs

#### `POST /api/houses`
**Purpose**: Create a new house/property

**Request Body**:
```json
{
  "ownerEmail": "user@example.com",
  "address": "123 Main St",
  "coords": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "monitorPassword": "secure_password"
}
```

**Response** (200):
```json
{
  "success": true,
  "houseId": "abc123"
}
```

**Firebase Operation**:
1. Normalizes owner email
2. Finds nearest fire station using Haversine distance
3. Hashes monitor password with bcrypt (salt rounds: 10)
4. Creates document in `houses` collection
5. Sets `nearestFireStationId` automatically

---

#### `GET /api/houses?ownerEmail={email}`
**Purpose**: Get all houses for an owner

**Response** (200):
```json
{
  "success": true,
  "houses": [
    {
      "houseId": "abc123",
      "ownerEmail": "user@example.com",
      "address": "123 Main St",
      "coords": {...},
      "nearestFireStationId": "station123",
      ...
    }
  ]
}
```

**Firebase Operation**:
- Query: `houses` where `ownerEmail == {normalizedEmail}`

---

#### `GET /api/houses/[id]`
**Purpose**: Get single house by ID

**Response** (200):
```json
{
  "success": true,
  "house": { /* house object */ }
}
```

**Firebase Operation**:
- Reads from `houses/{houseId}`

---

#### `PATCH /api/houses/[id]`
**Purpose**: Update house details

**Request Body** (partial):
```json
{
  "address": "New Address",
  "coords": {...},
  "monitoringEnabled": false
}
```

**Firebase Operation**:
- Updates `houses/{houseId}` with merge (preserves existing fields)

---

#### `DELETE /api/houses/[id]`
**Purpose**: Delete house (cascades to cameras)

**Firebase Operation**:
1. Finds all cameras: `cameras` where `houseId == {houseId}`
2. Deletes all camera documents
3. Deletes house document

---

### Camera Management APIs

#### `POST /api/cameras`
**Purpose**: Add a new camera to a house

**Request Body**:
```json
{
  "houseId": "abc123",
  "label": "Front Door Camera",
  "source": "rtsp://example.com/stream" | "device-id-string",
  "streamType": "rtsp" | "webcam" | "webrtc" | "other"
}
```

**Response** (201):
```json
{
  "success": true,
  "camera": {
    "cameraId": "camera123",
    "houseId": "abc123",
    "label": "Front Door Camera",
    "source": "...",
    "streamType": "rtsp",
    "isMonitoring": false,
    "createdAt": "..."
  }
}
```

**Firebase Operation**:
- Creates document in `cameras` collection
- Sets `isMonitoring: false` by default

---

#### `GET /api/cameras?ownerEmail={email}`
**Purpose**: Get all cameras for an owner (across all houses)

**Response** (200):
```json
{
  "success": true,
  "cameras": [
    {
      "cameraId": "camera123",
      "houseId": "abc123",
      "label": "Front Door Camera",
      ...
    }
  ]
}
```

**Firebase Operation**:
1. Gets all houses for owner
2. Queries cameras in chunks (max 10 houseIds per query): `cameras` where `houseId in [houseIds]`

---

#### `DELETE /api/cameras`
**Purpose**: Delete a camera

**Request Body**:
```json
{
  "cameraId": "camera123"
}
```

**Firebase Operation**:
- Deletes `cameras/{cameraId}`

---

### Monitoring APIs

#### `POST /api/monitoring/start`
**Purpose**: Start monitoring a camera

**Request Body**:
```json
{
  "cameraId": "camera123"
}
```

**Response** (200):
```json
{
  "success": true,
  "result": { "success": true }
}
```

**Firebase Operation**:
- Updates `cameras/{cameraId}`: `{ isMonitoring: true, updatedAt: now }`

---

#### `POST /api/monitoring/stop`
**Purpose**: Stop monitoring a camera

**Request Body**:
```json
{
  "cameraId": "camera123"
}
```

**Firebase Operation**:
- Updates `cameras/{cameraId}`: `{ isMonitoring: false, updatedAt: now }`

---

### Alert Pipeline APIs

#### `POST /api/alerts/client-trigger`
**Purpose**: Trigger a new alert from frontend (called when YOLO detects fire)

**Request Body**:
```json
{
  "cameraId": "camera123",
  "imageId": "uuid.jpg" | "http://localhost:8000/snapshots/uuid.jpg",
  "className": "fire" | "smoke",
  "confidence": 0.84,
  "bbox": [x1, y1, x2, y2],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "alertId": "alert123"
}
```

**Response** (429 Too Many Requests):
```json
{
  "success": false,
  "message": "An alert is already active for this camera."
}
```

**Firebase Operation**:
1. **Spam Check**: Queries `alerts` where `cameraId == {cameraId}` AND `status in ["PENDING", "CONFIRMED_BY_GEMINI", "SENDING_NOTIFICATIONS", "NOTIFIED_COOLDOWN"]`
   - If found → Returns 429
   - If not found → Proceeds
2. Gets camera document to find `houseId`
3. Builds snapshot URL (handles full URL or filename)
4. Creates alert document with status `PENDING`
5. **Fire-and-forget**: Starts Gemini verification in background (doesn't await)

**Background Process**:
- `runGeminiVerification()` runs asynchronously
- Fetches image from Python server
- Calls Gemini API
- Updates alert status to `CONFIRMED_BY_GEMINI` or `REJECTED_BY_GEMINI`

---

#### `POST /api/alerts/cancel`
**Purpose**: Cancel an alert (user clicked cancel button)

**Request Body**:
```json
{
  "alertId": "alert123",
  "userEmail": "user@example.com"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Alert cancelled and deleted."
}
```

**Firebase Operation**:
1. Reads alert document
2. If status is `PENDING`, `REJECTED_BY_GEMINI`, or `CONFIRMED_BY_GEMINI`:
   - Sets status to `CANCELLED_BY_USER`
   - Sets `canceledBy` and `canceledAt`
3. **Immediately deletes** the alert document

---

#### `POST /api/alerts/confirm-and-send`
**Purpose**: "Gatekeeper" function - called after 30s countdown expires

**Request Body**:
```json
{
  "alertId": "alert123"
}
```

**Response** (200):
```json
{
  "ok": true,
  "alertId": "alert123",
  "status": "NOTIFIED_COOLDOWN",
  "message": "Emails sent successfully"
}
```

**Response** (if cancelled/rejected):
```json
{
  "ok": true,
  "message": "Alert was cancelled by user." | "Alert was rejected by Gemini."
}
```

**Response** (if not confirmed yet):
```json
{
  "ok": false,
  "message": "Alert not confirmed. Status: PENDING"
}
```

**Firebase Operation** (Gatekeeper Logic):
1. Reads alert document
2. **Check 1**: If `status == "CANCELLED_BY_USER"` → Delete and return
3. **Check 2**: If `status == "REJECTED_BY_GEMINI"` → Delete and return
4. **Check 3**: If `status == "NOTIFIED_COOLDOWN"` or `"SENDING_NOTIFICATIONS"` → Return (already processed)
5. **Check 4**: If `status != "CONFIRMED_BY_GEMINI"` → Return error (Gemini not finished)
6. **If all checks pass**:
   - Sets status to `SENDING_NOTIFICATIONS`
   - Gets house and owner data
   - Finds nearest fire station
   - Sends email to owner (with image if not sensitive)
   - Sends email to fire station (with image if not sensitive)
   - Sets status to `NOTIFIED_COOLDOWN`
   - Sets `cooldownExpiresAt` = now + 10 minutes
   - Sets `sentEmails` tracking object

---

#### `GET /api/alerts?ownerEmail={email}`
**Purpose**: Get all alerts for an owner (all statuses)

**Response** (200):
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert123",
      "alertId": "alert123",
      "cameraId": "camera123",
      "status": "PENDING",
      ...
    }
  ]
}
```

**Firebase Operation**:
1. Gets all houses for owner
2. Queries alerts in chunks: `alerts` where `houseId in [houseIds]`

---

#### `GET /api/alerts/active?ownerEmail={email}`
**Purpose**: Get only active alerts (PENDING, CONFIRMED, etc.)

**Response** (200):
```json
{
  "success": true,
  "alerts": [
    {
      "alertId": "alert123",
      "status": "PENDING",
      ...
    }
  ]
}
```

**Firebase Operation**:
- Same as above, but filters: `status in ["PENDING", "CONFIRMED_BY_GEMINI", "SENDING_NOTIFICATIONS", "NOTIFIED_COOLDOWN"]`

---

### Fire Station APIs

#### `POST /api/stations/register`
**Purpose**: Register a fire station (requires provider secret)

**Headers**:
```
x-provider-secret: {PROVIDER_SECRET from env}
```

**Request Body**:
```json
{
  "email": "station@fire.gov",
  "name": "John Provider",
  "stationName": "Fire Station #1",
  "stationAddress": "456 Fire St",
  "stationPhone": "+1234567890",
  "coords": {
    "lat": 40.7580,
    "lng": -73.9855
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "userEmail": "station@fire.gov",
  "stationId": "station123",
  "message": "Fire station and provider registered successfully"
}
```

**Firebase Operation**:
1. Validates `x-provider-secret` header matches `PROVIDER_SECRET` env var
2. Creates/updates user in `users` collection with `role: "provider"`
3. Creates document in `fireStations` collection
4. Links station to provider: Updates `users/{email}` with `assignedStations` array

---

#### `GET /api/provider/dashboard?providerEmail={email}`
**Purpose**: Get dashboard data for fire station provider

**Response** (200):
```json
{
  "success": true,
  "dashboard": [
    {
      "houseId": "abc123",
      "address": "123 Main St",
      "ownerEmail": "owner@example.com",
      "nearestFireStationId": "station123",
      "activeAlerts": [
        {
          "alertId": "alert123",
          "status": "CONFIRMED_BY_GEMINI",
          ...
        }
      ]
    }
  ]
}
```

**Firebase Operation**:
1. Gets `assignedStations` array from `users/{providerEmail}`
2. Queries houses: `houses` where `nearestFireStationId in [stationIds]`
3. Queries alerts: `alerts` where `houseId in [houseIds]` AND `status == "CONFIRMED"`
4. Groups alerts by house

---

### Python AI Service APIs

#### `POST /analyze_and_save_frame` (Python Service - Port 8000)
**Purpose**: Analyze a frame and save if fire detected

**Request**: `multipart/form-data`
```
file: <binary image data>
```

**Response** (200 - Fire Detected):
```json
{
  "detection": {
    "class": "fire",
    "confidence": 0.84,
    "bbox": [x1, y1, x2, y2]
  },
  "imageId": "uuid.jpg"
}
```

**Response** (200 - No Fire):
```json
{
  "detection": null,
  "imageId": null
}
```

**Operation**:
1. Decodes image from binary
2. Runs YOLOv8 model inference
3. Checks for `fire` or `smoke` with confidence > 0.75
4. If detected: Saves image to `saved_snapshots/{uuid}.jpg`
5. Returns detection data and `imageId`

---

#### `GET /snapshots/{imageId}` (Python Service)
**Purpose**: Serve saved detection images

**Response**: JPEG image file

**Operation**:
- Serves file from `saved_snapshots/{imageId}`

---

## 🔥 Complete Fire Detection Pipeline

### Overview Flow
```
Frontend Camera Feed → Python YOLO → Backend Alert Creation → Gemini Verification → Email Notification
```

### Detailed Step-by-Step Process

#### Step 1: Frontend Monitoring Loop (`CameraFeed` component)
**Location**: `src/components/OwnerDashboard.jsx` (lines 79-168)

**Process**:
1. User clicks "Start Monitoring" on a camera
2. `isMonitoring` state becomes `true`
3. `useEffect` starts a 1 FPS interval loop
4. Every second:
   - Captures frame from `<video>` element
   - Draws to hidden `<canvas>` (resized to MAX_WIDTH=800)
   - Converts canvas to JPEG blob (quality 0.8)
   - Sends blob to Python service

**Code Flow**:
```javascript
setInterval(() => {
  canvas.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    
    const aiResponse = await fetch('http://localhost:8000/analyze_and_save_frame', {
      method: 'POST',
      body: formData
    });
    
    const result = await aiResponse.json();
    // Step 2 continues below...
  }, 'image/jpeg', 0.8);
}, 1000);
```

---

#### Step 2: Python YOLO Detection (`ai_service.py`)
**Location**: `src/ai_backend/ai_service.py` (lines 319-392)

**Process**:
1. Receives JPEG binary data
2. Decodes image using OpenCV (`cv2.imdecode`)
3. Runs YOLOv8 model inference (`model(frame, imgsz=640)`)
4. Iterates through all detections
5. Filters for `fire` or `smoke` with confidence > **0.75**
6. If detected:
   - Generates UUID: `imageId = f"{uuid.uuid4()}.jpg"`
   - Saves frame to `saved_snapshots/{imageId}`
   - Returns `{ detection: {...}, imageId: "uuid.jpg" }`
7. If not detected: Returns `{ detection: null, imageId: null }`

**Threshold**: **0.75 confidence** (hardcoded in `ai_service.py` line 356)

---

#### Step 3: Frontend Alert Trigger (`CameraFeed` component)
**Location**: `src/components/OwnerDashboard.jsx` (lines 116-146)

**Process**:
1. Receives result from Python
2. Checks `if (result.detection && result.imageId)`
3. **Spam Check**: Checks `isAlertPending` state (prevents duplicate alerts)
4. If no pending alert:
   - Sets `isAlertPending = true` (local state)
   - Calls `/api/alerts/client-trigger` with:
     - `cameraId`
     - `imageId` (from Python)
     - `className`, `confidence`, `bbox`
     - `timestamp`
5. Stops monitoring (`handleToggleMonitoring()`)

**Request**:
```javascript
await fetch('/api/alerts/client-trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cameraId: camera.cameraId,
    imageId: result.imageId,
    className: result.detection.class,
    confidence: result.detection.confidence,
    bbox: result.detection.bbox,
    timestamp: new Date().toISOString()
  })
});
```

---

#### Step 4: Backend Alert Creation (`createPendingAlert`)
**Location**: `src/app/backend.js` (lines 567-612)

**Process**:
1. **Spam Check**: Calls `checkActiveAlert(cameraId)`
   - Queries `alerts` where `cameraId == {cameraId}` AND `status in [PENDING, CONFIRMED_BY_GEMINI, SENDING_NOTIFICATIONS, NOTIFIED_COOLDOWN]`
   - If found → Returns 429 error
   - If not found → Proceeds
2. Gets camera document to find `houseId`
3. Builds snapshot URL:
   - If `imageId` starts with `http` → Use as-is
   - Otherwise → Build: `{PYTHON_SERVICE_URL}/snapshots/{imageId}`
4. Creates alert document in `alerts` collection:
   ```javascript
   {
     alertId: auto-generated,
     cameraId,
     houseId,
     status: "PENDING",
     detectionImage: snapshotUrl,
     className, confidence, bbox,
     createdAt: now,
     geminiCheck: null
   }
   ```
5. **Fire-and-forget**: Calls `runGeminiVerification(alertId, snapshotUrl)` (no await)
6. Returns `{ alertId }` to frontend

---

#### Step 5: Gemini AI Verification (`runGeminiVerification`)
**Location**: `src/app/backend.js` (lines 618-648)

**Process** (runs asynchronously in background):
1. Calls `verifyWithGemini({ imageUrl })`
2. `verifyWithGemini`:
   - Fetches image from Python server URL
   - Converts to base64
   - Initializes GoogleGenAI client
   - Tries to list available models (fallback if fails)
   - Builds model fallback list: `["gemini-2.0-flash-exp", "gemini-1.5-flash", ...]`
   - Iterates through models until one works:
     - Calls `genAI.models.generateContent({ model, contents: [{ parts }] })`
     - Handles 404 (model not found) → try next
     - Handles 429 (rate limit) → try next or throw
   - Parses JSON response from Gemini
   - Returns: `{ isFire, score, reason, fireIndicators, falsePositiveReasons, sensitive, sensitiveReason }`
3. Reads alert document again
4. **Race condition check**: Only updates if `status === "PENDING"` (user might have cancelled)
5. Updates alert:
   - If `isFire === true` → Status = `CONFIRMED_BY_GEMINI`
   - If `isFire === false` → Status = `REJECTED_BY_GEMINI`
   - Sets `geminiCheck` object with full analysis

**Gemini Prompt** (lines 911-946):
- Analyzes for REAL FIRE indicators vs FALSE POSITIVES
- Checks for sensitive content
- Returns structured JSON response

**Model Selection**:
- Prioritizes `gemini-2.0-flash-exp` (known to work with v1beta API)
- Falls back through: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`
- Handles rate limits (429) gracefully

---

#### Step 6: Frontend Polling & Status Updates (`pollAlerts`)
**Location**: `src/components/OwnerDashboard.jsx` (lines 476-560)

**Process** (runs every 5 seconds):
1. Fetches `/api/alerts?ownerEmail={email}`
2. Receives all alerts for owner
3. **Smart UI Logic**:
   - If alert status is `REJECTED_BY_GEMINI`:
     - Shows error toast
     - Closes modal
     - Clears countdown timer
   - If alert status is `CONFIRMED_BY_GEMINI`:
     - Shows success toast (only once)
     - Updates active alert state
   - If alert status is `NOTIFIED_COOLDOWN` or `CANCELLED_BY_USER`:
     - Closes modal
     - Clears timer
   - If new `PENDING` or `CONFIRMED_BY_GEMINI` alert found:
     - Calls `startAlertCountdown(alert)` → Opens 30s modal
4. Updates `allActiveAlerts` state (maps `cameraId → alert`)

---

#### Step 7: 30-Second Countdown Modal (`startAlertCountdown`)
**Location**: `src/components/OwnerDashboard.jsx` (lines 576-602)

**Process**:
1. Sets `activeAlert` state (shows modal)
2. Sets `alertCountdown = 30`
3. Starts interval that decrements every second
4. When countdown reaches 0:
   - Clears interval
   - Closes modal (`setActiveAlert(null)`)
   - Calls `/api/alerts/confirm-and-send` with `alertId`
5. User can click "Cancel" button at any time → Calls `/api/alerts/cancel`

**Cancel Flow** (`handleCancelAlert`):
1. Stops countdown timer
2. Closes modal immediately (optimistic UI)
3. Shows success toast
4. Calls `/api/alerts/cancel` in background
5. Backend deletes alert

---

#### Step 8: Email Gatekeeper (`confirmAndSendAlerts`)
**Location**: `src/app/backend.js` (lines 681-776)

**Process**:
1. Reads alert document
2. **Gatekeeper Checks** (in order):
   - If `CANCELLED_BY_USER` → Delete alert, return
   - If `REJECTED_BY_GEMINI` → Delete alert, return
   - If `NOTIFIED_COOLDOWN` or `SENDING_NOTIFICATIONS` → Return (already processed)
   - If status != `CONFIRMED_BY_GEMINI` → Return error (Gemini still processing)
3. **If all checks pass** (status is `CONFIRMED_BY_GEMINI`):
   - Sets status to `SENDING_NOTIFICATIONS`
   - Gets house document
   - Gets owner user document
   - Finds nearest fire station using `findNearestFireStation(house.coords)`
   - Builds GPS link: `http://maps.google.com/?q={lat},{lng}`
   - Checks `geminiCheck.sensitive` (don't attach image if sensitive)
4. **Send Owner Email**:
   - Subject: `URGENT: Fire detected at {address}`
   - Body: HTML with detection info and GPS link
   - Attaches image URL if not sensitive
5. **Send Fire Station Email** (if station exists):
   - Subject: `ALERT: Fire at {address}`
   - Body: Alert info with owner email
   - Attaches image URL if not sensitive
6. **Update Alert**:
   - Sets status to `NOTIFIED_COOLDOWN`
   - Sets `cooldownExpiresAt` = now + 10 minutes
   - Sets `sentEmails: { ownerSent: true, stationSent: true/false }`

**Email Sending** (`sendAlertEmail`):
- Uses Nodemailer with SMTP config from env vars
- Supports HTML body
- Includes image link in email if provided

---

#### Step 9: Cooldown Period (10 minutes)
**Duration**: 10 minutes after emails sent

**During Cooldown**:
- New alerts for same camera are rejected (spam protection)
- Frontend can update alert image every 30 seconds (if cooldown active)
- Alert status: `NOTIFIED_COOLDOWN`

**After Cooldown**:
- Alert is eligible for cleanup
- `cooldownExpiresAt <= now`
- Cron job can delete old alerts

---

#### Step 10: Cleanup (`cleanupResolvedAlerts`)
**Location**: `src/app/backend.js` (lines 806-827)

**Process**:
1. Queries `alerts` where `cooldownExpiresAt <= now`
2. Deletes all matching alerts
3. Returns count of deleted alerts

**Intended Use**: Cron job endpoint (not implemented yet)

---

## 🎯 Component Workflows

### Owner Dashboard (`OwnerDashboard.jsx`)

#### Initialization Flow:
1. Component mounts with `email` prop
2. `useEffect` runs (depends on `email` only)
3. `fetchAllData()`:
   - Fetches user data (`/api/auth/login`)
   - Fetches houses (`fetchHouses()`)
   - Fetches cameras (`/api/cameras`)
   - Groups cameras by `houseId`
4. Starts 5-second polling interval (`pollAlerts`)

#### Alert Polling (`pollAlerts`):
- Runs every 5 seconds
- Fetches `/api/alerts?ownerEmail={email}`
- Reacts to status changes:
  - `REJECTED_BY_GEMINI` → Close modal, show error
  - `CONFIRMED_BY_GEMINI` → Update state, show success
  - `NOTIFIED_COOLDOWN` → Close modal
  - New `PENDING` → Start countdown

#### Camera Feed Monitoring (`CameraFeed` component):
- Receives `camera`, `onCameraDeleted`, `onToggleMonitoring` props
- Loads video stream (webcam or RTSP)
- When monitoring active:
  - Captures frame every 1 second
  - Sends to Python `/analyze_and_save_frame`
  - If fire detected → Triggers alert → Stops monitoring

---

### Provider Dashboard (`ProviderDashboard.jsx`)

**Not yet implemented** - but would use:
- `/api/provider/dashboard?providerEmail={email}`
- Shows houses with `nearestFireStationId` matching provider's stations
- Shows active alerts for those houses

---

## 🔐 Security & Environment Variables

### Required Environment Variables

**Firebase**:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com (optional)
```

**Email (SMTP)**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**Gemini AI**:
```
GEMINI_API_KEY=your-gemini-api-key
ENABLE_GEMINI=true
```

**Services**:
```
PYTHON_SERVICE_URL=http://127.0.0.1:8000
PROVIDER_SECRET=your-secret-key (for fire station registration)
```

---

## 📁 File Storage

### Python Service Storage:
- **Detection Images**: `src/ai_backend/saved_snapshots/{uuid}.jpg`
- **Uploaded Videos**: `src/ai_backend/temp_videos/{uuid}_{filename}`

### Image URLs:
- Format: `{PYTHON_SERVICE_URL}/snapshots/{imageId}`
- Example: `http://localhost:8000/snapshots/abc123-uuid.jpg`
- Served directly from Python FastAPI

---

## 🐛 Known Issues & Limitations

1. **isAlertPending State**: Currently blocks new detections until page reload after fake fire rejection
   - **Workaround**: Page refresh resets state
   - **Future Fix**: Reset state when alert is rejected/cancelled

2. **Monitoring Stops After Alert**: Monitoring automatically stops after first alert
   - **Reason**: Prevents spam, but prevents continued monitoring
   - **Future**: Allow monitoring to continue during cooldown

3. **Gemini Rate Limits**: Can hit 429 errors if too many requests
   - **Mitigation**: Model fallback system tries multiple models
   - **Future**: Add exponential backoff and retry logic

4. **No Cron Job Implementation**: Cleanup function exists but not called automatically
   - **Future**: Set up cron job or scheduled function

---

## 🚀 Deployment Notes

### Python Service:
- Runs on port 8000 (default)
- Requires CUDA GPU for optimal performance (falls back to CPU)
- YOLO model file: `best.pt` (must be in `src/ai_backend/`)

### Next.js Service:
- Runs on port 3000 (default)
- Requires all Firebase credentials
- Requires SMTP credentials for email
- Requires Gemini API key

### Database:
- Firebase Firestore (NoSQL)
- Collections created automatically on first write
- No migrations needed

---

## 📝 API Testing Examples

### Trigger Alert Manually:
```bash
curl -X POST http://localhost:3000/api/alerts/client-trigger \
  -H "Content-Type: application/json" \
  -d '{
    "cameraId": "your-camera-id",
    "imageId": "http://127.0.0.1:8000/snapshots/test.jpg",
    "className": "fire",
    "confidence": 0.9,
    "bbox": [100, 100, 200, 200],
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

### Cancel Alert:
```bash
curl -X POST http://localhost:3000/api/alerts/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "alertId": "your-alert-id",
    "userEmail": "user@example.com"
  }'
```

### Get Active Alerts:
```bash
curl "http://localhost:3000/api/alerts/active?ownerEmail=user@example.com"
```

---

## 🔄 State Machine Diagram

```
PENDING
  ├─→ CONFIRMED_BY_GEMINI ─→ SENDING_NOTIFICATIONS ─→ NOTIFIED_COOLDOWN ─→ [DELETED]
  ├─→ REJECTED_BY_GEMINI ─→ [DELETED]
  └─→ CANCELLED_BY_USER ─→ [DELETED]
```

**Transitions**:
- `PENDING` → `CONFIRMED_BY_GEMINI`: Gemini verification (background)
- `PENDING` → `REJECTED_BY_GEMINI`: Gemini verification (background)
- `PENDING` → `CANCELLED_BY_USER`: User cancels
- `CONFIRMED_BY_GEMINI` → `SENDING_NOTIFICATIONS`: 30s timer expires, gatekeeper called
- `SENDING_NOTIFICATIONS` → `NOTIFIED_COOLDOWN`: Emails sent
- `NOTIFIED_COOLDOWN` → `[DELETED]`: Cooldown expires, cleanup runs

---

## 📚 Additional Resources

- **Python Service**: FastAPI with YOLOv8 (Ultralytics)
- **Backend**: Next.js App Router API Routes
- **Frontend**: React with Framer Motion, React Hot Toast
- **Database**: Firebase Firestore
- **AI**: Google Gemini AI (via `@google/genai`)
- **Email**: Nodemailer

---

## 📄 License & Credits

This project uses:
- YOLOv8 by Ultralytics
- Google Gemini AI
- Firebase
- Next.js
- React

---

*Last Updated: 2024* - This documentation reflects the current implementation state. For questions or issues, refer to the codebase or create an issue.
