# Prompt for Claude: Fire Station Provider Dashboard Component

Create a single, production-ready React JS component file for a Fire Station Provider Dashboard. This component must be directly integrable into an existing Next.js project without any modifications to existing code (except replacing the current provider dashboard page).

## PROJECT CONTEXT

### Tech Stack & Dependencies
- **Framework**: Next.js 14+ (App Router)
- **React Version**: Latest (with hooks: useState, useEffect, useRef)
- **Styling**: Tailwind CSS (already configured)
- **Animations**: framer-motion (already installed)
- **Icons**: lucide-react (already installed)
- **Toasts**: react-hot-toast (already installed)
- **Video**: Standard HTML5 video element
- **No modularity**: Everything in a single component file

### Existing Project Structure
```
src/
  app/
    provider/
      dashboard/
        page.js  ← REPLACE THIS FILE
    api/
      provider/
        dashboard/
          route.js  ← EXISTS, returns dashboard data
      alerts/
        route.js  ← EXISTS, can fetch alerts
      auth/
        login/
          route.js  ← EXISTS, POST with email returns user data
      houses/
        [id]/
          route.js  ← EXISTS, GET returns house by ID
  components/
    OwnerDashboard.jsx  ← Reference for design patterns
  context/
    AuthContext.js  ← useAuth() hook available
  lib/
    firebase.js  ← Firestore admin SDK
```

## DESIGN REQUIREMENTS

### Visual Aesthetics
1. **Theme**: Dark, liquid glass (glassmorphism) design
   - Use: `bg-white/5 backdrop-blur-xl border border-white/10`
   - Gradient backgrounds: `bg-gradient-to-br from-slate-900 to-slate-800`
   - Text colors: `text-white`, `text-gray-400`, `text-gray-300`
   - Accent colors: Orange/Red gradients (`from-orange-400 to-red-500`)

2. **Background Video**:
   - 3D render video loop showing multiple houses with some burning
   - Ethereal/atmospheric aesthetic (ethereal = dreamlike, otherworldly, glowing)
   - Video should: loop, auto-play, muted, playsInline, object-cover
   - Fixed positioning: `fixed inset-0 z-0`
   - Overlay gradient: `bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-[1px]`
   - Video element structure:
   ```jsx
   <div className="fixed inset-0 z-0">
     <video autoPlay loop muted playsInline className="w-full h-full object-cover">
       <source src={VIDEO_URL} type="video/mp4" />
     </video>
     <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-[1px]" />
   </div>
   ```
   - Use placeholder URL: `"https://sample-videos.com/zip/10/mp4/480/SampleVideo_1280x720_1mb.mp4"` (user will replace with actual 3D render)

3. **Animations**:
   - Use framer-motion for all interactive elements
   - Smooth transitions: `transition-all duration-300`
   - Hover effects: `hover:bg-white/10 hover:border-white/20`
   - Scale animations on buttons: `whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}`

4. **Glassmorphism Elements**:
   - Cards: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl`
   - Hover states: `hover:bg-white/10 hover:border-white/20`
   - Shadows: `shadow-2xl`

### Layout Structure
1. **Header**: Fixed/sticky header with provider name, station info, logo
2. **Main Content Area**: Scrollable list/grid of alerts
3. **Alert Cards**: Expandable cards showing alert details
4. **Background Video**: Fixed, full-screen, z-index 0
5. **Content Overlay**: z-index 10, relative positioning

## FUNCTIONAL REQUIREMENTS

### 1. Data Fetching

**IMPORTANT NOTE**: The backend function `getProviderDashboardData` returns alerts with status: `CONFIRMED_BY_GEMINI`, `SENDING_NOTIFICATIONS`, `NOTIFIED_COOLDOWN`.

These are the only alerts that should appear in the provider dashboard:
- `CONFIRMED_BY_GEMINI` - Fire confirmed by Gemini AI (active emergency)
- `SENDING_NOTIFICATIONS` - Emails being sent (active emergency)
- `NOTIFIED_COOLDOWN` - Active cooldown period (10 minutes after emails sent - still active)

**Note**: The backend should already filter these correctly, but as a safety measure, you can also filter client-side if needed. The backend will NOT return `PENDING`, `REJECTED_BY_GEMINI`, or `CANCELLED_BY_USER` alerts.

#### Initial Load
**Endpoint**: `GET /api/provider/dashboard?providerEmail={email}`
- **Method**: GET request
- **Query Parameter**: `providerEmail` (from authenticated user)
- **Response Structure**:
```javascript
{
  success: true,
  dashboard: [
    {
      houseId: "abc123",
      ownerEmail: "owner@example.com",
      address: "123 Main St",
      coords: { lat: 40.7128, lng: -74.0060 },
      nearestFireStationId: "station123",
      activeAlerts: [
        {
          alertId: "alert123",
          cameraId: "camera123",
          houseId: "abc123",
          status: "CONFIRMED_BY_GEMINI" | "SENDING_NOTIFICATIONS" | "NOTIFIED_COOLDOWN",
          detectionImage: "http://localhost:8000/snapshots/uuid.jpg",
          className: "fire" | "smoke",
          confidence: 0.84,
          bbox: [x1, y1, x2, y2],
          geminiCheck: {
            isFire: true,
            score: 0.95,
            reason: "Detailed analysis...",
            fireIndicators: ["visible flames", "smoke"],
            falsePositiveReasons: []
          },
          createdAt: Timestamp,
          updatedAt: Timestamp,
          lastImageUpdate: Timestamp | null
        }
      ]
    }
  ]
}
```

**Implementation**:
```javascript
const fetchDashboardData = async () => {
  try {
    const response = await fetch(`/api/provider/dashboard?providerEmail=${currentUser.email}`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    const data = await response.json();
    setDashboardData(data.dashboard || []);
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    toast.error('Failed to load dashboard');
  }
};
```

#### Fetch Owner Details (for each alert)
**Endpoint**: `POST /api/auth/login`
- **Method**: POST
- **Body**: `{ email: ownerEmail }`
- **Response**: `{ success: true, user: { name, email, ... } }`
- **Note**: Cache owner details to avoid repeated calls

#### Fetch House Details (if needed)
**Endpoint**: `GET /api/houses/{houseId}`
- **Response**: Full house object with all fields

#### Poll for Alert Updates
**Frequency**: Every 5 seconds (use setInterval)
**Endpoint**: `GET /api/provider/dashboard?providerEmail={email}` (same as initial load)
- This ensures alerts stay up-to-date
- Update detection images every 30 seconds (separate interval)

### 2. Alert Display

#### Alert Card Structure
Each alert should be displayed as an expandable card with:

**Collapsed State** (Default):
- Alert ID badge
- Status badge (with color coding)
- House address
- Owner name (if available)
- Detection timestamp
- Confidence score
- "Expand" button/icon

**Expanded State** (On click):
- All collapsed info (expanded)
- Full owner details section:
  - Name
  - Email
  - Phone (if available in user data)
- House details section:
  - Full address
  - GPS coordinates (displayed)
  - House ID
- Detection details:
  - Detection class (fire/smoke)
  - Confidence score
  - Bounding box coordinates
- Gemini verification details:
  - Gemini check result (if available)
  - Confidence score
  - Reasoning
  - Fire indicators
  - False positive reasons
- Detection image:
  - Display the `detectionImage` URL
  - Update every 30 seconds by fetching new image from same URL (add cache-busting query param)
  - Show loading state while fetching
  - Display error state if image fails to load
- Action buttons:
  - "Navigate to Location" button → Opens Google Maps with coordinates
  - "Mark as Responded" button (optional, can just be visual for now)

#### Status Badge Colors
- `CONFIRMED_BY_GEMINI`: Green (`bg-green-500/20 border-green-500/30 text-green-300`)
- `SENDING_NOTIFICATIONS`: Yellow (`bg-yellow-500/20 border-yellow-500/30 text-yellow-300`)
- `NOTIFIED_COOLDOWN`: Blue (`bg-blue-500/20 border-blue-500/30 text-blue-300`)
- `PENDING`: Orange (`bg-orange-500/20 border-orange-500/30 text-orange-300`)

### 3. Image Updates

**Implementation**:
```javascript
// Update detection images every 30 seconds
useEffect(() => {
  const imageUpdateInterval = setInterval(() => {
    // Add cache-busting query param to force refresh
    setImageUpdateKey(Date.now());
  }, 30000); // 30 seconds
  
  return () => clearInterval(imageUpdateInterval);
}, []);

// In image src:
<img 
  src={`${alert.detectionImage}?t=${imageUpdateKey}`}
  alt="Fire detection snapshot"
  onError={(e) => {
    e.target.src = '/placeholder-fire.jpg'; // Fallback
  }}
/>
```

### 4. Google Maps Navigation

**Implementation**:
```javascript
const navigateToLocation = (coords) => {
  if (coords && coords.lat && coords.lng) {
    const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    window.open(mapsUrl, '_blank');
  } else {
    toast.error('Location coordinates not available');
  }
};
```

### 5. Alert Sorting & Filtering

- **Sort by**: Most recent first (by `createdAt` or `updatedAt`)
- **Group by**: House (optional, or just show all alerts in chronological order)
- **Filter options**: None required initially, but make it easy to add later

## COMPONENT STRUCTURE

### Required Imports
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Shield, AlertTriangle, MapPin, Phone, Building, Mail, User,
  Navigation, Expand, ChevronDown, ChevronUp, Clock, Zap,
  Flame, Eye, RefreshCw, ExternalLink, Home, Calendar
} from 'lucide-react';
```

### State Management
```javascript
const [dashboardData, setDashboardData] = useState([]);
const [expandedAlerts, setExpandedAlerts] = useState(new Set()); // Track which alerts are expanded
const [imageUpdateKey, setImageUpdateKey] = useState(Date.now()); // For cache-busting
const [loading, setLoading] = useState(true);
const [ownerDetailsCache, setOwnerDetailsCache] = useState({}); // Cache owner details
const [houseDetailsCache, setHouseDetailsCache] = useState({}); // Cache house details
```

### Key Functions

#### Timestamp Handling
Firestore timestamps come as objects with `.toDate()` method or can be directly compared:
```javascript
// Convert Firestore timestamp to Date
const getTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

// Format for display
const formatDate = (timestamp) => {
  const date = getTimestamp(timestamp);
  if (!date) return 'N/A';
  return date.toLocaleString(); // or use a date library like date-fns
};
```

#### Toggle Alert Expansion
```javascript
const toggleAlert = (alertId) => {
  setExpandedAlerts(prev => {
    const newSet = new Set(prev);
    if (newSet.has(alertId)) {
      newSet.delete(alertId);
    } else {
      newSet.add(alertId);
      // Fetch owner details if not cached
      const alert = findAlertById(alertId);
      if (alert && !ownerDetailsCache[alert.ownerEmail]) {
        fetchOwnerDetails(alert.ownerEmail);
      }
    }
    return newSet;
  });
};
```

#### Fetch Owner Details
```javascript
const fetchOwnerDetails = async (ownerEmail) => {
  if (ownerDetailsCache[ownerEmail]) return ownerDetailsCache[ownerEmail];
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail })
    });
    if (response.ok) {
      const data = await response.json();
      setOwnerDetailsCache(prev => ({ ...prev, [ownerEmail]: data.user }));
      return data.user;
    }
  } catch (err) {
    console.error('Error fetching owner details:', err);
  }
  return null;
};
```

#### Polling Logic
```javascript
useEffect(() => {
  if (!currentUser) return;
  
  // Initial fetch
  fetchDashboardData();
  
  // Poll every 5 seconds
  const pollInterval = setInterval(() => {
    fetchDashboardData();
  }, 5000);
  
  return () => clearInterval(pollInterval);
}, [currentUser]);

// Separate interval for image updates
useEffect(() => {
  const imageInterval = setInterval(() => {
    setImageUpdateKey(Date.now());
  }, 30000);
  
  return () => clearInterval(imageInterval);
}, []);
```

## INTEGRATION POINTS

### 1. Authentication
- Use `useAuth()` hook from `@/context/AuthContext`
- Access `currentUser.email` for API calls
- Redirect if not authenticated or not provider role

### 2. Routing
- Component should replace `src/app/provider/dashboard/page.js`
- Use Next.js App Router conventions
- Add `'use client';` directive at top

### 3. API Integration
All endpoints are already implemented:
- `/api/provider/dashboard` - Returns houses with alerts for provider's stations
- `/api/auth/login` - Returns user details by email
- `/api/houses/{houseId}` - Returns house details (if needed)

### 4. Error Handling
- Show toast notifications for errors (using react-hot-toast)
- Gracefully handle missing data
- Show loading states during fetches
- Handle image load failures gracefully

## DESIGN PATTERNS FROM EXISTING CODE

### Header Pattern (from OwnerDashboard.jsx)
```jsx
<header className="p-6 border-b border-white/10 bg-black/20 backdrop-blur-md">
  <div className="max-w-7xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-4">
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
        className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center"
      >
        <Shield className="w-6 h-6 text-white" />
      </motion.div>
      <div>
        <h1 className="text-2xl font-bold text-white">AgniShakti Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.name}</p>
      </div>
    </div>
  </div>
</header>
```

### Card Pattern
```jsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-2xl"
>
  {/* Card content */}
</motion.div>
```

### Button Pattern
```jsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300"
>
  Button Text
</motion.button>
```

## ALERT DATA STRUCTURE (COMPLETE)

```javascript
{
  alertId: string,              // Unique alert identifier
  cameraId: string,             // Source camera ID
  houseId: string,              // Parent house ID
  status: string,               // Current status (see statuses above)
  
  // Detection data
  detectionImage: string,       // Full URL: "http://localhost:8000/snapshots/uuid.jpg"
  className: "fire" | "smoke",  // Detected class
  confidence: number,           // YOLO confidence (0.0-1.0)
  bbox: [x1, y1, x2, y2],      // Bounding box
  
  // Gemini verification
  geminiCheck: {
    isFire: boolean,
    score: number,
    reason: string,
    fireIndicators: string[],
    falsePositiveReasons: string[],
    sensitive: boolean,
    sensitiveReason: string
  } | null,
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastImageUpdate: Timestamp | null,
  
  // Email tracking
  sentEmails: {
    ownerSent: boolean,
    stationSent: boolean
  } | null
}
```

## HOUSE DATA STRUCTURE

```javascript
{
  houseId: string,
  ownerEmail: string,           // Normalized email
  address: string,
  coords: {
    lat: number,
    lng: number
  },
  nearestFireStationId: string,
  monitoringEnabled: boolean,
  createdAt: Timestamp
}
```

## USER DATA STRUCTURE

```javascript
{
  name: string,
  email: string,                // Normalized
  role: "owner" | "provider",
  createdAt: Timestamp,
  assignedStations: string[]      // For providers only
}
```

## ADDITIONAL DESIGN ELEMENTS

### Suggested Features
1. **Alert Count Badge**: Show total active alerts in header
2. **Empty State**: Beautiful empty state when no alerts (matching design)
3. **Loading Skeletons**: Use framer-motion for loading animations
4. **Real-time Indicators**: Pulsing dots for active alerts
5. **Status Timeline**: Visual timeline showing alert progression
6. **Priority Indicators**: Visual indicators for urgent alerts
7. **Search/Filter UI**: (Optional, can be basic)
8. **Statistics Dashboard**: (Optional) Cards showing alert statistics

### Visual Enhancements
1. **Gradient Overlays**: Use gradient overlays on cards
2. **Glassmorphism Depth**: Multiple layers of glassmorphism for depth
3. **Particle Effects**: Optional ambient particles (like OwnerDashboard)
4. **Smooth Scrolling**: Ensure smooth scrolling experience
5. **Responsive Design**: Mobile-friendly layout
6. **Dark Mode Optimization**: Ensure all colors work in dark theme

## IMPLEMENTATION NOTES

### Alert Status Handling
- Only show alerts with status: `CONFIRMED_BY_GEMINI`, `SENDING_NOTIFICATIONS`, `NOTIFIED_COOLDOWN`
- Filter out: `PENDING`, `REJECTED_BY_GEMINI`, `CANCELLED_BY_USER` (these shouldn't appear in provider dashboard)

### Image Handling
- The `detectionImage` URL points to Python backend: `http://localhost:8000/snapshots/{imageId}`
- Image updates happen on the backend (every 30s), frontend just refreshes the same URL
- Add cache-busting: `?t={timestamp}` query param
- Show loading spinner while image loads
- Handle CORS/loading errors gracefully

### Performance
- Cache owner/house details to avoid repeated API calls
- Debounce image updates if needed
- Use React.memo for alert cards if performance issues
- Optimize re-renders with proper dependency arrays

### Error States
- Network errors: Show toast + retry button
- Missing data: Show placeholder text
- Image errors: Show placeholder image or icon
- Empty states: Show helpful message

## FINAL REQUIREMENTS

1. **Single File**: Everything in one React component file
2. **Production Ready**: No console errors, proper error handling
3. **Direct Integration**: Drop-in replacement for existing page.js
4. **No Breaking Changes**: Don't modify any existing files/APIs
5. **Responsive**: Works on mobile and desktop
6. **Accessible**: Proper ARIA labels, keyboard navigation
7. **Performance**: Smooth animations, optimized renders
8. **File Location**: Place in `src/app/provider/dashboard/page.js` (replace existing file)
9. **Client Component**: Must include `'use client';` directive at the very top

## EXAMPLE USAGE AFTER INTEGRATION

The component will be automatically rendered when:
- User is authenticated via `useAuth()` hook
- User has role `"provider"` 
- User navigates to `/provider/dashboard` route

The component should:
1. Check authentication and redirect if not logged in
2. Fetch dashboard data on mount
3. Poll for updates every 5 seconds
4. Update images every 30 seconds
5. Handle all edge cases gracefully

## EXPECTED OUTPUT

A complete React component file (`ProviderDashboard.jsx` or similar) that:
- Can be copied directly into `src/app/provider/dashboard/page.js`
- Includes all imports, state, effects, functions, and JSX
- Follows all design patterns specified
- Integrates seamlessly with existing backend
- Looks stunning and professional
- Ready for production deployment

## CODE QUALITY STANDARDS

- Use TypeScript-style JSDoc comments where helpful
- Consistent naming conventions (camelCase for functions, PascalCase for components)
- Proper error handling (try-catch blocks)
- Clean, readable code with comments for complex logic
- No hardcoded values (use constants at top of file)
- Proper cleanup in useEffect return functions

Generate the complete component now.

