# AgniShakti - Quick Project Summary

> **Quick Reference Guide** - Copy and paste this into ChatGPT for instant project context

---

## 🎯 What Is This Project?

**AgniShakti** is an AI-powered fire detection system that:
1. Monitors camera feeds using YOLOv8 AI model to detect fire/smoke
2. Automatically sends email alerts to property owners and fire stations
3. Provides web dashboards for property owners and fire department providers
4. Runs on Next.js (frontend) + Python FastAPI (AI backend)

---

## 📂 Project Structure (High-Level)

```
agnishakti/
├── src/
│   ├── ai_backend/              # Python FastAPI + YOLOv8 AI
│   │   ├── ai_service.py        # Main AI service
│   │   ├── best.pt              # Custom trained YOLO model
│   │   ├── saved_snapshots/     # Fire detection images
│   │   └── temp_videos/         # Uploaded test videos
│   │
│   ├── app/
│   │   ├── api/                 # 18 API endpoints (Next.js)
│   │   │   ├── alerts/          # Alert management
│   │   │   ├── auth/            # User authentication
│   │   │   ├── cameras/         # Camera CRUD
│   │   │   ├── houses/          # Property management
│   │   │   ├── monitoring/      # Start/stop monitoring
│   │   │   ├── provider/        # Fire station dashboard
│   │   │   └── snapshots/       # Image proxy
│   │   ├── backend.js           # Core backend functions
│   │   └── page.js              # Landing page
│   │
│   ├── components/
│   │   ├── LandingPage.jsx      # Home page
│   │   ├── OwnerDashboard.jsx   # Owner dashboard
│   │   └── SignIn.js            # Google Auth
│   │
│   └── lib/
│       ├── firebase.js          # Firestore (server)
│       ├── firebaseClient.js    # Firebase Auth (client)
│       └── apiClient.js         # Axios wrapper
│
├── .env.local                   # Environment variables
├── package.json                 # Node.js dependencies
└── README.md                    # Full documentation
```

---

## 🔥 How Fire Detection Works (The Flow)

### Step-by-Step:

1. **Camera Monitoring Active** → Owner enables monitoring on dashboard
2. **AI Processes Frames** → Python service runs YOLOv8 on video frames
3. **Fire Detected** → Confidence > 0.75 for "fire" or "smoke" class
4. **Throttling Check** → Max 1 alert per camera every 5 seconds
5. **Save Snapshot** → Detection frame saved as `uuid.jpg` in `saved_snapshots/`
6. **Call Next.js API** → Python calls `/api/alerts/trigger` with detection data
7. **Create Alert Document** → Firestore alert created with status "PENDING"
8. **AI Verification** → (Currently bypassed - always returns fire detected)
9. **Update Status** → Alert status changed to "CONFIRMED"
10. **Find Recipients** → Get house owner + nearest fire station
11. **Send Emails** → Nodemailer sends alerts with GPS links + images
12. **Update Status** → Alert status changed to "NOTIFIED"
13. **Frontend Polling** → Dashboard polls `/api/alerts/active` every 5 seconds
14. **Show Alert Modal** → 30-second countdown appears on owner's dashboard
15. **User Action** → Owner can cancel within 30 seconds or let timer expire

---

## 🗄️ Database Structure (Firestore)

### Automatic Collection Creation
**Important**: All Firestore collections are automatically created when the first document is written to them. No manual setup required in Firebase Console.

### 5 Main Collections:

#### 1. `users`
```javascript
Document ID: "user@example.com"
{
  name: "John Doe",
  email: "user@example.com",
  role: "owner" | "provider",
  assignedStations: ["station1", "station2"], // For providers only
  createdAt: Timestamp // Only set on first creation, preserved on updates
}
```

#### 2. `houses`
```javascript
{
  houseId: "auto-generated",
  ownerEmail: "owner@example.com",
  address: "123 Main St, City",
  coords: { lat: 40.7128, lng: -74.0060 },
  nearestFireStationId: "station_id", // Automatically calculated on creation
  monitoringEnabled: true,
  monitorPasswordHash: "bcrypt_hash",
  createdAt: Timestamp
}
```

#### 3. `cameras`
```javascript
{
  cameraId: "auto-generated",
  houseId: "house_id",
  label: "Front Door Camera",
  source: "rtsp://192.168.1.100:554/stream",
  streamType: "rtsp" | "usb" | "webrtc",
  isMonitoring: false,
  createdAt: Timestamp
}
```

#### 4. `fireStations`
```javascript
{
  stationId: "auto-generated",
  name: "Central Fire Station",
  address: "456 Fire St",
  phone: "+1-555-0123",
  email: "station@fire.dept",
  coords: { lat: 40.7200, lng: -74.0100 },
  providerEmail: "provider@fire.dept",
  createdAt: Timestamp
}
```

#### 5. `alerts`
```javascript
{
  alertId: "auto-generated",
  cameraId: "camera_id",
  houseId: "house_id",
  detectedClass: "fire" | "smoke",
  confidence: 0.95,
  bbox: [x1, y1, x2, y2],
  status: "PENDING" | "CONFIRMED" | "NOTIFIED" | "CANCELLED",
  timestamp: Timestamp,
  detectionImage: "http://localhost:8000/snapshots/uuid.jpg",
  geminiCheck: { isFire: true, score: 0.95, reason: "..." },
  sentEmails: { ownerSent: true, stationSent: true },
  canceledBy: "user@example.com",
  cancelNote: "False alarm"
}
```

---

## 🔌 Key API Endpoints (18 Total)

### Authentication (2)
- `POST /api/auth/register` - Register user (owner/provider)
- `POST /api/auth/login` - Login and get user data

### Houses (5)
- `POST /api/houses` - Create house
- `GET /api/houses?ownerEmail=...` - Get all houses for owner
- `GET /api/houses/[id]` - Get specific house
- `PATCH /api/houses/[id]` - Update house
- `DELETE /api/houses/[id]` - Delete house
- `POST /api/houses/verify-password` - Verify monitor password

### Cameras (3)
- `POST /api/cameras` - Add camera
- `GET /api/cameras?ownerEmail=...` - Get all cameras for owner
- `DELETE /api/cameras` - Delete camera

### Monitoring (2)
- `POST /api/monitoring/start` - Start camera monitoring
- `POST /api/monitoring/stop` - Stop camera monitoring

### Alerts (5)
- `POST /api/alerts/trigger` - Trigger fire alert (Python service)
- `POST /api/alerts/verify` - Verify with Gemini AI
- `POST /api/alerts/cancel` - Cancel alert
- `GET /api/alerts/active?ownerEmail=...` - Get active alerts
- `GET /api/snapshots/[imageId]` - Get detection image

### Provider (2)
- `POST /api/stations/register` - Register fire station
- `GET /api/provider/dashboard?providerEmail=...` - Get dashboard data

### System (1)
- `GET /api/health` - Health check

---

## 🧠 Key Backend Functions (backend.js)

### User Management
- `normalizeEmail(email)` - Lowercase + trim
- `registerUser({ name, email, role })` - Create or update user (preserves createdAt for existing users)
- `getUserByEmail(email)` - Get user data

### House Management
- `createHouse({ ownerEmail, address, coords, monitorPassword })` - Create house (hashes password, automatically calculates nearest fire station)
- `getHousesByOwnerEmail(ownerEmail)` - Get all houses
- `updateHouse(houseId, updates)` - Update house
- `deleteHouse(houseId)` - Delete house
- `verifyHousePassword(houseId, password)` - Check password

### Camera Management
- `addCamera({ houseId, label, source, streamType })` - Create camera
- `getCamerasByOwnerEmail(ownerEmail)` - Get all cameras (with chunking)
- `deleteCamera(cameraId)` - Delete camera
- `startMonitoring(cameraId)` - Enable monitoring
- `stopMonitoring(cameraId)` - Disable monitoring

### Fire Station Management
- `addFireStation(station)` - Create station
- `registerFireStation({ email, name, stationName, ... })` - Full registration
- `findNearestFireStation({ lat, lng })` - Haversine distance calculation

### Alert System
- `triggerAlert(payload)` - Complete alert workflow (verification + emails)
- `cancelAlert({ alertId, canceledByEmail, note })` - Cancel alert
- `getActiveAlertsForOwner(ownerEmail)` - Get pending/confirmed alerts

### Utilities
- `haversineKm(lat1, lon1, lat2, lon2)` - Distance calculation
- `uploadSnapshotBase64({ base64Image, destinationPath })` - Save image
- `sendAlertEmail({ toEmail, subject, textBody, htmlBody, imageUrl })` - Send email
- `verifyWithGemini({ imageUrl })` - AI verification (currently bypassed)

---

## 🐍 Python AI Service (FastAPI)

**Base URL:** `http://localhost:8000`

### Endpoints:
- `POST /upload_video` - Upload video for processing
- `POST /upload_video/{camera_id}` - Upload video for specific camera
- `GET /video_feed/{video_name}` - Stream processed video
- `GET /webcam_feed` - Stream from webcam
- `GET /snapshots/{image_id}` - Get detection image

### Key Variables:
```python
CONFIDENCE_THRESHOLD = 0.75  # Min confidence for fire/smoke
SNAPSHOT_THROTTLE_SECONDS = 5  # Max 1 alert per camera every 5s
TEMP_DIR = "temp_videos"  # Uploaded videos
SNAPSHOT_DIR = "saved_snapshots"  # Detection images
```

### Detection Process:
```python
results = model(frame, imgsz=640, verbose=False)
for box in results.boxes:
    if confidence > 0.75 and className in ["fire", "smoke"]:
        if _should_send_snapshot(camera_id):
            # Save snapshot
            image_id = f"{uuid.uuid4()}.jpg"
            cv2.imwrite(snapshot_path, frame)
            
            # Call Next.js API
            requests.post(
                "http://localhost:3000/api/alerts/trigger",
                json={
                    "cameraId": camera_id,
                    "imageId": image_id,
                    "className": className,
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2]
                }
            )
```

---

## 🎨 Frontend Components

### 1. LandingPage.jsx
- Hero section with video background
- Feature cards
- Registration modals (owner/provider)
- Google Sign-In integration
- Role selection flow

### 2. OwnerDashboard.jsx
- **State Management:**
  - `houses` - Array of properties
  - `cameras` - Object `{ houseId: [cameras] }`
  - `alerts` - Array of alerts
  - `activeAlert` - Current alert with countdown
  - `alertCountdown` - 30-second timer

- **Features:**
  - Property management (add/view/edit houses)
  - Camera management (add/delete/start/stop)
  - Alert countdown modal (30s cancel window)
  - Demo mode (webcam or video upload)
  - Real-time polling (every 5 seconds)

### 3. AuthContext.js
- Firebase Auth state management
- Provides: `currentUser`, `loading`, `signInWithGoogle()`, `signOutUser()`

---

## ⚙️ Environment Variables (.env.local)

```env
# Firebase Admin (Server-Side)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_STORAGE_BUCKET=

# Firebase Client (Client-Side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# AI Service
GEMINI_API_KEY=
ENABLE_GEMINI=false
PYTHON_SERVICE_URL=http://127.0.0.1:8000
NEXTJS_API_URL=http://localhost:3000/api/alerts/trigger
DEFAULT_CAMERA_ID=default_camera_id

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
EMAIL_FROM=AgniShakti@example.com

# Security
SERVICE_KEY=your-secret-service-key
PROVIDER_SECRET=your-provider-secret
```

---

## 🚀 How to Run

### Development (Concurrent):
```bash
npm run dev
# Runs both Next.js (port 3000) and Python service (port 8000)
```

### Manual Start:
```bash
# Terminal 1 - Next.js
npm run dev:next

# Terminal 2 - Python
cd src/ai_backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
uvicorn ai_service:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔐 Security Features

1. **Service Key**: Python must provide `x-service-key` header to trigger alerts
2. **Provider Secret**: Fire station registration requires secret key
3. **Email Normalization**: All emails lowercase (prevents duplicates)
4. **Password Hashing**: bcrypt with 10 salt rounds
5. **Privacy Check**: AI checks for sensitive content in images
6. **Firebase Admin SDK**: Server-side secure access

---

## 📧 Email Notification Format

**To Owner:**
```
Subject: URGENT: Fire detected at your property (123 Main St)

Fire detected at 123 Main St, City, State
Timestamp: 2024-01-01 12:00:00

Open location in Google Maps:
http://maps.google.com/?q=40.7128,-74.0060

[View detection image]
```

**To Fire Station:**
```
Subject: ALERT: Fire at 123 Main St

Fire alert at 123 Main St
Owner: owner@example.com

Navigate:
http://maps.google.com/?q=40.7128,-74.0060

[View detection image]
```

---

## 🐛 Common Issues & Solutions

### 1. Firebase Error
**Problem:** "Firebase not initialized"
**Solution:** 
- Check all Firebase env vars in `.env.local`
- Escape newlines in private key: `\n`
- Restart Next.js server

### 2. No Fire Detection
**Problem:** Alerts not triggering
**Solution:**
- Check `best.pt` model exists in `src/ai_backend/`
- Verify camera ID is valid in Firestore
- Check confidence threshold (0.75)
- View Python service logs

### 3. Email Not Sending
**Problem:** SMTP error
**Solution:**
- Use Gmail App Password (not regular password)
- Check SMTP_PORT (587 for TLS)
- Test at: https://www.smtper.net/

### 4. Alert Not on Dashboard
**Problem:** Alert triggered but not visible
**Solution:**
- Check browser console for errors
- Verify polling running (every 5s)
- Check Firestore for alert document
- Ensure owner email matches

### 5. Image 404
**Problem:** Snapshot not loading
**Solution:**
- Check Python service running
- Verify `saved_snapshots/` directory exists
- Try direct URL: `http://localhost:8000/snapshots/image-id.jpg`

---

## 📊 Tech Stack Summary

### Frontend
- **Framework:** Next.js 15.5.3 (React 19.1.0)
- **Styling:** Tailwind CSS 4.1.13
- **Animations:** Framer Motion 12.23.16
- **Auth:** Firebase Auth + Google OAuth
- **HTTP:** Axios 1.12.2

### Backend (Next.js API)
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage
- **Email:** Nodemailer 7.0.6
- **Security:** bcryptjs 3.0.2
- **AI:** Google Gemini AI 0.24.1

### AI Service (Python)
- **Framework:** FastAPI
- **AI Model:** YOLOv8 (Ultralytics)
- **Deep Learning:** PyTorch (CUDA/CPU)
- **Vision:** OpenCV (cv2)

---

## 🎯 Key Features Summary

✅ **Real-time Fire Detection** - YOLOv8 AI model  
✅ **Automated Email Alerts** - Nodemailer + SMTP  
✅ **Multi-Property Support** - Owners can have multiple houses  
✅ **Multi-Camera Support** - Each house can have multiple cameras  
✅ **Role-Based Dashboards** - Separate for owners and providers  
✅ **Location-Based Response** - Haversine distance to nearest station  
✅ **Alert Countdown System** - 30-second cancellation window  
✅ **AI Verification** - Optional Gemini AI double-check  
✅ **Real-time Monitoring** - Start/stop from dashboard  
✅ **Demo Mode** - Test with webcam or uploaded videos  

---

## 📝 Important Notes

### Current Status:
- ✅ All core features implemented and working
- ✅ Fire detection AI trained and deployed
- ✅ Email notifications configured
- ✅ Dashboards fully functional
- ⚠️ Gemini AI verification currently bypassed (always returns fire detected)
- ⚠️ No WebSocket (using polling instead)

### Known Limitations:
- Polling-based alerts (5-second interval) instead of real-time WebSocket
- Demo mode only (no production RTSP camera support documented)
- Single language (English only)
- No mobile app (web only)

### Future Enhancements Planned:
- WebSocket for real-time alerts
- SMS notifications (Twilio)
- Mobile app (React Native)
- Historical analytics dashboard
- Multi-language support
- Dark mode

---

## 📚 Where to Find What

- **Full Documentation:** `README.md`
- **API Details:** `API_DOCUMENTATION.md`
- **This Summary:** `PROJECT_SUMMARY.md`
- **Environment Setup:** See `.env.local` section above
- **Database Schema:** See Firestore section above
- **Alert Flow:** See "How Fire Detection Works" section
- **Troubleshooting:** See "Common Issues" section

---

## 💡 Quick Tips for Development

1. **Always run both services:** Next.js (3000) + Python (8000)
2. **Check Firestore first** when debugging data issues
3. **View Python logs** for detection debugging
4. **Use browser console** for frontend errors
5. **Test emails with demo mode** before real cameras
6. **Check network tab** for API call failures
7. **Verify env vars** if anything doesn't work

---

## 🎓 Understanding the Flow (Simple)

**User Perspective:**
1. Sign in with Google → Choose role (owner/provider)
2. Add property with address + GPS coordinates
3. Add camera with stream URL
4. Click "Start Monitoring" on camera
5. System watches for fire/smoke
6. Alert appears on dashboard with 30s countdown
7. Can cancel within 30s or let timer expire
8. Emails sent to owner + fire station

**Technical Perspective:**
1. Camera monitoring enabled in Firestore
2. Python service processes video frames
3. YOLOv8 detects fire/smoke with 75%+ confidence
4. Python saves snapshot + calls Next.js API
5. Next.js creates alert in Firestore
6. Sends emails via Nodemailer
7. Frontend polls and shows countdown modal
8. User cancels or timer expires

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Production Ready (with noted limitations)

---

*This summary is designed to be copied into ChatGPT or any AI assistant to quickly provide full context about the AgniShakti project.*

