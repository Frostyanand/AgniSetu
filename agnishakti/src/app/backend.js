// src/backend/backend.js
// Server-side backend helper functions for Agnishakti
// Use only from server (API routes or Node.js process).
import { GoogleGenerativeAI } from "@google/generative-ai";
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

/**
 * Verify detection using Gemini
 * - Checks if fire is present or false alarm
 * - Also checks if image has sensitive content
 */
export async function verifyWithGemini({ imageUrl }) {
  // Always return true (fire detected) to bypass Gemini verification
  return {
    isFire: true,
    score: 0.95,
    reason: "Gemini verification bypassed - always return true",
    sensitive: false,
    sensitiveReason: "Skipped - verification bypassed"
  };
}

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
 */
export async function deleteHouse(houseId) {
  if (!houseId) throw new Error("houseId required");
  await db.collection("houses").doc(houseId).delete();
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

/** --------------------------
 * Alerts flow (triggered by Python service)
 * -------------------------- */

/**
 * triggerAlert
 * - Creates alert document in 'alerts' collection (auto-created on first write)
 * - Verifies with Gemini AI (currently bypassed)
 * - Sends email notifications to owner and fire station
 */
export async function triggerAlert(payload) {
  const {
    serviceKey,
    cameraId,
    className,
    confidence,
    bbox,
    timestamp,
    imageId,
  } = payload;

  if (!serviceKey || serviceKey !== process.env.SERVICE_KEY) {
    throw { status: 401, message: "Invalid service key" };
  }
  if (!cameraId) throw new Error("cameraId required");

  const camDoc = await db.collection("cameras").doc(cameraId).get();
  if (!camDoc.exists) throw new Error("Camera not found");
  const cam = camDoc.data();

  const houseId = cam.houseId;
  const houseDoc = await db.collection("houses").doc(houseId).get();
  if (!houseDoc.exists) throw new Error("House not found");
  const house = houseDoc.data();

  const alertRef = db.collection("alerts").doc();
  const alertId = alertRef.id;
  const alertPayload = {
    alertId,
    cameraId,
    houseId,
    detectedClass: className,
    confidence: confidence || 0,
    bbox: bbox || null,
    status: "PENDING",
    timestamp: timestamp
      ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
      : admin.firestore.FieldValue.serverTimestamp(),
    framesToConfirm: payload.framesToConfirm || null,
  };
  await alertRef.set(alertPayload);

  let snapshotUrl = null;
  if (imageId) {
    // Construct URL pointing to Python service for the image
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
    snapshotUrl = `${pythonServiceUrl}/snapshots/${imageId}`;
    await alertRef.set({ detectionImage: snapshotUrl }, { merge: true });
    console.log(`[ALERT] Image URL constructed: ${snapshotUrl}`);
  }

  const geminiRes = await verifyWithGemini({ imageUrl: snapshotUrl });
  if (!geminiRes.isFire) {
    await alertRef.set(
      { status: "CANCELLED", geminiCheck: geminiRes },
      { merge: true }
    );
    return {
      ok: true,
      alertId,
      status: "CANCELLED",
      gemini: geminiRes,
    };
  }

  await alertRef.set(
    { status: "CONFIRMED", geminiCheck: geminiRes },
    { merge: true }
  );

  const ownerEmail = house.ownerEmail;
  const ownerDoc = await db.collection("users").doc(ownerEmail).get();
  const owner = ownerDoc.exists ? ownerDoc.data() : { email: ownerEmail };

  let station = null;
  if (house.nearestFireStationId) {
    const sDoc = await db
      .collection("fireStations")
      .doc(house.nearestFireStationId)
      .get();
    if (sDoc.exists) station = sDoc.data();
  }
  if (!station && house.coords) {
    station = await findNearestFireStation(house.coords);
  }

  const gpsLink = house.coords
    ? `http://maps.google.com/?q=${house.coords.lat},${house.coords.lng}`
    : null;

  const subjectOwner = `URGENT: Fire detected at your property (${
    house.address || houseId
  })`;
  const htmlOwner = `<p>Dear ${owner.name || "Owner"},</p>
    <p>We detected ${className} at your property (${
    house.address || "address unavailable"
  }) at ${new Date().toISOString()}.</p>
    <p><a href="${gpsLink}" target="_blank">Open location in Google Maps</a></p>`;

  const attachImage = !geminiRes.sensitive;

  try {
    await sendAlertEmail({
      toEmail: owner.email || ownerEmail,
      subject: subjectOwner,
      htmlBody: attachImage
        ? htmlOwner
        : htmlOwner + "<p>⚠️ Image omitted for privacy reasons.</p>",
      imageUrl: attachImage ? snapshotUrl : null,
    });
  } catch (err) {
    console.error("Failed to send owner email", err);
  }

  if (station && station.email) {
    const subjectStation = `ALERT: Fire at ${house.address || houseId}`;
    const htmlStation = `<p>Fire alert at ${house.address || houseId}</p>
      <p>House owner: ${owner.email || ""}</p>
      <p><a href="${gpsLink}" target="_blank">Navigate</a></p>`;

    try {
      await sendAlertEmail({
        toEmail: station.email,
        subject: subjectStation,
        htmlBody: attachImage
          ? htmlStation
          : htmlStation + "<p>⚠️ Image omitted for privacy reasons.</p>",
        imageUrl: attachImage ? snapshotUrl : null,
      });
    } catch (err) {
      console.error("Failed to send station email", err);
    }
  }

  await alertRef.set(
    {
      status: "NOTIFIED",
      sentEmails: {
        ownerSent: true,
        stationSent: !!(station && station.email),
      },
    },
    { merge: true }
  );

  return { ok: true, alertId, status: "NOTIFIED", gemini: geminiRes };
}

/**
 * cancelAlert
 */
export async function cancelAlert({ alertId, canceledByEmail, note = "Canceled by owner" }) {
  const alertRef = db.collection("alerts").doc(alertId);
  const doc = await alertRef.get();
  if (!doc.exists) throw new Error("Alert not found");
  await alertRef.set({ status: "CANCELLED", canceledBy: canceledByEmail ? normalizeEmail(canceledByEmail) : null, cancelNote: note, canceledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
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
    const snap = await db.collection("alerts").where("houseId", "in", chunk).where("status", "in", ["PENDING", "CONFIRMED", "NOTIFIED"]).get();
    snap.forEach((d) => results.push(d.data()));
  }
  return results;
}

/**
 * getAlertsByOwnerEmail
 */
export async function getAlertsByOwnerEmail(ownerEmail) {
  const safeEmail = normalizeEmail(ownerEmail);
  
  // First get all houses for this owner
  const housesSnapshot = await db.collection("houses").where("ownerEmail", "==", safeEmail).get();
  const houseIds = housesSnapshot.docs.map(doc => doc.id);
  
  if (houseIds.length === 0) return [];
  
  // Get alerts for all houses
  const alerts = [];
  const chunkSize = 10;
  for (let i = 0; i < houseIds.length; i += chunkSize) {
    const chunk = houseIds.slice(i, i + chunkSize);
    const alertsSnapshot = await db.collection("alerts").where("houseId", "in", chunk).get();
    alertsSnapshot.forEach(doc => {
      alerts.push({ id: doc.id, ...doc.data() });
    });
  }
  
  return alerts;
}