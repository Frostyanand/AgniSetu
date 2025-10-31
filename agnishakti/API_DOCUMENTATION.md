# AgniShakti API Documentation

## Overview

AgniShakti is a fire detection and alert system that uses AI-powered camera monitoring to detect fires and automatically notify property owners and fire stations. The system consists of a Next.js frontend with API routes and a comprehensive backend service layer.

## Tech Stack

- **Framework**: Next.js 15.5.3 with App Router
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with Google OAuth
- **AI Integration**: Google Gemini AI for fire verification
- **Email Service**: Nodemailer with SMTP
- **Image Storage**: Firebase Storage
- **Password Hashing**: bcryptjs
- **Language**: JavaScript/Node.js

## Environment Variables Required

All environment variables are configured in `.env.local` file in the main project directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_STORAGE_BUCKET=your_storage_bucket

# AI Service
GEMINI_API_KEY=your_gemini_api_key
ENABLE_GEMINI=true

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
EMAIL_FROM=your_from_email

# Security
SERVICE_KEY=your_service_key_for_python_backend
PROVIDER_SECRET=your_provider_secret_key

# Python AI Service Configuration
PYTHON_SERVICE_URL=http://127.0.0.1:8000
NEXTJS_API_URL=http://localhost:3000/api/alerts/trigger
DEFAULT_CAMERA_ID=your_default_camera_id
```

**Note**: For the Python service to access these environment variables:
1. Install `python-dotenv`: `pip install python-dotenv`
2. Create a `.env` file in `src/ai_backend/` directory with the same values, or set them as system environment variables.

## Database Collections

### Automatic Collection Creation

**Important**: All Firestore collections are automatically created when the first document is written to them. You don't need to manually initialize any collections in Firebase Console. Simply start using the endpoints, and the collections will be created automatically.

### Users Collection (`users`)
- **Document ID**: Normalized email address
- **Fields**:
  - `name`: User's display name
  - `email`: User's email (normalized)
  - `role`: User role (`owner` or `provider`)
  - `assignedStations`: Array of fire station IDs (for providers)
  - `createdAt`: Server timestamp (only set on first creation, preserved on updates)

### Houses Collection (`houses`)
- **Document ID**: Auto-generated house ID
- **Fields**:
  - `houseId`: Unique house identifier
  - `ownerEmail`: Owner's email (normalized)
  - `address`: Physical address
  - `coords`: `{lat, lng}` coordinates
  - `nearestFireStationId`: ID of nearest fire station (automatically calculated on creation by comparing house coords to all fire stations)
  - `monitoringEnabled`: Boolean flag
  - `monitorPasswordHash`: Hashed password for monitoring access
  - `createdAt`: Server timestamp
  - `updatedAt`: Server timestamp

### Cameras Collection (`cameras`)
- **Document ID**: Auto-generated camera ID
- **Fields**:
  - `cameraId`: Unique camera identifier
  - `houseId`: Associated house ID
  - `label`: Camera display name
  - `source`: Stream URL or source
  - `streamType`: Type of stream (`rtsp`, `usb`, `webrtc`, `other`)
  - `isMonitoring`: Boolean monitoring status
  - `createdAt`: Server timestamp
  - `lastSeen`: Last activity timestamp

### Fire Stations Collection (`fireStations`)
- **Document ID**: Auto-generated station ID
- **Fields**:
  - `stationId`: Unique station identifier
  - `name`: Station name
  - `address`: Station address
  - `phone`: Contact phone number
  - `email`: Contact email
  - `coords`: `{lat, lng}` coordinates
  - `providerEmail`: Associated provider's email
  - `createdAt`: Server timestamp

### Alerts Collection (`alerts`)
- **Document ID**: Auto-generated alert ID
- **Fields**:
  - `alertId`: Unique alert identifier
  - `cameraId`: Source camera ID
  - `houseId`: Associated house ID
  - `detectedClass`: Detected object class
  - `confidence`: Detection confidence score
  - `bbox`: Bounding box coordinates
  - `status`: Alert status (`PENDING`, `CONFIRMED`, `NOTIFIED`, `CANCELLED`)
  - `timestamp`: Detection timestamp
  - `detectionImage`: Firebase Storage URL
  - `geminiCheck`: AI verification results
  - `sentEmails`: Email delivery status
  - `canceledBy`: User who canceled (if applicable)
  - `cancelNote`: Cancellation reason

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
**Description**: Register a new user in the system.

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "owner" | "provider",
  "houseId": "optional_house_id"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "success": true,
    "email": "user@example.com"
  }
}
```

**Backend Function**: `registerUser({ name, email, role })`
- Creates or updates user document in Firestore
- Normalizes email address
- Sets server timestamp for creation

---

#### POST `/api/auth/login`
**Description**: Authenticate and retrieve user information.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "createdAt": "timestamp"
  }
}
```

**Backend Function**: `getUserByEmail(email)`
- Retrieves user document from Firestore
- Returns null if user doesn't exist

---

### House Management Endpoints

#### POST `/api/houses`
**Description**: Create a new house for a property owner. The nearest fire station is automatically calculated based on GPS coordinates.

**Request Body**:
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

**Response**:
```json
{
  "success": true,
  "houseId": "generated_house_id"
}
```

**Backend Function**: `createHouse({ ownerEmail, address, coords, monitorPassword })`
- Creates new house document in Firestore
- Hashes monitoring password with bcrypt
- **Automatically calculates and assigns the nearest fire station** by comparing house coords to all fire stations using the Haversine distance formula
- Sets default monitoring enabled to true
- Generates unique house ID

---

#### GET `/api/houses?ownerEmail=owner@example.com`
**Description**: Retrieve all houses for a specific owner.

**Query Parameters**:
- `ownerEmail`: Owner's email address

**Response**:
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
      "createdAt": "timestamp"
    }
  ]
}
```

**Backend Function**: `getHousesByOwnerEmail(ownerEmail)`
- Queries houses collection by owner email
- Returns array of house documents

---

#### GET `/api/houses/[id]`
**Description**: Retrieve a specific house by its ID.

**URL Parameters**:
- `id`: House ID

**Response**:
```json
{
  "success": true,
  "house": {
    "houseId": "house_id",
    "ownerEmail": "owner@example.com",
    "address": "123 Main Street",
    "coords": {"lat": 40.7128, "lng": -74.0060},
    "nearestFireStationId": "station_id",
    "monitoringEnabled": true,
    "createdAt": "timestamp"
  }
}
```

**Backend Function**: `getHouseById(houseId)`
- Retrieves single house document by ID
- Returns null if house doesn't exist

---

#### PATCH `/api/houses/[id]`
**Description**: Update house properties.

**URL Parameters**:
- `id`: House ID

**Request Body**:
```json
{
  "address": "Updated address",
  "coords": {"lat": 40.7128, "lng": -74.0060},
  "nearestFireStationId": "new_station_id",
  "monitoringEnabled": false
}
```

**Response**:
```json
{
  "success": true
}
```

**Backend Function**: `updateHouse(houseId, updates)`
- Updates house document with provided fields
- Sets updatedAt timestamp
- Uses merge to preserve existing fields

---

#### DELETE `/api/houses/[id]`
**Description**: Delete a house permanently from the system.

**URL Parameters**:
- `id`: House ID

**Response**:
```json
{
  "success": true,
  "message": "House house_id deleted."
}
```

**Backend Function**: `deleteHouse(houseId)`
- Permanently deletes house document from Firestore
- Implemented in backend.js

---

#### POST `/api/houses/verify-password`
**Description**: Verify monitoring password for a house.

**Request Body**:
```json
{
  "houseId": "house_id",
  "password": "candidate_password"
}
```

**Response**:
```json
{
  "success": true
}
```

**Backend Function**: `verifyHousePassword(houseId, candidatePassword)`
- Compares provided password with stored hash
- Returns boolean success status
- Throws error if house not found

---

### Camera Management Endpoints

#### POST `/api/cameras`
**Description**: Add a new camera to a house.

**Request Body**:
```json
{
  "ownerEmail": "owner@example.com",
  "cameraName": "Front Door Camera",
  "streamUrl": "rtsp://camera-ip:554/stream"
}
```

**Response**:
```json
{
  "success": true,
  "camera": {
    "success": true,
    "cameraId": "generated_camera_id"
  }
}
```

**Backend Function**: `addCamera({ houseId, label, source, streamType })`
- Finds house by owner email
- Creates camera document in Firestore
- Sets default monitoring status to false

---

#### GET `/api/cameras?ownerEmail=owner@example.com`
**Description**: Retrieve all cameras for a specific owner.

**Query Parameters**:
- `ownerEmail`: Owner's email address

**Response**:
```json
{
  "success": true,
  "cameras": [
    {
      "cameraId": "camera_id",
      "houseId": "house_id",
      "label": "Front Door Camera",
      "source": "rtsp://camera-ip:554/stream",
      "streamType": "rtsp",
      "isMonitoring": false,
      "createdAt": "timestamp"
    }
  ]
}
```

**Backend Function**: `getCamerasByOwnerEmail(ownerEmail)`
- Queries all houses for the owner
- Retrieves cameras for all owned houses
- Handles Firestore 'in' query limitations with chunking

---

#### DELETE `/api/cameras`
**Description**: Remove a camera from the system.

**Request Body**:
```json
{
  "cameraId": "camera_id_to_delete"
}
```

**Response**:
```json
{
  "success": true
}
```

**Backend Function**: `deleteCamera(cameraId)`
- Permanently deletes camera document from Firestore

---

### Monitoring Control Endpoints

#### POST `/api/monitoring/start`
**Description**: Start monitoring a specific camera.

**Request Body**:
```json
{
  "cameraId": "camera_id"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "success": true
  }
}
```

**Backend Function**: `startMonitoring(cameraId)`
- Updates camera document to set `isMonitoring: true`
- Updates `updatedAt` timestamp

---

#### POST `/api/monitoring/stop`
**Description**: Stop monitoring a specific camera.

**Request Body**:
```json
{
  "cameraId": "camera_id"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "success": true
  }
}
```

**Backend Function**: `stopMonitoring(cameraId)`
- Updates camera document to set `isMonitoring: false`
- Updates `updatedAt` timestamp

---

### Alert Management Endpoints

#### POST `/api/alerts/trigger`
**Description**: Trigger a fire detection alert (typically called by Python AI service).

**Headers**:
```
x-service-key: your_service_key
```

**Request Body**:
```json
{
  "cameraId": "camera_id",
  "imageId": "unique_image_filename.jpg",
  "className": "fire",
  "confidence": 0.95,
  "bbox": [x1, y1, x2, y2]
}
```

**Response**:
```json
{
  "success": true,
  "alert": {
    "ok": true,
    "alertId": "generated_alert_id",
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

**Backend Function**: `triggerAlert(payload)`
**Note**: The payload now expects `imageId` instead of `snapshotBase64` for the new file-based approach.
- **Complex workflow**:
  1. Validates service key for security
  2. Retrieves camera and associated house data
  3. Creates alert document with PENDING status
  4. Constructs image URL pointing to Python service using `imageId`
  5. Runs verification (currently bypassed - always returns fire detected)
  6. Finds owner and nearest fire station
  7. Sends email notifications to owner and fire station
  8. Updates alert status to NOTIFIED
- **Email notifications** include GPS links and detection images
- **Privacy protection**: Skips image attachment if flagged as sensitive
- **File-based approach**: Images are stored locally on Python service and served via URL

---

#### POST `/api/alerts/verify`
**Description**: Verify an image using Gemini AI for fire detection.

**Request Body**:
```json
{
  "imageUrl": "https://storage.googleapis.com/bucket/image.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "isFire": true,
    "score": 0.95,
    "reason": "Clear fire detected in image",
    "sensitive": false,
    "sensitiveReason": "No sensitive content detected"
  }
}
```

**Backend Function**: `verifyWithGemini({ imageUrl })`
- **Currently bypassed**: Always returns true (fire detected) to skip AI verification
- Returns consistent response: `isFire: true, score: 0.95`
- Can be re-enabled by restoring original Gemini integration code

---

#### POST `/api/alerts/cancel`
**Description**: Cancel an active alert.

**Request Body**:
```json
{
  "alertId": "alert_id_to_cancel"
}
```

**Response**:
```json
{
  "success": true
}
```

**Backend Function**: `cancelAlert({ alertId, canceledByEmail, note })`
- Updates alert status to CANCELLED
- Records cancellation details and timestamp

---

#### GET `/api/alerts/active?ownerEmail=owner@example.com`
**Description**: Get active alerts for a specific owner (pending, confirmed, or notified alerts only).

**Query Parameters**:
- `ownerEmail`: Owner's email address

**Response**:
```json
{
  "success": true,
  "alerts": [
    {
      "alertId": "alert_id",
      "cameraId": "camera_id",
      "houseId": "house_id",
      "detectedClass": "fire",
      "confidence": 0.95,
      "bbox": [x1, y1, x2, y2],
      "status": "CONFIRMED",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "detectionImage": "http://localhost:8000/snapshots/uuid.jpg",
      "geminiCheck": {
        "isFire": true,
        "score": 0.95,
        "reason": "Clear fire detected"
      }
    }
  ]
}
```

**Backend Function**: `getActiveAlertsForOwner(ownerEmail)`
- Retrieves all houses owned by the user
- Queries alerts with status: `PENDING`, `CONFIRMED`, or `NOTIFIED`
- Uses chunking to handle Firestore `in` query limitations (10 items max)

---

#### GET `/api/snapshots/[imageId]`
**Description**: Serve detection images by their unique ID (proxy to Python service).

**URL Parameters**:
- `imageId`: Unique image filename (e.g., "uuid.jpg")

**Response**: 
- **Success**: Image file (JPEG)
- **404**: Image not found
- **500**: Internal server error

**Backend Function**: None (direct proxy to Python service)
- Fetches image from Python service at `/snapshots/{imageId}`
- Returns image with proper caching headers
- Provides fallback access if direct Python service access is not available

---

### Provider/Fire Station Endpoints

#### POST `/api/stations/register`
**Description**: Register a new fire station and provider.

**Headers**:
```
x-provider-secret: your_provider_secret_key
```

**Request Body**:
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

**Response**:
```json
{
  "success": true,
  "userEmail": "provider@firestation.com",
  "stationId": "generated_station_id"
}
```

**Backend Function**: `registerFireStation({ email, name, stationName, stationAddress, stationPhone, coords })`
- **Multi-step process**:
  1. **Automatically creates or updates user** with 'provider' role in `users` collection
     - Checks if user exists first
     - Preserves `createdAt` timestamp for existing users
     - Only updates name and role if user already exists
  2. Creates fire station document in `fireStations` collection
  3. Links station to provider account via `assignedStations` array
- **Security**: Requires provider secret key in headers
- **Usage**: Can be called directly from Postman without pre-creating the user account

---

#### GET `/api/provider/dashboard?providerEmail=provider@example.com`
**Description**: Get dashboard data for a fire station provider.

**Query Parameters**:
- `providerEmail`: Provider's email address

**Response**:
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
          "timestamp": "timestamp",
          "detectionImage": "storage_url"
        }
      ]
    }
  ]
}
```

**Backend Function**: `getProviderDashboardData(providerEmail)`
- Retrieves all stations assigned to provider
- Finds houses within provider's coverage area
- Includes active alerts for each house
- Handles Firestore query limitations with chunking

---

### System Endpoints

#### GET `/api/health`
**Description**: Health check endpoint to verify server status.

**Response**:
```json
{
  "ok": true
}
```

**Backend Function**: None (direct response)
- Simple endpoint to verify API server is running

---

## Backend Helper Functions

### User Management
- `normalizeEmail(email)`: Normalizes email addresses for consistent storage
- `registerUser({ name, email, role })`: Creates/updates user documents
- `getUserByEmail(email)`: Retrieves user by email
- `assignRole(email, role)`: Updates user role
- `assignStationToProvider(providerEmail, stationId)`: Links provider to station

### House Management
- `createHouse({ ownerEmail, address, coords, monitorPassword })`: Creates new house and automatically calculates nearest fire station
- `getHousesByOwnerEmail(ownerEmail)`: Retrieves all houses for owner
- `getHouseById(houseId)`: Retrieves specific house
- `updateHouse(houseId, updates)`: Updates house properties
- `setHouseMonitorPassword(houseId, newPassword)`: Updates monitoring password
- `verifyHousePassword(houseId, candidatePassword)`: Validates monitoring password

### Camera Management
- `addCamera({ houseId, label, source, streamType })`: Creates new camera
- `getCamerasByHouse(houseId)`: Retrieves cameras for specific house
- `getCamerasByOwnerEmail(ownerEmail)`: Retrieves all cameras for owner
- `updateCamera(cameraId, updates)`: Updates camera properties
- `deleteCamera(cameraId)`: Removes camera
- `startMonitoring(cameraId)`: Enables monitoring
- `stopMonitoring(cameraId)`: Disables monitoring

### Fire Station Management
- `addFireStation(station)`: Creates new fire station in `fireStations` collection (auto-created)
- `registerFireStation({ email, name, stationName, stationAddress, stationPhone, coords })`: Complete provider registration (automatically creates user if needed)
- `findNearestFireStation({ lat, lng })`: Finds closest station using Haversine formula
- `getProviderAssignedStations(providerEmail)`: Gets provider's assigned stations
- `getProviderDashboardData(providerEmail)`: Gets comprehensive dashboard data

### Alert System
- `triggerAlert(payload)`: Complete alert workflow with AI verification and notifications
- `cancelAlert({ alertId, canceledByEmail, note })`: Cancels active alerts
- `getActiveAlertsForOwner(ownerEmail)`: Retrieves active alerts for owner

### Utility Functions
- `haversineKm(lat1, lon1, lat2, lon2)`: Calculates distance between coordinates
- `uploadSnapshotBase64({ base64Image, destinationPath, expiresInSeconds })`: Uploads images to Firebase Storage
- `sendAlertEmail({ toEmail, subject, textBody, htmlBody, imageUrl })`: Sends email notifications
- `verifyWithGemini({ imageUrl })`: AI-powered fire verification

## Security Features

1. **Service Key Authentication**: Python backend must provide valid service key
2. **Provider Secret**: Fire station registration requires secret key
3. **Email Normalization**: Consistent email handling prevents duplicates
4. **Password Hashing**: bcrypt for secure password storage
5. **Privacy Protection**: AI checks for sensitive content in images
6. **Firebase Security**: Server-side admin SDK for secure database access

## Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing required fields)
- `401`: Unauthorized (invalid service key)
- `403`: Forbidden (invalid provider secret)
- `404`: Not Found (user/house/camera not found)
- `500`: Internal Server Error

## Integration Notes

1. **Python AI Service**: The system expects a Python service to call `/api/alerts/trigger` with detection results
2. **Firebase Storage**: Images are stored with signed URLs for secure access
3. **Email Service**: SMTP configuration required for notifications
4. **Gemini AI**: Optional but recommended for false alarm reduction
5. **Real-time Updates**: Consider implementing WebSocket connections for real-time alert updates

## Testing Recommendations

1. Test all endpoints with valid and invalid data
2. Verify email notifications are sent correctly
3. Test image upload and storage functionality
4. Validate AI verification with various image types
5. Test provider registration with and without secret key
6. Verify monitoring start/stop functionality
7. Test alert cancellation workflow

## Issues Found and Recommendations

### **Recent Updates and Fixes**

1. **Alert Trigger Endpoint Updated**:
   - **Fixed**: Updated `/api/alerts/trigger` to use new file-based approach with `imageId` instead of `snapshotBase64`
   - **Improvement**: More efficient memory usage and faster processing

2. **File-Based Image Storage**:
   - **Added**: Python service now saves detection images locally and serves them via `/snapshots/{imageId}` endpoint
   - **Added**: Next.js proxy endpoint `/api/snapshots/[imageId]` for fallback access
   - **Benefit**: Reduced memory usage and improved performance

3. **Environment Configuration**:
   - **Consolidated**: All environment variables now use the single `.env.local` file
   - **Added**: `PYTHON_SERVICE_URL` and `NEXTJS_API_URL` for service communication
   - **Simplified**: Removed separate environment files for easier management

### **Recent Updates**

1. **House Delete Endpoint**: ✅ **FIXED**
   - The `deleteHouse(houseId)` function has been implemented in backend.js
   - DELETE endpoint now properly deletes house documents from Firestore

2. **Active Alerts Endpoint**: ✅ **ADDED**
   - New endpoint: `GET /api/alerts/active?ownerEmail=owner@example.com`
   - Uses existing `getActiveAlertsForOwner(ownerEmail)` backend function
   - Returns alerts with status: PENDING, CONFIRMED, or NOTIFIED

### **API Endpoint Count**
- **Total Endpoints**: 18
- **Authentication**: 2 endpoints
- **House Management**: 5 endpoints  
- **Camera Management**: 3 endpoints
- **Monitoring Control**: 2 endpoints
- **Alert Management**: 5 endpoints (including active alerts and snapshots)
- **Provider/Fire Station**: 2 endpoints
- **System**: 1 endpoint

## Python AI Service Endpoints

### Video Upload and Streaming

#### POST `/upload_video`
**Description**: Upload a video file for general processing.

**Request**: Multipart form data with video file
**Response**: 
```json
{
  "filename": "uuid_filename.mp4"
}
```

#### POST `/upload_video/{camera_id}`
**Description**: Upload a video file for a specific camera (for demo/testing).

**URL Parameters**:
- `camera_id`: Valid camera ID from Firestore

**Request**: Multipart form data with video file
**Response**: 
```json
{
  "filename": "camera_id_uuid_filename.mp4",
  "camera_id": "t3P2IfoxeOvQv4K9d3eI",
  "original_filename": "fire-video.mp4",
  "uploaded_at": null
}
```

#### GET `/video_feed/{video_name}`
**Description**: Stream processed video with fire detection.

**URL Parameters**:
- `video_name`: Filename returned from upload

**Response**: Video stream with fire detection overlays

#### GET `/video_feed/{camera_id}/{video_name}`
**Description**: Stream processed video for a specific camera (for demo/testing).

**URL Parameters**:
- `camera_id`: Valid camera ID from Firestore
- `video_name`: Filename returned from camera-specific upload

**Response**: Video stream with fire detection overlays and proper camera association

#### GET `/snapshots/{image_id}`
**Description**: Serve saved detection images by their unique ID.

**URL Parameters**:
- `image_id`: Unique image filename (e.g., "uuid.jpg")

**Response**: Image file (JPEG) or 404 if not found

---

This documentation provides a comprehensive overview of the AgniShakti API system, including all endpoints, backend functions, database structure, and integration requirements.
