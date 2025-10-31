# AgniSetu - AI-Powered Fire Detection and Alert System

## 🔥 Project Overview

**AgniSetu** (meaning "Fire Bridge" in Sanskrit) is a comprehensive, AI-powered fire safety system that uses computer vision and YOLO (You Only Look Once) object detection to identify fire and smoke in real-time through camera feeds. When fire or smoke is detected, the system automatically alerts property owners and nearby fire stations via email, enabling rapid emergency response.

### Key Features
- 🎥 **Real-time Fire Detection**: Uses YOLOv8 custom-trained model to detect fire and smoke
- 🚨 **Automated Alerting**: Sends email notifications to owners and fire stations
- 🏠 **Multi-Property Management**: Property owners can monitor multiple houses/properties
- 📹 **Multi-Camera Support**: Each property can have multiple surveillance cameras
- 🔐 **Role-Based Access**: Separate dashboards for property owners and fire station providers
- 🗺️ **Location-Based Response**: Automatically finds and notifies nearest fire stations
- ⏱️ **Alert Countdown System**: 30-second cancellation window for false alarms
- 🧠 **AI Verification**: Optional Gemini AI double-check for detection accuracy
- 📊 **Real-time Monitoring**: Start/stop camera monitoring from dashboard
- 🎬 **Demo Mode**: Test fire detection with webcam or uploaded videos

---+*11111

## 📁 Project Structure

```
agnishakti/
├── src/
│   ├── ai_backend/               # Python FastAPI AI Service
│   │   ├── ai_service.py         # Main FastAPI application
│   │   ├── best.pt               # Custom YOLOv8 trained model
│   │   ├── yolov8s.pt            # Standard YOLOv8 model
│   │   ├── temp_videos/          # Temporary uploaded video storage
│   │   ├── saved_snapshots/      # Fire detection snapshots
│   │   └── venv/                 # Python virtual environment
│   │
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes (Backend Endpoints)
│   │   │   ├── alerts/
│   │   │   │   ├── trigger/route.js      # Trigger fire alert
│   │   │   │   ├── verify/route.js       # Verify with Gemini AI
│   │   │   │   ├── cancel/route.js       # Cancel alert
│   │   │   │   ├── active/route.js       # Get active alerts
│   │   │   │   └── route.js              # Get all alerts
│   │   │   ├── auth/
│   │   │   │   ├── login/route.js        # User login
│   │   │   │   └── register/route.js     # User registration
│   │   │   ├── cameras/
│   │   │   │   └── route.js              # Camera CRUD operations
│   │   │   ├── houses/
│   │   │   │   ├── [id]/route.js         # Single house operations
│   │   │   │   ├── verify-password/route.js
│   │   │   │   └── route.js              # Houses CRUD
│   │   │   ├── monitoring/
│   │   │   │   ├── start/route.js        # Start camera monitoring
│   │   │   │   └── stop/route.js         # Stop camera monitoring
│   │   │   ├── provider/
│   │   │   │   └── dashboard/route.js    # Provider dashboard data
│   │   │   ├── stations/
│   │   │   │   └── register/route.js     # Fire station registration
│   │   │   ├── snapshots/
│   │   │   │   └── [imageId]/route.js    # Serve detection images
│   │   │   ├── health/route.js           # Health check
│   │   │   └── test-*.js                 # Test endpoints
│   │   │
│   │   ├── owner-dashboard/
│   │   │   └── page.js           # Owner dashboard page
│   │   ├── provider/
│   │   │   └── dashboard/page.js # Provider dashboard page
│   │   ├── signin/
│   │   │   └── page.js           # Sign-in page
│   │   ├── backend.js            # Core backend functions
│   │   ├── layout.js             # Root layout
│   │   ├── page.js               # Landing page
│   │   └── globals.css           # Global styles
│   │
│   ├── components/               # React Components
│   │   ├── LandingPage.jsx       # Landing page with features
│   │   ├── OwnerDashboard.jsx    # Owner dashboard component
│   │   └── SignIn.js             # Google Sign-In component
│   │
│   ├── context/                  # React Context
│   │   └── AuthContext.js        # Firebase Auth context
│   │
│   └── lib/                      # Utility Libraries
│       ├── apiClient.js          # Axios API client
│       ├── firebase.js           # Firebase Admin (server-side)
│       ├── firebaseClient.js     # Firebase Client (client-side)
│       └── mailer.js             # Email utilities
│
├── public/                       # Static Assets
│   ├── uploads/                  # Uploaded detection images
│   └── *.svg                     # Icons and images
│
├── package.json                  # Node.js dependencies
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.mjs            # PostCSS config
├── eslint.config.mjs             # ESLint config
├── .env.local                    # Environment variables (create this!)
├── README.md                     # This file
└── API_DOCUMENTATION.md          # Detailed API docs
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.5.3 (React 19.1.0) with App Router
- **Styling**: Tailwind CSS 4.1.13
- **Animations**: Framer Motion 12.23.16
- **Icons**: Lucide React 0.544.0
- **HTTP Client**: Axios 1.12.2
- **Authentication**: Firebase Auth with Google OAuth

### Backend (Next.js API Routes)
- **Runtime**: Node.js
- **Database**: Firebase Firestore (NoSQL)
- **Storage**: Firebase Storage (for detection images)
- **Email**: Nodemailer 7.0.6 (SMTP)
- **Security**: bcryptjs 3.0.2 (password hashing)
- **AI**: Google Gemini AI (@google/generative-ai 0.24.1)

### AI Service (Python)
- **Framework**: FastAPI
- **Computer Vision**: Ultralytics YOLOv8
- **Deep Learning**: PyTorch (CUDA/CPU)
- **Image Processing**: OpenCV (cv2)
- **HTTP Client**: requests

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** 18+ and npm/yarn
2. **Python** 3.8+ with pip
3. **Firebase** project with Firestore and Storage
4. **Google Gemini API** key (optional)
5. **SMTP Email** service (Gmail, SendGrid, etc.)

### Installation

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd agnishakti
```

#### 2. Install Node.js Dependencies
```bash
npm install
# or
yarn install
```

#### 3. Setup Python Virtual Environment
```bash
cd src/ai_backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### 4. Install Python Dependencies
```bash
pip install fastapi uvicorn ultralytics opencv-python torch python-dotenv requests
```

#### 5. Configure Environment Variables

Create `.env.local` in the project root:

```env
# ============================================
# FIREBASE CONFIGURATION (Server-Side Admin)
# ============================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# ============================================
# FIREBASE CONFIGURATION (Client-Side)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ============================================
# AI SERVICE CONFIGURATION
# ============================================
GEMINI_API_KEY=your-gemini-api-key
ENABLE_GEMINI=false
PYTHON_SERVICE_URL=http://127.0.0.1:8000
NEXTJS_API_URL=http://localhost:3000/api/alerts/trigger
DEFAULT_CAMERA_ID=default_camera_id

# ============================================
# EMAIL CONFIGURATION (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_SECURE=false
EMAIL_FROM=agnisetu@example.com

# ============================================
# SECURITY
# ============================================
SERVICE_KEY=your-secret-service-key-here
PROVIDER_SECRET=your-provider-secret-key-here
```

**Note**: For Python service to access these variables, copy the same values to `src/ai_backend/.env` or set them as system environment variables.

#### 6. Setup Firebase
1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Firestore Database**
3. Enable **Firebase Storage**
4. Enable **Google Authentication** in Firebase Auth
5. Download service account key (JSON) for admin credentials
6. Copy credentials to `.env.local`

---

## 🎯 Running the Application

### Development Mode (Concurrent)

The project includes a script to run both services simultaneously:

```bash
npm run dev
```

This runs:
- Next.js frontend: http://localhost:3000
- Python AI service: http://localhost:8000

### Manual Start (Separate Terminals)

**Terminal 1 - Next.js App:**
```bash
npm run dev:next
```

**Terminal 2 - Python AI Service:**
```bash
npm run dev:python
# or manually:
cd src/ai_backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
uvicorn ai_service:app --host 0.0.0.0 --port 8000 --reload
```

### Production Build
```bash
npm run build
npm start
```

---

## 🗄️ Database Schema (Firestore)

### Automatic Collection Creation

**Important**: Firestore collections are automatically created when the first document is written to them. You don't need to manually create any collections - they will be initialized automatically when you:
- Register a user (creates `users` collection)
- Add a house (creates `houses` collection)
- Add a camera (creates `cameras` collection)
- Register a fire station (creates `fireStations` collection)
- Trigger an alert (creates `alerts` collection)

### Collections Structure

#### 1. **users** Collection
```javascript
Document ID: "user@example.com" (normalized email)
{
  name: "John Doe",
  email: "user@example.com",
  role: "owner" | "provider",
  assignedStations: ["station_id_1", "station_id_2"], // For providers
  createdAt: Timestamp
}
```

#### 2. **houses** Collection
```javascript
Document ID: Auto-generated
{
  houseId: "house_id",
  ownerEmail: "owner@example.com",
  address: "123 Main Street, City, State",
  coords: {
    lat: 40.7128,
    lng: -74.0060
  },
  nearestFireStationId: "station_id", // Automatically calculated on creation by comparing house coords to all fire stations
  monitoringEnabled: true,
  monitorPasswordHash: "bcrypt_hashed_password",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 3. **cameras** Collection
```javascript
Document ID: Auto-generated
{
  cameraId: "camera_id",
  houseId: "house_id",
  label: "Front Door Camera",
  source: "rtsp://192.168.1.100:554/stream",
  streamType: "rtsp" | "usb" | "webrtc" | "other",
  isMonitoring: false,
  createdAt: Timestamp,
  lastSeen: Timestamp
}
```

#### 4. **fireStations** Collection
```javascript
Document ID: Auto-generated
{
  stationId: "station_id",
  name: "Central Fire Station",
  address: "456 Fire St, City",
  phone: "+1-555-0123",
  email: "station@fire.dept",
  coords: {
    lat: 40.7200,
    lng: -74.0100
  },
  providerEmail: "provider@fire.dept",
  createdAt: Timestamp
}
```

#### 5. **alerts** Collection
```javascript
Document ID: Auto-generated
{
  alertId: "alert_id",
  cameraId: "camera_id",
  houseId: "house_id",
  detectedClass: "fire" | "smoke",
  confidence: 0.95,
  bbox: [x1, y1, x2, y2],
  status: "PENDING" | "CONFIRMED" | "NOTIFIED" | "CANCELLED",
  timestamp: Timestamp,
  detectionImage: "http://localhost:8000/snapshots/uuid.jpg",
  geminiCheck: {
    isFire: true,
    score: 0.95,
    reason: "Clear fire detected",
    sensitive: false,
    sensitiveReason: "No sensitive content"
  },
  sentEmails: {
    ownerSent: true,
    stationSent: true
  },
  canceledBy: "user@example.com",
  cancelNote: "False alarm",
  canceledAt: Timestamp
}
```

---

## 🔌 API Endpoints Reference

### Authentication

#### POST `/api/auth/register`
Register a new user (owner or provider)

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "owner"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "success": true,
    "email": "user@example.com"
  }
}
```

**Backend Function:** `registerUser({ name, email, role })`
- Creates/updates user document in `users` collection
- Normalizes email to lowercase
- Sets server timestamp

---

#### POST `/api/auth/login`
Authenticate and retrieve user information

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Backend Function:** `getUserByEmail(email)`
- Retrieves user from Firestore
- Returns `null` if not found

---

### House Management

#### POST `/api/houses`
Create a new house/property. The nearest fire station is automatically calculated based on GPS coordinates.

**Request:**
```json
{
  "ownerEmail": "owner@example.com",
  "address": "123 Main Street, City, State",
  "coords": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "monitorPassword": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "houseId": "generated_house_id"
}
```

**Backend Function:** `createHouse({ ownerEmail, address, coords, monitorPassword })`
- Creates document in `houses` collection
- Hashes monitor password with bcrypt
- Auto-generates unique house ID
- **Automatically calculates and assigns the nearest fire station** by comparing house coords to all fire stations using the Haversine distance formula
- Sets monitoring enabled to `true` by default

---

#### GET `/api/houses?ownerEmail=owner@example.com`
Get all houses for an owner

**Response:**
```json
{
  "success": true,
  "houses": [
    {
      "houseId": "house_id",
      "ownerEmail": "owner@example.com",
      "address": "123 Main Street",
      "coords": {"lat": 40.7128, "lng": -74.0060},
      "nearestFireStationId": "station_id",
      "monitoringEnabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Backend Function:** `getHousesByOwnerEmail(ownerEmail)`
- Queries `houses` collection by owner email
- Returns array of all owned houses

---

#### GET `/api/houses/[id]`
Get specific house by ID

**Response:**
```json
{
  "success": true,
  "house": {
    "houseId": "house_id",
    "ownerEmail": "owner@example.com",
    "address": "123 Main Street",
    "coords": {"lat": 40.7128, "lng": -74.0060},
    "nearestFireStationId": "station_id",
    "monitoringEnabled": true
  }
}
```

**Backend Function:** `getHouseById(houseId)`

---

#### PATCH `/api/houses/[id]`
Update house properties

**Request:**
```json
{
  "address": "Updated address",
  "coords": {"lat": 40.7200, "lng": -74.0100},
  "nearestFireStationId": "new_station_id",
  "monitoringEnabled": false
}
```

**Response:**
```json
{
  "success": true
}
```

**Backend Function:** `updateHouse(houseId, updates)`
- Merges updates into existing document
- Sets `updatedAt` timestamp

---

#### DELETE `/api/houses/[id]`
Delete a house

**Response:**
```json
{
  "success": true,
  "message": "House house_id deleted."
}
```

**Backend Function:** `deleteHouse(houseId)`
- Permanently deletes house document

---

#### POST `/api/houses/verify-password`
Verify monitoring password for a house

**Request:**
```json
{
  "houseId": "house_id",
  "password": "candidate_password"
}
```

**Response:**
```json
{
  "success": true
}
```

**Backend Function:** `verifyHousePassword(houseId, candidatePassword)`
- Uses bcrypt to compare passwords
- Returns boolean success

---

### Camera Management

#### POST `/api/cameras`
Add a new camera to a house

**Request:**
```json
{
  "ownerEmail": "owner@example.com",
  "cameraName": "Front Door Camera",
  "streamUrl": "rtsp://192.168.1.100:554/stream"
}
```

**Response:**
```json
{
  "success": true,
  "camera": {
    "success": true,
    "cameraId": "generated_camera_id"
  }
}
```

**Backend Function:** `addCamera({ houseId, label, source, streamType })`
- Finds first house by owner email
- Creates camera document in `cameras` collection
- Sets `isMonitoring: false` by default

---

#### GET `/api/cameras?ownerEmail=owner@example.com`
Get all cameras for an owner

**Response:**
```json
{
  "success": true,
  "cameras": [
    {
      "cameraId": "camera_id",
      "houseId": "house_id",
      "label": "Front Door Camera",
      "source": "rtsp://192.168.1.100:554/stream",
      "streamType": "rtsp",
      "isMonitoring": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Backend Function:** `getCamerasByOwnerEmail(ownerEmail)`
- Gets all houses for owner
- Queries cameras for all house IDs
- Uses chunking for Firestore `in` query limit (10 items)

---

#### DELETE `/api/cameras`
Remove a camera

**Request:**
```json
{
  "cameraId": "camera_id"
}
```

**Response:**
```json
{
  "success": true
}
```

**Backend Function:** `deleteCamera(cameraId)`
- Permanently deletes camera document

---

### Monitoring Control

#### POST `/api/monitoring/start`
Start monitoring a camera

**Request:**
```json
{
  "cameraId": "camera_id"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true
  }
}
```

**Backend Function:** `startMonitoring(cameraId)`
- Sets `isMonitoring: true` on camera document
- Updates `updatedAt` timestamp

---

#### POST `/api/monitoring/stop`
Stop monitoring a camera

**Request:**
```json
{
  "cameraId": "camera_id"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true
  }
}
```

**Backend Function:** `stopMonitoring(cameraId)`
- Sets `isMonitoring: false` on camera document

---

### Alert Management

#### POST `/api/alerts/trigger`
Trigger a fire detection alert (called by Python AI service)

**Headers:**
```
x-service-key: your_service_key
```

**Request:**
```json
{
  "cameraId": "camera_id",
  "imageId": "uuid.jpg",
  "className": "fire",
  "confidence": 0.95,
  "bbox": [x1, y1, x2, y2]
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "ok": true,
    "alertId": "alert_id",
    "status": "NOTIFIED",
    "gemini": {
      "isFire": true,
      "score": 0.95,
      "reason": "Clear fire detected",
      "sensitive": false,
      "sensitiveReason": "No sensitive content"
    }
  }
}
```

**Backend Function:** `triggerAlert(payload)`

**Complex Workflow:**
1. Validates service key for security
2. Retrieves camera and associated house
3. Creates alert document with `PENDING` status
4. Constructs image URL: `${PYTHON_SERVICE_URL}/snapshots/${imageId}`
5. Runs Gemini AI verification (currently bypassed - always returns fire detected)
6. If verified, updates status to `CONFIRMED`
7. Finds owner and nearest fire station
8. Sends email notifications with GPS links and detection images
9. Updates status to `NOTIFIED`
10. Returns alert details

**Email Format:**
- **Subject**: URGENT: Fire detected at your property
- **Body**: Includes address, timestamp, GPS link
- **Attachment**: Detection image (unless flagged sensitive)

---

#### POST `/api/alerts/verify`
Verify detection with Gemini AI

**Request:**
```json
{
  "imageUrl": "http://localhost:8000/snapshots/uuid.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "isFire": true,
    "score": 0.95,
    "reason": "Clear fire detected",
    "sensitive": false,
    "sensitiveReason": "No sensitive content"
  }
}
```

**Backend Function:** `verifyWithGemini({ imageUrl })`
- **Currently bypassed**: Always returns `isFire: true, score: 0.95`
- Can be re-enabled for AI double-check

---

#### POST `/api/alerts/cancel`
Cancel an active alert

**Request:**
```json
{
  "alertId": "alert_id"
}
```

**Response:**
```json
{
  "success": true
}
```

**Backend Function:** `cancelAlert({ alertId, canceledByEmail, note })`
- Updates alert status to `CANCELLED`
- Records cancellation details and timestamp

---

#### GET `/api/alerts/active?ownerEmail=owner@example.com`
Get active alerts for an owner

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "alertId": "alert_id",
      "cameraId": "camera_id",
      "houseId": "house_id",
      "status": "CONFIRMED",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "detectionImage": "http://localhost:8000/snapshots/uuid.jpg"
    }
  ]
}
```

**Backend Function:** `getActiveAlertsForOwner(ownerEmail)`
- Retrieves all houses for owner
- Queries alerts with status: `PENDING`, `CONFIRMED`, or `NOTIFIED`

---

#### GET `/api/snapshots/[imageId]`
Serve detection image (proxy to Python service)

**URL:** `/api/snapshots/uuid.jpg`

**Response:** 
- **Success**: Image file (JPEG)
- **404**: Image not found
- **503**: Python service unavailable

**How it works:**
- Fetches image from Python service: `http://localhost:8000/snapshots/${imageId}`
- Returns with proper caching headers (`Cache-Control: public, max-age=3600`)
- Provides fallback access if direct Python service access blocked

---

### Provider/Fire Station

#### POST `/api/stations/register`
Register a new fire station and provider

**Headers:**
```
x-provider-secret: your_provider_secret_key
```

**Request:**
```json
{
  "email": "provider@firestation.com",
  "name": "John Firefighter",
  "stationName": "Central Fire Station",
  "stationAddress": "123 Fire St, City",
  "stationPhone": "+1-555-0123",
  "coords": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

**Response:**
```json
{
  "success": true,
  "userEmail": "provider@firestation.com",
  "stationId": "generated_station_id"
}
```

**Backend Function:** `registerFireStation({ email, name, stationName, stationAddress, stationPhone, coords })`

**Multi-step Process:**
1. **Automatically creates or updates user** in `users` collection with `role: 'provider'`
   - If user already exists, only updates role and name (preserves `createdAt`)
   - If user doesn't exist, creates new user with all details
2. Creates fire station document in `fireStations` collection
3. Links station ID to provider's `assignedStations` array

**Note:** This endpoint handles both user creation and station registration, so you can directly register fire stations via Postman without pre-creating the user.

---

#### GET `/api/provider/dashboard?providerEmail=provider@example.com`
Get dashboard data for fire station provider

**Response:**
```json
{
  "success": true,
  "dashboard": [
    {
      "houseId": "house_id",
      "ownerEmail": "owner@example.com",
      "address": "123 Main St",
      "coords": {"lat": 40.7128, "lng": -74.0060},
      "nearestFireStationId": "station_id",
      "monitoringEnabled": true,
      "activeAlerts": [
        {
          "alertId": "alert_id",
          "status": "CONFIRMED",
          "timestamp": "2024-01-01T00:00:00.000Z",
          "detectionImage": "url"
        }
      ]
    }
  ]
}
```

**Backend Function:** `getProviderDashboardData(providerEmail)`
- Retrieves provider's assigned stations
- Finds all houses within coverage area
- Includes active alerts for each house

---

### System

#### GET `/api/health`
Health check endpoint

**Response:**
```json
{
  "ok": true
}
```

---

## 🐍 Python AI Service API

### Base URL: `http://localhost:8000`

#### POST `/upload_video`
Upload a video file for processing

**Form Data:**
- `video`: Video file (multipart/form-data)

**Response:**
```json
{
  "filename": "uuid_filename.mp4"
}
```

---

#### POST `/upload_video/{camera_id}`
Upload video for specific camera (for demo/testing)

**URL:** `/upload_video/camera_id_123`

**Form Data:**
- `video`: Video file

**Response:**
```json
{
  "filename": "camera_id_uuid_filename.mp4",
  "camera_id": "camera_id_123",
  "original_filename": "fire-video.mp4",
  "uploaded_at": null
}
```

---

#### GET `/video_feed/{video_name}`
Stream processed video with fire detection

**URL:** `/video_feed/uuid_filename.mp4`

**Response:** Video stream (multipart/x-mixed-replace)

---

#### GET `/video_feed/{camera_id}/{video_name}`
Stream video for specific camera

**URL:** `/video_feed/camera_id/uuid_filename.mp4`

**Response:** Video stream with fire detection overlays

---

#### GET `/webcam_feed`
Stream from laptop webcam (index 0)

**Response:** Live webcam stream with fire detection

---

#### GET `/snapshots/{image_id}`
Serve saved detection images

**URL:** `/snapshots/uuid.jpg`

**Response:** 
- **Success**: JPEG image file
- **404**: Image not found

**Storage Location:** `src/ai_backend/saved_snapshots/`

---

## 🧠 Backend Functions (src/app/backend.js)

### User Management

#### `normalizeEmail(email)`
Normalizes email to lowercase and trims whitespace
```javascript
normalizeEmail("User@Example.COM") // => "user@example.com"
```

#### `registerUser({ name, email, role })`
Creates or updates user document
- **Collection**: `users` (auto-created on first write)
- **Document ID**: Normalized email
- **Sets**: `createdAt` timestamp only for new users (preserves existing timestamp for updates)
- **Merge behavior**: Uses `merge: true` to update existing users without overwriting all fields

#### `getUserByEmail(email)`
Retrieves user by email
- **Returns**: User object or `null`

#### `assignRole(email, role)`
Updates user role
- **Roles**: `"owner"` or `"provider"`

#### `assignStationToProvider(providerEmail, stationId)`
Links fire station to provider
- **Updates**: `assignedStations` array (arrayUnion)

---

### House Management

#### `createHouse({ ownerEmail, address, coords, monitorPassword })`
Creates new house
- **Hashes** monitor password with bcrypt (salt rounds: 10)
- **Generates** unique house ID
- **Automatically calculates** nearest fire station by calling `findNearestFireStation(coords)` and assigns the `stationId`
- **Sets** `monitoringEnabled: true` by default

#### `getHousesByOwnerEmail(ownerEmail)`
Gets all houses for owner
- **Query**: `where("ownerEmail", "==", email)`

#### `getHouseById(houseId)`
Gets specific house by ID

#### `updateHouse(houseId, updates)`
Partial update of house properties
- **Merge**: true (preserves existing fields)
- **Sets**: `updatedAt` timestamp

#### `setHouseMonitorPassword(houseId, newPassword)`
Updates monitor password
- **Hashes** new password with bcrypt

#### `verifyHousePassword(houseId, candidatePassword)`
Verifies password against hash
- **Returns**: boolean

#### `deleteHouse(houseId)`
Permanently deletes house document

---

### Camera Management

#### `addCamera({ houseId, label, source, streamType })`
Creates new camera
- **Stream Types**: `"rtsp"`, `"usb"`, `"webrtc"`, `"other"`
- **Default**: `isMonitoring: false`

#### `getCamerasByHouse(houseId)`
Gets all cameras for a house

#### `getCamerasByOwnerEmail(ownerEmail)`
Gets all cameras for owner across all houses
- **Uses chunking** for Firestore `in` query limit

#### `updateCamera(cameraId, updates)`
Updates camera properties

#### `deleteCamera(cameraId)`
Permanently deletes camera

#### `startMonitoring(cameraId)`
Enables monitoring
- **Sets**: `isMonitoring: true`

#### `stopMonitoring(cameraId)`
Disables monitoring
- **Sets**: `isMonitoring: false`

---

### Fire Station Management

#### `addFireStation(station)`
Creates fire station document
- **Collection**: `fireStations` (auto-created on first write)
- **Generates** unique station ID

#### `registerFireStation({ email, name, stationName, stationAddress, stationPhone, coords })`
Complete provider registration flow (handles everything automatically)
1. **Creates or updates user** as provider in `users` collection
   - Checks if user exists first
   - Preserves `createdAt` for existing users
2. **Creates fire station** in `fireStations` collection
3. **Links station** to provider's `assignedStations` array
- **Use case**: Can be called directly from Postman without pre-creating the user

#### `findNearestFireStation({ lat, lng })`
Finds closest station using Haversine formula
- **Calculates** distance in kilometers
- **Returns** nearest station object

#### `getProviderAssignedStations(providerEmail)`
Gets station IDs assigned to provider
- **Returns** array of station IDs

#### `getProviderDashboardData(providerEmail)`
Gets comprehensive dashboard data
- **Includes** houses and active alerts

---

### Alert System

#### `triggerAlert(payload)`
Complete alert workflow
- **Validates** service key
- **Creates** alert document
- **Runs** AI verification
- **Sends** email notifications
- **Updates** alert status

#### `cancelAlert({ alertId, canceledByEmail, note })`
Cancels active alert
- **Records** cancellation details

#### `getActiveAlertsForOwner(ownerEmail)`
Gets pending/confirmed alerts
- **Statuses**: `PENDING`, `CONFIRMED`, `NOTIFIED`

#### `getAlertsByOwnerEmail(ownerEmail)`
Gets all alerts for owner
- **Includes** all statuses

---

### Utility Functions

#### `haversineKm(lat1, lon1, lat2, lon2)`
Calculates distance between coordinates
- **Formula**: Haversine
- **Returns**: Distance in kilometers

#### `uploadSnapshotBase64({ base64Image, destinationPath })`
Saves base64 image to local storage
- **Directory**: `/public/uploads/`
- **Returns**: Public URL path

#### `sendAlertEmail({ toEmail, subject, textBody, htmlBody, imageUrl })`
Sends email via SMTP
- **Uses**: Nodemailer
- **Supports**: HTML body and image links

#### `verifyWithGemini({ imageUrl })`
AI-powered fire verification
- **Currently bypassed**: Always returns `isFire: true`
- **Can enable** for actual Gemini AI checks

---

## 🎨 Frontend Components

### 1. LandingPage.jsx
**Location:** `src/components/LandingPage.jsx`

**Features:**
- Hero section with animated background video
- Feature cards with icons and descriptions
- Registration modals for owners and providers
- Google Sign-In integration
- Role selection flow

**User Flow:**
1. User clicks "Secure My Property" or "Join as Responder"
2. If not logged in, redirects to Google Sign-In
3. After sign-in, shows role-specific registration modal
4. On registration, redirects to appropriate dashboard

**Modals:**
- `choose-role`: Role selection
- `owner-register`: Owner registration
- `provider-register`: Provider registration (requires secret password)
- `login`: Login flow

---

### 2. OwnerDashboard.jsx
**Location:** `src/components/OwnerDashboard.jsx`

**Features:**
- **Property Management**: View, add, edit houses
- **Camera Management**: Add, delete, start/stop monitoring
- **Alert System**: 30-second countdown with cancel option
- **Demo Mode**: Test with webcam or uploaded videos
- **Real-time Updates**: Polls for alerts every 5 seconds

**Views:**
- **Houses Overview**: Grid of all properties
- **Camera Management**: Camera controls for selected house
- **Alert Modal**: Full-screen fire alert with countdown

**Demo Controls:**
- **Use Webcam**: Start monitoring from laptop camera
- **Upload Video**: Process pre-recorded fire videos

**State Management:**
```javascript
- houses: Array of house objects
- cameras: Object { houseId: [camera1, camera2] }
- alerts: Array of alert objects
- selectedHouse: Currently viewing house
- activeAlert: Alert triggering countdown
- alertCountdown: 30 seconds timer
```

---

### 3. SignIn.js
**Location:** `src/components/SignIn.js`

**Features:**
- Google OAuth authentication
- Firebase Auth integration
- Responsive design

---

### 4. AuthContext.js
**Location:** `src/context/AuthContext.js`

**Features:**
- Firebase Auth state management
- Google Sign-In function
- Sign-Out function
- Provides `currentUser` and `loading` state

**Usage:**
```javascript
const { currentUser, loading, signInWithGoogle, signOutUser } = useAuth();
```

---

## 🔐 Security Features

### 1. Service Key Authentication
Python AI service must provide valid `x-service-key` header to trigger alerts
```javascript
if (serviceKey !== process.env.SERVICE_KEY) {
  throw { status: 401, message: "Invalid service key" };
}
```

### 2. Provider Secret
Fire station registration requires secret key in `x-provider-secret` header

### 3. Email Normalization
All emails converted to lowercase to prevent duplicates
```javascript
normalizeEmail("User@Example.COM") // => "user@example.com"
```

### 4. Password Hashing
Monitor passwords hashed with bcrypt (10 salt rounds)
```javascript
const hash = bcrypt.hashSync(password, 10);
```

### 5. Privacy Protection
AI checks for sensitive content in images
- If sensitive, image not attached to emails

### 6. Firebase Security
Server-side admin SDK for secure database access

---

## 📧 Email Notification System

### SMTP Configuration
Uses Nodemailer with SMTP (Gmail, SendGrid, etc.)

**Setup (Gmail):**
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Email Template

**To Owner:**
```
Subject: URGENT: Fire detected at your property (123 Main St)

Dear John Doe,

We detected fire at your property (123 Main St, City, State) 
at 2024-01-01T12:00:00.000Z.

Open location in Google Maps:
http://maps.google.com/?q=40.7128,-74.0060

[View detection image]
```

**To Fire Station:**
```
Subject: ALERT: Fire at 123 Main St

Fire alert at 123 Main St

House owner: owner@example.com

Navigate:
http://maps.google.com/?q=40.7128,-74.0060

[View detection image]
```

---

## 🤖 AI Detection System

### YOLOv8 Custom Model
**Model File:** `src/ai_backend/best.pt`

**Training:**
- Dataset: Custom fire and smoke images
- Architecture: YOLOv8
- Classes: `["fire", "smoke"]`

**Detection Parameters:**
```python
results = model(frame, imgsz=640, verbose=False)
CONFIDENCE_THRESHOLD = 0.75
```

### Detection Flow

1. **Frame Capture**: Read frame from video/camera
2. **YOLO Inference**: Run model on frame
3. **Bounding Box**: Draw rectangles around detections
4. **Confidence Check**: Only trigger if `confidence > 0.75`
5. **Throttling**: Max 1 snapshot per camera every 5 seconds
6. **Alert Trigger**: Call Next.js API with detection data
7. **Image Storage**: Save snapshot locally in `saved_snapshots/`

### Snapshot Throttling
Prevents spam alerts:
```python
SNAPSHOT_THROTTLE_SECONDS = 5
_last_snapshot_epoch_by_camera = {}

def _should_send_snapshot(camera_id):
    now = time.time()
    last = _last_snapshot_epoch_by_camera.get(camera_id, 0)
    if now - last >= SNAPSHOT_THROTTLE_SECONDS:
        _last_snapshot_epoch_by_camera[camera_id] = now
        return True
    return False
```

---

## 🚨 Alert Workflow (Complete Flow)

### Step-by-Step Process

#### 1. Detection (Python Service)
```python
# ai_service.py - infer_and_draw()
if name in ["fire", "smoke"] and conf > 0.75:
    if _should_send_snapshot(camera_id):
        send_alert_to_backend(frame, name, conf, bbox, camera_id)
```

#### 2. Save Snapshot
```python
# Generate unique ID
image_id = f"{uuid.uuid4()}.jpg"
snapshot_path = os.path.join(SNAPSHOT_DIR, image_id)
cv2.imwrite(snapshot_path, frame)
```

#### 3. Call Next.js API
```python
payload = {
    "serviceKey": os.getenv("SERVICE_KEY"),
    "cameraId": camera_id,
    "className": className,
    "confidence": confidence,
    "bbox": bbox,
    "imageId": image_id
}
requests.post(
    "http://localhost:3000/api/alerts/trigger",
    json=payload,
    headers={"x-service-key": SERVICE_KEY}
)
```

#### 4. Backend Processing (Next.js)
```javascript
// /api/alerts/trigger/route.js
export async function POST(req) {
  const payload = await req.json();
  const alert = await triggerAlert(payload);
  return NextResponse.json({ success: true, alert });
}
```

#### 5. Alert Document Creation
```javascript
// backend.js - triggerAlert()
const alertRef = db.collection("alerts").doc();
await alertRef.set({
  alertId,
  cameraId,
  houseId,
  detectedClass: className,
  confidence,
  bbox,
  status: "PENDING",
  timestamp: admin.firestore.FieldValue.serverTimestamp()
});
```

#### 6. Image URL Construction
```javascript
const pythonServiceUrl = process.env.PYTHON_SERVICE_URL;
const snapshotUrl = `${pythonServiceUrl}/snapshots/${imageId}`;
await alertRef.set({ detectionImage: snapshotUrl }, { merge: true });
```

#### 7. AI Verification (Optional)
```javascript
const geminiRes = await verifyWithGemini({ imageUrl: snapshotUrl });
// Currently bypassed - always returns isFire: true
```

#### 8. Status Update
```javascript
if (geminiRes.isFire) {
  await alertRef.set({ 
    status: "CONFIRMED", 
    geminiCheck: geminiRes 
  }, { merge: true });
}
```

#### 9. Find Recipients
```javascript
// Get house owner
const ownerDoc = await db.collection("users").doc(house.ownerEmail).get();
const owner = ownerDoc.data();

// Find nearest fire station
let station = null;
if (house.nearestFireStationId) {
  const sDoc = await db.collection("fireStations").doc(house.nearestFireStationId).get();
  station = sDoc.data();
} else {
  station = await findNearestFireStation(house.coords);
}
```

#### 10. Send Email Notifications
```javascript
// Email to owner
await sendAlertEmail({
  toEmail: owner.email,
  subject: `URGENT: Fire detected at ${house.address}`,
  htmlBody: `<p>Fire detected at ${house.address}</p>...`,
  imageUrl: snapshotUrl
});

// Email to fire station
await sendAlertEmail({
  toEmail: station.email,
  subject: `ALERT: Fire at ${house.address}`,
  htmlBody: `<p>Fire alert at ${house.address}</p>...`,
  imageUrl: snapshotUrl
});
```

#### 11. Final Status Update
```javascript
await alertRef.set({
  status: "NOTIFIED",
  sentEmails: {
    ownerSent: true,
    stationSent: true
  }
}, { merge: true });
```

#### 12. Frontend Alert Display
```javascript
// OwnerDashboard.jsx - pollAlerts()
const pollAlerts = async () => {
  const response = await fetch(`/api/alerts?ownerEmail=${email}`);
  const { alerts } = await response.json();
  
  const latestAlert = alerts.find(a => a.status === 'PENDING' || a.status === 'CONFIRMED');
  if (latestAlert && !activeAlert) {
    startAlertCountdown(latestAlert);
  }
};
```

#### 13. Countdown Timer
```javascript
const startAlertCountdown = (alertData) => {
  setActiveAlert(alertData);
  setAlertCountdown(30);
  
  alertInterval.current = setInterval(() => {
    setAlertCountdown(prev => {
      if (prev <= 1) {
        clearInterval(alertInterval.current);
        setActiveAlert(null);
        showToast('Emergency services have been notified!');
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};
```

#### 14. User Cancellation (Optional)
```javascript
const cancelAlert = () => {
  clearInterval(alertInterval.current);
  
  await fetch('/api/alerts/cancel', {
    method: 'POST',
    body: JSON.stringify({ alertId: activeAlert.alertId })
  });
  
  setActiveAlert(null);
  setAlertCountdown(0);
};
```

---

## 🧪 Testing the System

### 1. Test User Registration
```bash
# Owner registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "name": "John Owner",
    "role": "owner"
  }'
```

### 2. Test House Creation
```bash
curl -X POST http://localhost:3000/api/houses \
  -H "Content-Type: application/json" \
  -d '{
    "ownerEmail": "owner@example.com",
    "address": "123 Test St",
    "coords": {"lat": 40.7128, "lng": -74.0060},
    "monitorPassword": "test123"
  }'
```

### 3. Test Camera Addition
```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "ownerEmail": "owner@example.com",
    "cameraName": "Test Camera",
    "streamUrl": "rtsp://test"
  }'
```

### 4. Test Alert Trigger
```bash
curl -X POST http://localhost:3000/api/alerts/trigger \
  -H "Content-Type: application/json" \
  -H "x-service-key: your-service-key" \
  -d '{
    "cameraId": "your-camera-id",
    "imageId": "test-image.jpg",
    "className": "fire",
    "confidence": 0.95,
    "bbox": [100, 100, 200, 200]
  }'
```

### 5. Test with Demo Video
1. Go to http://localhost:3000/owner-dashboard
2. Click "Upload Demo Video"
3. Select a video with fire/smoke
4. System will detect and trigger alert

### 6. Test with Webcam
1. Go to http://localhost:3000/owner-dashboard
2. Click "Use Laptop Webcam"
3. Show flame/smoke to camera
4. System will detect and trigger alert

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Fire Station Registration Fails
**Error:** Collections not created in Firebase or 403/500 errors

**Solutions:**
1. **Check Email Format** - Email MUST include `@` symbol and domain:
   ```json
   ✅ Correct: "email": "provider@firestation.com"
   ❌ Wrong: "email": "providerfirestationcom"
   ```

2. **Add Provider Secret Header** in Postman:
   ```
   Key: x-provider-secret
   Value: your-provider-secret-key-here
   ```
   (Must match `PROVIDER_SECRET` in `.env.local`)

3. **Check Server Logs** - Run Next.js in development mode:
   ```bash
   npm run dev
   ```
   Look for detailed error messages in console

4. **Verify Firebase Credentials** - Ensure all Firebase env vars are set in `.env.local`

5. **Test with Simple Request**:
   ```json
   POST http://localhost:3000/api/stations/register
   Headers:
     Content-Type: application/json
     x-provider-secret: your-secret
   
   Body:
   {
     "email": "test@fire.com",
     "name": "Test Provider",
     "stationName": "Test Station",
     "stationAddress": "123 Test St",
     "stationPhone": "+1-555-0000",
     "coords": {
       "lat": 12.9250,
       "lng": 80.1105
     }
   }
   ```

#### 2. Firebase Connection Error
**Error:** "Firebase not initialized"

**Solution:**
- Check `.env.local` has all Firebase credentials
- Verify `FIREBASE_PRIVATE_KEY` has escaped newlines: `\n`
- Restart Next.js server after env changes

#### 3. Python Service Not Detecting
**Error:** No alerts triggered

**Solution:**
- Ensure `best.pt` model file exists in `src/ai_backend/`
- Check Python service logs for errors
- Verify camera ID is valid
- Check confidence threshold (default 0.75)

#### 4. Email Not Sending
**Error:** "SMTP error"

**Solution:**
- Verify SMTP credentials in `.env.local`
- For Gmail, use App Password (not regular password)
- Check SMTP_PORT (587 for TLS, 465 for SSL)
- Test with: https://www.smtper.net/

#### 5. Alert Not Showing on Dashboard
**Error:** Alert triggered but not visible

**Solution:**
- Check browser console for errors
- Verify polling is running (every 5 seconds)
- Check Firestore for alert document
- Ensure owner email matches

#### 6. Image Not Loading
**Error:** 404 on snapshot URL

**Solution:**
- Check Python service is running
- Verify `saved_snapshots/` directory exists
- Check image ID is correct
- Try accessing directly: http://localhost:8000/snapshots/image-id.jpg

#### 7. Collections Not Appearing in Firebase
**Error:** No collections visible in Firestore Console

**Solution:**
- Collections are created **only when first document is written**
- Try creating a test user or house first
- Check Firebase Console after API call succeeds
- Verify you're looking at the correct Firebase project
- Check server logs for write errors

---

## 📊 Performance Optimization

### Frontend
- **Image Caching**: Snapshots cached for 1 hour
- **Lazy Loading**: Components loaded on demand
- **Debouncing**: API calls throttled
- **Memoization**: React components optimized

### Backend
- **Firestore Indexing**: Compound indexes for queries
- **Chunking**: `in` queries limited to 10 items
- **Connection Pooling**: Reuse database connections
- **CDN**: Static assets served from CDN

### AI Service
- **GPU Acceleration**: CUDA for faster inference
- **Frame Skipping**: Process every N frames
- **Model Optimization**: TensorRT/ONNX export
- **Batch Processing**: Process multiple frames together

---

## 🔮 Future Enhancements

### Planned Features
- [ ] WebSocket real-time alerts (instead of polling)
- [ ] Mobile app (React Native)
- [ ] SMS notifications (Twilio)
- [ ] Voice alerts (Twilio Voice)
- [ ] Historical analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Camera health monitoring
- [ ] Automatic nearest station calculation
- [ ] Integration with smart home devices
- [ ] Machine learning model retraining pipeline
- [ ] Admin panel for system monitoring

---

## 📝 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: support@agnisetu.example.com

---

## 🙏 Acknowledgments

- **YOLOv8**: Ultralytics team
- **Next.js**: Vercel team
- **Firebase**: Google team
- **FastAPI**: Tiangolo

---

## 📅 Version History

- **v1.0.0** (Current)
  - Initial release
  - Fire and smoke detection
  - Email notifications
  - Owner and provider dashboards
  - Demo mode with webcam/video upload

---

**Built with ❤️ by the AgniSetu Team**

---

*Last Updated: January 2025*
