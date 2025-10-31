// src/backend/backend.js
// Server-side backend helper functions for Agnishakti
// Use only from server (API routes or Node.js process).
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/firebase"; // your firebase admin firestore instance
import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const DEFAULT_SNAPSHOT_TTL_SEC = 60 * 60 * 24 * 7; // 7 days signed url expiry

/** --------------------------
 * Helper utilities
 * -------------------------- */

/** Normalize emails used as Firestore doc IDs */
export function normalizeEmail(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email: must be a non-empty string");
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation
  if (!trimmed.includes('@') || !trimmed.includes('.')) {
    throw new Error(`Invalid email format: ${email}. Must contain @ and domain`);
  }
  
  return trimmed;
}

/** Simple Haversine distance (km) */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Get Storage bucket (admin.storage) */
function getStorageBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || null;
  if (bucketName) return admin.storage().bucket(bucketName);
  return admin.storage().bucket(); // default
}

/** Save base64 JPEG locally in /public/uploads and return URL */
export async function uploadSnapshotBase64({ base64Image, destinationPath }) {
  if (!base64Image || !destinationPath) throw new Error("Missing snapshot or path");

  const matches = base64Image.match(/^data:image\/\w+;base64,(.*)$/);
  const payload = matches ? matches[1] : base64Image;
  const buffer = Buffer.from(payload, "base64");

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const safeFileName = destinationPath.replace(/[\\/]/g, "-");
  const filePath = path.join(uploadDir, safeFileName);

  fs.writeFileSync(filePath, buffer);

  return `/uploads/${safeFileName}`;
}

/** Nodemailer transport (reads env vars) */
function getMailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    throw new Error("SMTP env vars not configured (SMTP_HOST/SMTP_USER)");
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/** send alert email to owner and provider (one mail per recipient) */
export async function sendAlertEmail({ toEmail, subject, textBody, htmlBody, imageUrl }) {
  const transporter = getMailTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from,
    to: toEmail,
    subject,
    text: textBody,
    html: htmlBody,
  };

  if (imageUrl) {
    mailOptions.html = (htmlBody || "") + `<p><a href="${imageUrl}" target="_blank">View detection image</a></p>`;
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
}

// verifyWithGemini will be added later in the new alert pipeline section

/** --------------------------
 * Users (docs keyed by normalized email)
 * -------------------------- */

/**
 * registerUser
 * - Creates or merges a user document where doc ID = normalized email
 * - Only sets createdAt if user doesn't exist
 * - Firestore collections are automatically created on first write
 */
export async function registerUser({ name, email, role = "owner" }) {
  try {
    console.log('registerUser called with:', { name, email, role });
    const safeEmail = normalizeEmail(email);
    console.log('Normalized email:', safeEmail);
    
    const userRef = db.collection("users").doc(safeEmail);
    
    // Check if user already exists
    console.log('Checking if user exists...');
    const existingUser = await userRef.get();
    console.log('User exists:', existingUser.exists);
    
    const data = {
      name: name || "",
      email: safeEmail,
      role,
    };
    
    // Only set createdAt if this is a new user
    if (!existingUser.exists) {
      data.createdAt = admin.firestore.FieldValue.serverTimestamp();
      console.log('New user - setting createdAt');
    } else {
      console.log('Existing user - preserving createdAt');
    }

    console.log('Writing user data to Firestore...');
    await userRef.set(data, { merge: true });
    console.log('User document written successfully');
    
    return { success: true, email: safeEmail };
  } catch (error) {
    console.error('registerUser failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * getUserByEmail
 */
export async function getUserByEmail(email) {
  const safeEmail = normalizeEmail(email);
  const doc = await db.collection("users").doc(safeEmail).get();
  if (!doc.exists) return null;
  return doc.data();
}

/**
 * assignRole
 */
export async function assignRole(email, role) {
  const safeEmail = normalizeEmail(email);
  await db.collection("users").doc(safeEmail).set({ role }, { merge: true });
  return { success: true };
}

/** --------------------------
 * Houses
 * -------------------------- */

/**
 * createHouse
 * - ownerEmail (string) - will be normalized
 * - address (string)
 * - coords {lat, lng}
 * - monitorPassword (plaintext) - will be hashed & stored
 * - Automatically calculates and assigns nearest fire station
 * - Creates document in 'houses' collection (auto-created on first write)
 */
export async function createHouse({ ownerEmail, address, coords, monitorPassword }) {
  const safeEmail = normalizeEmail(ownerEmail);
  const housesRef = db.collection("houses").doc(); // auto id
  const houseId = housesRef.id;

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = monitorPassword ? bcrypt.hashSync(monitorPassword, salt) : null;

  // Automatically find nearest fire station based on house coordinates
  let nearestFireStationId = null;
  if (coords && coords.lat && coords.lng) {
    const nearestStation = await findNearestFireStation(coords);
    nearestFireStationId = nearestStation ? nearestStation.stationId : null;
  }

  const payload = {
    houseId,
    ownerEmail: safeEmail,
    address: address || "",
    coords: coords || null,
    nearestFireStationId: nearestFireStationId,
    monitoringEnabled: true,
    monitorPasswordHash: passwordHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await housesRef.set(payload);
  return { success: true, houseId };
}

/**
 * getHousesByOwnerEmail
 */
export async function getHousesByOwnerEmail(ownerEmail) {
  const safeEmail = normalizeEmail(ownerEmail);
  const snap = await db.collection("houses").where("ownerEmail", "==", safeEmail).get();
  return snap.docs.map((d) => d.data());
}

/**
 * getHouseById
 */
export async function getHouseById(houseId) {
  const doc = await db.collection("houses").doc(houseId).get();
  if (!doc.exists) return null;
  return doc.data();
}

/**
 * updateHouse (partial updates)
 * - updates object can include address, coords, nearestFireStationId, monitoringEnabled
 */
export async function updateHouse(houseId, updates = {}) {
  if (!houseId) throw new Error("houseId required");
  const safeUpdates = { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  await db.collection("houses").doc(houseId).set(safeUpdates, { merge: true });
  return { success: true };
}

/**
 * setHouseMonitorPassword
 */
export async function setHouseMonitorPassword(houseId, newPassword) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  await db.collection("houses").doc(houseId).set({ monitorPasswordHash: hash }, { merge: true });
  return { success: true };
}

/**
 * verifyHousePassword
 */
export async function verifyHousePassword(houseId, candidatePassword) {
  const doc = await db.collection("houses").doc(houseId).get();
  if (!doc.exists) throw new Error("House not found");
  const data = doc.data();
  if (!data.monitorPasswordHash) return false;
  const ok = bcrypt.compareSync(candidatePassword, data.monitorPasswordHash);
  return ok;
}

/**
 * deleteHouse
 * - Deletes a house document from Firestore.
 * - Also deletes all associated camera documents (cascade delete)
 */
export async function deleteHouse(houseId) {
  if (!houseId) throw new Error("houseId required");
  
  // First, find and delete all cameras associated with this house
  console.log(`Deleting house ${houseId} and its associated cameras...`);
  const camerasSnapshot = await db.collection("cameras").where("houseId", "==", houseId).get();
  
  if (!camerasSnapshot.empty) {
    console.log(`Found ${camerasSnapshot.size} camera(s) to delete`);
    // Delete each camera document
    const deletePromises = camerasSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`Deleted ${camerasSnapshot.size} camera(s) for house ${houseId}`);
  } else {
    console.log(`No cameras found for house ${houseId}`);
  }
  
  // Then delete the house document itself
  await db.collection("houses").doc(houseId).delete();
  console.log(`House ${houseId} deleted successfully`);
  
  return { success: true };
}


/** --------------------------
 * Cameras
 * -------------------------- */

/**
 * addCamera
 * - houseId
 * - label
 * - source (rtsp, local-usb, etc.)
 * - streamType (rtsp|usb|webrtc|other)
 * - Creates document in 'cameras' collection (auto-created on first write)
 */
export async function addCamera({ houseId, label, source, streamType = "rtsp" }) {
  if (!houseId) throw new Error("houseId required");
  const cameraRef = db.collection("cameras").doc();
  const cameraId = cameraRef.id;
  const payload = {
    cameraId,
    houseId,
    label: label || "",
    source: source || "",
    streamType,
    isMonitoring: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeen: null,
  };
  await cameraRef.set(payload);
  return { success: true, cameraId };
}

/**
 * getCamerasByHouse
 */
export async function getCamerasByHouse(houseId) {
  const snap = await db.collection("cameras").where("houseId", "==", houseId).get();
  return snap.docs.map((d) => d.data());
}

/**
 * getCamerasByOwnerEmail
 * - collects all houses for owner then queries cameras using 'in' (chunked)
 */
export async function getCamerasByOwnerEmail(ownerEmail) {
  const safeEmail = normalizeEmail(ownerEmail);
  const housesSnap = await db.collection("houses").where("ownerEmail", "==", safeEmail).get();
  const houseIds = housesSnap.docs.map((d) => d.id || d.data().houseId).filter(Boolean);
  if (houseIds.length === 0) return [];

  const chunkSize = 10;
  const results = [];
  for (let i = 0; i < houseIds.length; i += chunkSize) {
    const chunk = houseIds.slice(i, i + chunkSize);
    const camerasSnap = await db.collection("cameras").where("houseId", "in", chunk).get();
    camerasSnap.forEach((d) => results.push(d.data()));
  }
  return results;
}

/**
 * updateCamera
 */
export async function updateCamera(cameraId, updates = {}) {
  await db.collection("cameras").doc(cameraId).set({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
}

/**
 * deleteCamera
 */
export async function deleteCamera(cameraId) {
  await db.collection("cameras").doc(cameraId).delete();
  return { success: true };
}

/**
 * startMonitoring / stopMonitoring
 */
export async function startMonitoring(cameraId) {
  await db.collection("cameras").doc(cameraId).set({ isMonitoring: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
}

export async function stopMonitoring(cameraId) {
  await db.collection("cameras").doc(cameraId).set({ isMonitoring: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
}

/** --------------------------
 * Fire Stations & provider assignment
 * -------------------------- */

/**
 * addFireStation
 * - station: { name, phone, email, coords }
 * - Creates document in 'fireStations' collection (auto-created on first write)
 */
export async function addFireStation(station) {
    const ref = db.collection("fireStations").doc();
    const stationId = ref.id;
    const payload = { 
        stationId, 
        ...station, 
        providerEmail: normalizeEmail(station.email),
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
    };
    await ref.set(payload);
    return { success: true, stationId };
}

/**
 * registerFireStation
 * - High-level function that handles the entire provider registration flow.
 * - Automatically creates user in 'users' collection if they don't exist
 * - Creates fire station in 'fireStations' collection (auto-created on first write)
 * - Links station to provider in user's assignedStations array
 */
export async function registerFireStation({ email, name, stationName, stationAddress, stationPhone, coords }) {
    try {
        console.log('=== registerFireStation called ===');
        console.log('Input params:', { email, name, stationName, stationAddress, stationPhone, coords });
        
        // Create or update user as provider (users collection auto-created on first write)
        console.log('Step 1: Creating/updating user as provider...');
        const userResult = await registerUser({ name, email, role: 'provider' });
        console.log('User created/updated:', userResult);

        // Create fire station document (fireStations collection auto-created on first write)
        console.log('Step 2: Creating fire station document...');
        const stationData = {
            name: stationName,
            address: stationAddress,
            phone: stationPhone,
            email: normalizeEmail(email),
            coords
        };
        console.log('Station data:', stationData);
        const { stationId } = await addFireStation(stationData);
        console.log('Fire station created with ID:', stationId);

        // Link station to provider's assignedStations array
        console.log('Step 3: Linking station to provider...');
        await assignStationToProvider(email, stationId);
        console.log('Station linked to provider successfully');

        const result = { success: true, userEmail: normalizeEmail(email), stationId };
        console.log('=== registerFireStation completed successfully ===', result);
        return result;
    } catch (error) {
        console.error('=== registerFireStation failed ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

/**
 * findNearestFireStation(houseCoords)
 */
export async function findNearestFireStation({ lat, lng }) {
  const snap = await db.collection("fireStations").get();
  if (snap.empty) return null;
  let best = null;
  snap.forEach((d) => {
    const data = d.data();
    if (!data.coords) return;
    const dist = haversineKm(lat, lng, data.coords.lat, data.coords.lng);
    if (!best || dist < best.dist) best = { station: data, dist };
  });
  return best ? best.station : null;
}

/**
 * assignStationToProvider
 * - updates user's assignedStations array
 */
export async function assignStationToProvider(providerEmail, stationId) {
  const safeEmail = normalizeEmail(providerEmail);
  await db.collection("users").doc(safeEmail).set({ assignedStations: admin.firestore.FieldValue.arrayUnion(stationId) }, { merge: true });
  return { success: true };
}

/**
 * getProviderAssignedStations
 */
export async function getProviderAssignedStations(providerEmail) {
  const safeEmail = normalizeEmail(providerEmail);
  const userDoc = await db.collection("users").doc(safeEmail).get();
  if (!userDoc.exists) return [];
  const data = userDoc.data();
  return data.assignedStations || [];
}

/**
 * getProviderDashboardData(providerEmail)
 */
export async function getProviderDashboardData(providerEmail) {
  const stationIds = await getProviderAssignedStations(providerEmail);
  if (!stationIds || stationIds.length === 0) return [];

  const chunkSize = 10;
  const houses = [];
  for (let i = 0; i < stationIds.length; i += chunkSize) {
    const chunk = stationIds.slice(i, i + chunkSize);
    const snap = await db.collection("houses").where("nearestFireStationId", "in", chunk).get();
    snap.forEach((d) => houses.push(d.data()));
  }

  const houseIds = houses.map((h) => h.houseId);
  const alertsByHouse = {};
  if (houseIds.length) {
    for (let i = 0; i < houseIds.length; i += chunkSize) {
      const chunk = houseIds.slice(i, i + chunkSize);
      const alertsSnap = await db.collection("alerts").where("houseId", "in", chunk).where("status", "==", "CONFIRMED").get();
      alertsSnap.forEach((a) => {
        const ad = a.data();
        alertsByHouse[ad.houseId] = alertsByHouse[ad.houseId] || [];
        alertsByHouse[ad.houseId].push(ad);
      });
    }
  }

  return houses.map((h) => ({ ...h, activeAlerts: alertsByHouse[h.houseId] || [] }));
}

// =================================================================
// --- NEW MASTER ALERT PIPELINE (REPLACES OLD triggerAlert) ---
// =================================================================

/**
 * [ALERT_PIPELINE] STEP 1 (NEW): Check for active alerts.
 * This is our "spam protection" gatekeeper.
 */
export async function checkActiveAlert(cameraId) {
  console.log(`[NEXT_BACKEND] [Alert Spam Check] Checking for active alerts for camera: ${cameraId}`);
  const q = db.collection("alerts")
    .where("cameraId", "==", cameraId)
    .where("status", "in", [
      "PENDING", 
      "CONFIRMED_BY_GEMINI", 
      "SENDING_NOTIFICATIONS", 
      "NOTIFIED_COOLDOWN"
    ]);

  const snap = await q.get();
  if (snap.empty) {
    console.log(`[NEXT_BACKEND] [Alert Spam Check] ✅ OK. No active alert found.`);
    return null; // No active alert, OK to proceed.
  }

  const alertId = snap.docs[0].id;
  console.warn(`[NEXT_BACKEND] [Alert Spam Check] ❌ REJECTED. Alert ${alertId} is already active.`);
  return snap.docs[0].data();
}

/**
 * [ALERT_PIPELINE] STEP 2 (NEW): Create the "PENDING" alert.
 * This is the "fast" function called by the frontend.
 * It creates the alert and starts the Gemini check in the background.
 */
export async function createPendingAlert(payload) {
  const { cameraId, className, confidence, bbox, timestamp, imageId } = payload;

  console.log(`[NEXT_BACKEND] [Alert Pipeline] 1. createPendingAlert called for: ${cameraId}`);

  // 1. Get Camera and House info
  const camDoc = await db.collection("cameras").doc(cameraId).get();
  if (!camDoc.exists) throw new Error("Camera not found");
  const houseId = camDoc.data().houseId;

  // 2. Build REAL snapshot URL
  let snapshotUrl;
  if (imageId.startsWith('http')) {
    // It's already a full URL, use it as-is
    snapshotUrl = imageId;
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 1a. Received a full URL for imageId.`);
  } else {
    // It's just a filename, build the URL
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
    snapshotUrl = `${pythonServiceUrl}/snapshots/${imageId}`;
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 1a. Built URL from imageId: ${snapshotUrl}`);
  }

  // 3. Create PENDING alert
  const alertRef = db.collection("alerts").doc();
  const alertPayload = {
    alertId: alertRef.id,
    cameraId,
    houseId,
    status: "PENDING", // User 30s-timer is now active
    detectionImage: snapshotUrl, // The REAL, working URL
    className, confidence, bbox,
    createdAt: timestamp ? new Date(timestamp) : new Date(),
    geminiCheck: null,
  };
  await alertRef.set(alertPayload);

  console.log(`[NEXT_BACKEND] [Alert Pipeline] 2. PENDING alert ${alertRef.id} created.`);

  // 4. Start Gemini check (Fire-and-forget, no await)
  // This runs in the background
  runGeminiVerification(alertRef.id, snapshotUrl);
  console.log(`[NEXT_BACKEND] [Alert Pipeline] 3. Gemini check started (no-await).`);

  return { alertId: alertRef.id };
}

/**
 * [ALERT_PIPELINE] STEP 3 (NEW - Stolen from friend): Run Gemini check.
 * This is the background task.
 */
async function runGeminiVerification(alertId, snapshotUrl) {
  try {
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 3a. (Background) Gemini verification starting for ${alertId}...`);

  const geminiRes = await verifyWithGemini({ imageUrl: snapshotUrl });

    const alertRef = db.collection("alerts").doc(alertId);
    const alertDoc = await alertRef.get();

    // Only update if the alert is still PENDING (i.e., user hasn't cancelled)
    if (alertDoc.exists && alertDoc.data().status === "PENDING") {
      if (geminiRes.isFire) {
        await alertRef.set({ status: "CONFIRMED_BY_GEMINI", geminiCheck: geminiRes }, { merge: true });
        console.log(`[NEXT_BACKEND] [Alert Pipeline] 4a. (Background) Gemini confirmed REAL fire for ${alertId}.`);
      } else {
        await alertRef.set({ status: "REJECTED_BY_GEMINI", geminiCheck: geminiRes }, { merge: true });
        console.log(`[NEXT_BACKEND] [Alert Pipeline] 4b. (Background) Gemini rejected FAKE fire for ${alertId}.`);
      }
    } else {
       console.log(`[NEXT_BACKEND] [Alert Pipeline] 4c. (Background) Gemini finished, but alert ${alertId} was no longer PENDING (User may have cancelled). No update.`);
    }
  } catch (err) {
    console.error(`[NEXT_BACKEND] [Alert Pipeline] 4d. (Background) Gemini verification FAILED for ${alertId}:`, err);
    try {
      await db.collection("alerts").doc(alertId).set({ 
        status: "REJECTED_BY_GEMINI", 
        geminiCheck: { isFire: false, reason: "Gemini API failed." }
      }, { merge: true });
    } catch (dbErr) {}
  }
}

/**
 * [ALERT_PIPELINE] STEP 4 (NEW): The user's "Cancel" button.
 * This is called by the new /cancel API route.
 */
export async function cancelAlertByUser(alertId, userEmail) {
  console.log(`[NEXT_BACKEND] [Alert Pipeline] 5a. User attempting to CANCEL alert: ${alertId}`);
  const alertRef = db.collection("alerts").doc(alertId);
  const doc = await alertRef.get();
  if (!doc.exists) throw new Error("Alert not found");

  const status = doc.data().status;
  // Allow cancellation if it's PENDING or if Gemini just rejected it (the race condition)
  if (status === "PENDING" || status === "REJECTED_BY_GEMINI" || status === "CONFIRMED_BY_GEMINI") {
    await alertRef.set({ 
      status: "CANCELLED_BY_USER", 
      canceledBy: userEmail || "unknown_user",
      canceledAt: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 5b. ✅ Success. Alert ${alertId} set to CANCELLED_BY_USER.`);
    return { success: true };
  } else {
    console.warn(`[NEXT_BACKEND] [Alert Pipeline] 5c. ❌ FAILED to cancel alert ${alertId}. Status is already ${status}.`);
    return { success: false, message: "Alert is already finalized." };
  }
}


/**
 * [ALERT_PIPELINE] STEP 5 (NEW): The "Email Gatekeeper"
 * Called by frontend after 30s timer expires.
 */
export async function confirmAndSendAlerts(alertId) {
  console.log(`[NEXT_BACKEND] [Alert Pipeline] 6. "Gatekeeper" (confirmAndSend) received for alert: ${alertId}`);

  const alertRef = db.collection("alerts").doc(alertId);
  const alertDoc = await alertRef.get();
  if (!alertDoc.exists) {
    console.error(`[NEXT_BACKEND] [Alert Pipeline] ❌ FAILED: Alert ${alertId} not found.`);
    throw new Error("Alert not found.");
  }

  const alert = alertDoc.data();
  const { status, cameraId, houseId, className, detectionImage, geminiCheck } = alert;

  // This is the "Gatekeeper" logic
  if (status === "CANCELLED_BY_USER") {
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 7a. Alert ${alertId} was CANCELLED BY USER. Deleting.`);
    await deleteAlert(alertId);
    return { ok: true, message: "Alert was cancelled by user." };
  }

  if (status === "REJECTED_BY_GEMINI") {
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 7b. Alert ${alertId} was REJECTED BY GEMINI. Deleting.`);
    await deleteAlert(alertId);
    return { ok: true, message: "Alert was rejected by Gemini." };
  }

  if (status === "NOTIFIED_COOLDOWN" || status === "SENDING_NOTIFICATIONS") {
     console.warn(`[NEXT_BACKEND] [Alert Pipeline] 7c. Alert ${alertId} is already processing/sent. Doing nothing.`);
     return { ok: true, message: "Alert already processed." };
  }

  if (status !== "CONFIRMED_BY_GEMINI") {
    // This can happen if the timer expires *before* Gemini finishes (e.g., Gemini is slow)
    console.warn(`[NEXT_BACKEND] [Alert Pipeline] 7d. ⏳ Alert ${alertId} is NOT YET confirmed by Gemini. Status: ${status}. Will retry.`);
    return { ok: false, message: `Alert not confirmed. Status: ${status}` };
  }

  // --- IF WE REACH HERE, IT'S A "GO" ---
  console.log(`[NEXT_BACKEND] [Alert Pipeline] 8. ✅ GO SIGNAL! Alert ${alertId} is CONFIRMED_BY_GEMINI. Sending emails...`);
  await alertRef.set({ status: "SENDING_NOTIFICATIONS" }, { merge: true });

  try {
    // Now we run the "slow" email logic.
    const houseDoc = await db.collection("houses").doc(houseId).get();
    const house = houseDoc.data();
    const ownerEmail = house.ownerEmail;
    const ownerDoc = await db.collection("users").doc(ownerEmail).get();
    const owner = ownerDoc.exists ? ownerDoc.data() : { email: ownerEmail };

    // Use the existing findNearestFireStation function
    const station = await findNearestFireStation(house.coords);

    const gpsLink = house.coords ? `http://maps.google.com/?q=${house.coords.lat},${house.coords.lng}` : null;
    const attachImage = !geminiCheck.sensitive;
    const snapshotUrl = detectionImage; // Use the real URL from the alert doc

    // Send Owner Email
    const subjectOwner = `URGENT: Fire detected at ${house.address}`;
    const htmlOwner = `<p>Dear ${owner.name || "Owner"},</p><p>We detected ${className} at your property (${house.address}). Gemini AI has confirmed this is a real fire.</p><p><a href="${gpsLink}" target="_blank">Open location in Google Maps</a></p>`;
    await sendAlertEmail({
      toEmail: owner.email || ownerEmail,
      subject: subjectOwner,
      htmlBody: htmlOwner,
      imageUrl: attachImage ? snapshotUrl : null,
    });
    console.log(`[NEXT_BACKEND] [Alert Pipeline] 8a. Sent email to Owner: ${owner.email}`);

    // Send Fire Station Email
  if (station && station.email) {
      const subjectStation = `ALERT: Fire at ${house.address}`;
      const htmlStation = `<p>Fire alert at ${house.address}</p><p>House owner: ${owner.email}</p><p>Gemini AI has confirmed this is a real fire.</p><p><a href="${gpsLink}" target="_blank">Navigate</a></p>`;
      await sendAlertEmail({
        toEmail: station.email,
        subject: subjectStation,
        htmlBody: htmlStation,
        imageUrl: attachImage ? snapshotUrl : null,
      });
      console.log(`[NEXT_BACKEND] [Alert Pipeline] 8b. Sent email to Station: ${station.email}`);
    }

    // 9. Set to "Cooldown"
    await alertRef.set({
      status: "NOTIFIED_COOLDOWN",
      cooldownExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), // 10 mins
      sentEmails: { ownerSent: true, stationSent: !!(station && station.email) },
    }, { merge: true });

    console.log(`[NEXT_BACKEND] [Alert Pipeline] 9. ✅ Emails sent. Alert ${alertId} set to NOTIFIED_COOLDOWN.`);
    return { ok: true, alertId, status: "NOTIFIED_COOLDOWN" };

  } catch (emailErr) {
    console.error(`[NEXT_BACKEND] [Alert Pipeline] 10. ❌ CRITICAL: Email sending failed for ${alertId}.`, emailErr);
    await alertRef.set({ status: "CONFIRMED_BY_GEMINI", error: "Failed to send emails" }, { merge: true }); // Reset
    return { ok: false, message: "Email sending failed." };
  }
}

/**
 * [ALERT_PIPELINE] STEP 6 (NEW): Update the image during cooldown.
 * This is for the 30s image update.
 */
export async function updateAlertImage(alertId, newImageId) {
  console.log(`[NEXT_BACKEND] [Alert Pipeline] Cooldown: Updating image for ${alertId} to ${newImageId}`);
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
  const snapshotUrl = `${pythonServiceUrl}/snapshots/${newImageId}`;

  await db.collection("alerts").doc(alertId).set({
    detectionImage: snapshotUrl,
    lastImageUpdate: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true, newImageUrl: snapshotUrl };
}

/**
 * [ALERT_PIPELINE] STEP 7 (NEW): The cleanup functions.
 * This is for your auto-delete requirement.
 */
export async function deleteAlert(alertId) {
  await db.collection("alerts").doc(alertId).delete();
  console.log(`[NEXT_BACKEND] [Alert Pipeline] Cleanup: Deleted alert ${alertId}.`);
  return { success: true };
}

// This is for a cron job to run to clean up old alerts
export async function cleanupResolvedAlerts() {
  console.log(`[NEXT_BACKEND] [Alert Pipeline] Cron: Running cleanupResolvedAlerts...`);
  const now = admin.firestore.Timestamp.now();
  const q = db.collection("alerts")
    .where("cooldownExpiresAt", "<=", now);

  const snap = await q.get();
  if (snap.empty) {
    console.log(`[NEXT_BACKEND] [Alert Pipeline] Cron: No resolved alerts to delete.`);
    return { deleted: 0 };
  }

  const deletePromises = [];
  snap.docs.forEach(doc => {
    console.log(`[NEXT_BACKEND] [Alert Pipeline] Cron: Deleting resolved alert ${doc.id}`);
    deletePromises.push(doc.ref.delete());
  });

  await Promise.all(deletePromises);
  console.log(`[NEXT_BACKEND] [Alert Pipeline] Cron: Cleaned up ${snap.size} resolved alerts.`);
  return { deleted: snap.size };
}

/**
 * [ALERT_PIPELINE] Gemini AI Fire Verification
 * Uses @google/genai library to verify fire detection with vision models.
 */
export async function verifyWithGemini({ imageUrl }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const enableGemini = (process.env.ENABLE_GEMINI || "false").toLowerCase() === "true";

  if (!enableGemini || !apiKey) {
    console.warn("[NEXT_BACKEND] [Gemini] Verification disabled. Defaulting to FIRE DETECTED.");
    return {
      isFire: true, score: 0.95,
      reason: "Gemini verification disabled - defaulting to fire detected",
      sensitive: false, sensitiveReason: "Skipped - verification disabled"
    };
  }

  // Fetch and prepare image
  let imageParts = [];
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    imageParts = [{
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      }
    }];
  } catch (fetchError) {
    console.error("[NEXT_BACKEND] [Gemini] Error fetching image:", fetchError.message);
    return {
      isFire: false, score: 0.0,
      reason: `Failed to fetch image for verification: ${fetchError.message}`,
      sensitive: false, sensitiveReason: "Could not analyze - image fetch failed"
    };
  }

  try {
    const genAI = new GoogleGenAI(apiKey);

    // Try to discover available models, fallback to known working model
    let availableModels = [];
    let preferredModel = "gemini-2.0-flash-exp"; // Known to work with v1beta API
    
    try {
      const modelsList = await genAI.models.list();
      if (modelsList && Array.isArray(modelsList) && modelsList.length > 0) {
        availableModels = modelsList.map(m => {
          let name = m.name || m;
          if (typeof name === 'string') {
            name = name.replace(/^models\//, "");
          }
          return name;
        });
        
        // Find preferred model from available list
        const preferredOrder = [
          "gemini-2.0-flash-exp",
          "gemini-1.5-flash",
          "gemini-1.5-pro",
          "gemini-1.5-flash-latest",
          "gemini-pro"
        ];
        
        for (const preferred of preferredOrder) {
          if (availableModels.includes(preferred)) {
            preferredModel = preferred;
            break;
          }
        }
      }
    } catch (listError) {
      // Silently fallback to default model
    }

    // Define the AI prompt
    const prompt = `You are an expert fire detection AI system. Analyze this image carefully and determine if there is ACTUAL FIRE present.

    IMPORTANT CRITERIA:
    1. REAL FIRE indicators:
       - Visible flames (orange, red, yellow colors with characteristic flame shape)
       - Active combustion with bright light emission
       - Smoke accompanying flames
       - Heat distortion or glow
       - Fire spreading on materials

    2. FALSE POSITIVES to reject:
       - LED lights, lamps, or artificial lighting
       - Reflections or glare from surfaces
       - Sunlight or sunset colors
       - TV/monitor screens showing fire
       - Orange/red colored objects (clothing, decorations, etc.)
       - Camera artifacts or lens flare
       - Warning lights or indicators
       - Small, controlled flames like a candle or lighter (unless they are on a flammable object).

    3. SENSITIVE CONTENT check:
       - Identify if image contains people in distress, injuries, or graphic content
       - Note if privacy concerns exist (people in private spaces)

    Respond in this EXACT JSON format:
    {
      "isFire": true/false,
      "confidence": 0.0-1.0,
      "reasoning": "detailed explanation of your analysis",
      "fireIndicators": ["list specific fire indicators found"],
      "falsePositiveReasons": ["if not fire, list why it might have been flagged"],
      "sensitive": true/false,
      "sensitiveReason": "explanation if sensitive content detected"
    }

    Be extremely accurate. Only return isFire:true if you are highly confident there is ACTUAL FIRE, not just fire-colored objects or lights.`;

    // Construct payload and call API
    const parts = [{ text: prompt }, ...imageParts];
    
    // Build model fallback list
    const modelFallbacks = availableModels.length > 0 
      ? [...new Set([preferredModel, ...availableModels.filter(m => m.includes("gemini"))])]
      : ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];

    let result;
    let lastError;
    for (const modelName of modelFallbacks) {
      try {
        result = await genAI.models.generateContent({
          model: modelName,
          contents: [{ parts }]
        });
        break; // Success
      } catch (modelError) {
        lastError = modelError;
        const errorStatus = modelError.status || modelError.error?.status || modelError.code || modelError.error?.code;
        const errorMessage = modelError.message || JSON.stringify(modelError.error || modelError);
        const is404 = errorStatus === 404 || errorStatus === "NOT_FOUND" || errorMessage.includes("404") || errorMessage.includes("not found");
        const is429 = errorStatus === 429 || errorStatus === "RESOURCE_EXHAUSTED" || errorMessage.includes("429") || errorMessage.includes("Resource exhausted");
        const hasMoreModels = modelFallbacks.indexOf(modelName) < modelFallbacks.length - 1;
        
        if ((is404 || is429) && hasMoreModels) {
          continue; // Try next model
        } else if (hasMoreModels) {
          continue; // Try next model for other errors too
        } else {
          if (is429) {
            throw new Error(`All models rate limited. Please wait and try again later.`);
          }
          throw modelError;
        }
      }
    }
    
    if (!result) {
      throw lastError || new Error("All models failed");
    }

    // Extract text from response (handles multiple response structures)
    let text;
    try {
      if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = result.candidates[0].content.parts[0].text;
      } else if (result?.response?.text) {
        text = typeof result.response.text === 'function' ? await result.response.text() : result.response.text;
      } else if (result?.text) {
        text = typeof result.text === 'function' ? await result.text() : result.text;
      } else if (typeof result === 'string') {
        text = result;
      } else {
        text = JSON.stringify(result);
      }
    } catch (textError) {
      console.error("[NEXT_BACKEND] [Gemini] Error extracting text:", textError.message);
      text = JSON.stringify(result);
    }
    
    // Parse JSON response
    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No valid JSON found in response");
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[NEXT_BACKEND] [Gemini] ❌ Failed to parse JSON from AI response:", parseError);
      const isFireMatch = text.toLowerCase().includes('"isFire": true') || text.toLowerCase().includes('"isFire":true');
      return {
        isFire: isFireMatch, score: isFireMatch ? 0.7 : 0.3,
        reason: text.substring(0, 500), sensitive: false,
        sensitiveReason: "Could not parse sensitivity check"
      };
    }

    // Return formatted result
    const isFire = analysis.isFire === true;
    const confidence = typeof analysis.confidence === "number" ? analysis.confidence : (isFire ? 0.85 : 0.15);

    return {
      isFire, score: confidence,
      reason: analysis.reasoning || "Fire detection completed",
      fireIndicators: analysis.fireIndicators || [],
      falsePositiveReasons: analysis.falsePositiveReasons || [],
      sensitive: analysis.sensitive === true,
      sensitiveReason: analysis.sensitiveReason || "No sensitive content detected"
    };

  } catch (error) {
    console.error("[NEXT_BACKEND] [Gemini] Verification failed:", error.message);
    return {
      isFire: false, // Default to NO FIRE on error
      score: 0.0,
      reason: `Gemini verification failed: ${error.message}`,
      sensitive: false,
      sensitiveReason: "Could not verify - error occurred"
    };
  }
}

/**
 * getActiveAlertsForOwner
 */
export async function getActiveAlertsForOwner(ownerEmail) {
  const safeEmail = normalizeEmail(ownerEmail);
  const houses = await getHousesByOwnerEmail(safeEmail);
  const houseIds = houses.map((h) => h.houseId);
  if (houseIds.length === 0) return [];

  const chunkSize = 10;
  const results = [];
  for (let i = 0; i < houseIds.length; i += chunkSize) {
    const chunk = houseIds.slice(i, i + chunkSize);
    const snap = await db.collection("alerts").where("houseId", "in", chunk).where("status", "in", ["PENDING", "CONFIRMED_BY_GEMINI", "SENDING_NOTIFICATIONS", "NOTIFIED_COOLDOWN"]).get();
    snap.forEach((d) => results.push(d.data()));
  }
  return results;
}

/**
 * getAlertsByOwnerEmail
 * Optimized to only fetch active alerts and recently resolved ones (last 2 minutes)
 * to prevent Firestore quota exhaustion
 */
export async function getAlertsByOwnerEmail(ownerEmail) {
  const safeEmail = normalizeEmail(ownerEmail);
  
  // First get all houses for this owner
  const housesSnapshot = await db.collection("houses").where("ownerEmail", "==", safeEmail).get();
  const houseIds = housesSnapshot.docs.map(doc => doc.id);
  
  if (houseIds.length === 0) return [];

  const alerts = [];
  const chunkSize = 10;
  const twoMinutesAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
  
  // Get active alerts and recently created alerts (last 2 minutes) in one query
  // This reduces the number of Firestore queries significantly
  for (let i = 0; i < houseIds.length; i += chunkSize) {
    const chunk = houseIds.slice(i, i + chunkSize);
    try {
      // Fetch alerts that are either active OR recently created (last 2 min)
      // We'll filter by status in memory for the second part
      const activeSnap = await db.collection("alerts")
        .where("houseId", "in", chunk)
        .where("status", "in", ["PENDING", "CONFIRMED_BY_GEMINI", "SENDING_NOTIFICATIONS", "NOTIFIED_COOLDOWN"])
        .get();
      activeSnap.forEach(doc => {
        alerts.push({ id: doc.id, ...doc.data() });
      });
      
      // Also get recently created alerts (last 2 minutes) that might be rejected/cancelled
      // We fetch by createdAt and filter by status in memory to avoid complex queries
      const recentSnap = await db.collection("alerts")
        .where("houseId", "in", chunk)
        .where("createdAt", ">=", twoMinutesAgo)
        .get();
      
      recentSnap.forEach(doc => {
        const alertData = doc.data();
        // Only include if it's rejected/cancelled and not already in alerts array
        if ((alertData.status === "REJECTED_BY_GEMINI" || alertData.status === "CANCELLED_BY_USER") &&
            !alerts.find(a => a.id === doc.id)) {
          alerts.push({ id: doc.id, ...alertData });
        }
      });
    } catch (err) {
      console.error("[NEXT_BACKEND] Error fetching alerts for chunk:", err.message);
      // Continue with other chunks even if one fails
      // If quota exceeded, at least return what we have
      if (err.code === 8 || err.message.includes("Quota exceeded")) {
        console.warn("[NEXT_BACKEND] Quota exceeded, returning partial results");
        break; // Stop querying more chunks
      }
    }
  }
  
  return alerts;
}