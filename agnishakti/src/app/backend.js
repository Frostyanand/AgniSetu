// src/backend/backend.js
// Server-side backend helper functions for Agnishakti
// Use only from server (API routes or Node.js process).
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase"; // your firebase admin firestore instance
import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const DEFAULT_SNAPSHOT_TTL_SEC = 60 * 60 * 24 * 7; // 7 days signed url expiry

/** --------------------------
 * Helper utilities
 * -------------------------- */

/** Normalize emails used as Firestore doc IDs */
export function normalizeEmail(email) {
  if (!email || typeof email !== "string") throw new Error("Invalid email");
  return email.trim().toLowerCase();
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

/** Upload base64 JPEG to storage and return signed URL */
import fs from "fs";
import path from "path";

/** Save base64 JPEG locally in /public/uploads and return URL */
export async function uploadSnapshotBase64({ base64Image, destinationPath }) {
  if (!base64Image || !destinationPath) throw new Error("Missing snapshot or path");

  // Strip prefix if present
  const matches = base64Image.match(/^data:image\/\w+;base64,(.*)$/);
  const payload = matches ? matches[1] : base64Image;
  const buffer = Buffer.from(payload, "base64");

  // Build local path: store in public/uploads instead of Firebase
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // Use destinationPath as filename (replace / with - so it’s filesystem safe)
  const safeFileName = destinationPath.replace(/[\\/]/g, "-");
  const filePath = path.join(uploadDir, safeFileName);

  fs.writeFileSync(filePath, buffer);

  // Return URL served from Next.js public folder
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

  // Attach remote image URL inline as link in HTML; nodemailer attachments could also embed base64, but we have signed URL
  if (imageUrl) {
    mailOptions.html = (htmlBody || "") + `<p><a href="${imageUrl}" target="_blank">View detection image</a></p>`;
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
}

/** Basic Gemini check placeholder
 * If ENABLE_GEMINI !== "true", returns {isFire: true}.
 * If enabled, you must set GEMINI_API_KEY and we call an API — implement your integration here.
 */
/**
 * Verify detection using Gemini
 * - Checks if fire is present or false alarm
 * - Also checks if image has sensitive content
//  */
// export async function verifyWithGemini({ imageUrl }) {
//   if ((process.env.ENABLE_GEMINI || "false").toLowerCase() !== "true") {
//     return {
//       isFire: true,
//       score: 0.99,
//       reason: "Gemini disabled",
//       sensitive: false,
//       sensitiveReason: "Skipped"
//     };
//   }

//   if (!process.env.GEMINI_API_KEY) {
//     return {
//       isFire: true,
//       score: 0.9,
//       reason: "Missing GEMINI_API_KEY",
//       sensitive: false,
//       sensitiveReason: "Skipped"
//     };
//   }

//   try {
//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const prompt = `
//       You are an AI safety verifier.
//       1. Is this image a real hazardous fire/smoke? (true/false)
//       2. Confidence score between 0 and 1
//       3. Reason for your decision
//       4. Does this image contain sensitive/private info (faces, license plates, documents)? (true/false)
//       5. Reason for sensitive decision

//       Respond strictly in JSON:
//       {
//         "isFire": boolean,
//         "score": number,
//         "reason": string,
//         "sensitive": boolean,
//         "sensitiveReason": string
//       }
//     `;

//     // Convert URL → base64 inlineData for Gemini
//     const imgBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
//     const imgBase64 = Buffer.from(imgBuffer).toString("base64");

//     const result = await model.generateContent([
//       { text: prompt },
//       {
//         inlineData: {
//           mimeType: "image/jpeg",
//           data: imgBase64,
//         },
//       },
//     ]);

//     const text = result.response.text();
//     let parsed;
//     try {
//       parsed = JSON.parse(text);
//     } catch (err) {
//       console.warn("Gemini returned non-JSON, raw:", text);
//       parsed = { isFire: true, score: 0.8, reason: "Fallback parse", sensitive: false, sensitiveReason: "Skipped" };
//     }

//     return parsed;
//   } catch (err) {
//     console.error("Gemini verification failed:", err);
//     return {
//       isFire: true,
//       score: 0.8,
//       reason: "Gemini error fallback",
//       sensitive: false,
//       sensitiveReason: "Skipped"
//     };
//   }
// }

// /** --------------------------
//  * Users (docs keyed by normalized email)
//  * -------------------------- */

// /**
//  * registerUser
//  * - Creates or merges a user document where doc ID = normalized email
//  */
// export async function registerUser({ name, email, role = "owner" }) {
//   const safeEmail = normalizeEmail(email);
//   const userRef = db.collection("users").doc(safeEmail);
//   const data = {
//     name: name || "",
//     email: safeEmail,
//     role,
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//   };

//   await userRef.set(data, { merge: true });
//   return { success: true, email: safeEmail };
// }

// /**
//  * getUserByEmail
//  */
// export async function getUserByEmail(email) {
//   const safeEmail = normalizeEmail(email);
//   const doc = await db.collection("users").doc(safeEmail).get();
//   if (!doc.exists) return null;
//   return doc.data();
// }

// /**
//  * assignRole
//  */
// export async function assignRole(email, role) {
//   const safeEmail = normalizeEmail(email);
//   await db.collection("users").doc(safeEmail).set({ role }, { merge: true });
//   return { success: true };
// }

// /** --------------------------
//  * Houses
//  * -------------------------- */

// /**
//  * createHouse
//  * - ownerEmail (string) - will be normalized
//  * - address (string)
//  * - coords {lat, lng}
//  * - monitorPassword (plaintext) - will be hashed & stored
//  * - nearestFireStationId (optional)
//  */
// export async function createHouse({ ownerEmail, address, coords, monitorPassword, nearestFireStationId = null }) {
//   const safeEmail = normalizeEmail(ownerEmail);
//   const housesRef = db.collection("houses").doc(); // auto id
//   const houseId = housesRef.id;

//   // hash password
//   const salt = bcrypt.genSaltSync(10);
//   const passwordHash = monitorPassword ? bcrypt.hashSync(monitorPassword, salt) : null;

//   const payload = {
//     houseId,
//     ownerEmail: safeEmail,
//     address: address || "",
//     coords: coords || null,
//     nearestFireStationId: nearestFireStationId || null,
//     monitoringEnabled: true,
//     monitorPasswordHash: passwordHash,
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//   };

//   await housesRef.set(payload);
//   return { success: true, houseId };
// }

// /**
//  * getHousesByOwnerEmail
//  */
// export async function getHousesByOwnerEmail(ownerEmail) {
//   const safeEmail = normalizeEmail(ownerEmail);
//   const snap = await db.collection("houses").where("ownerEmail", "==", safeEmail).get();
//   return snap.docs.map((d) => d.data());
// }

// /**
//  * getHouseById
//  */
// export async function getHouseById(houseId) {
//   const doc = await db.collection("houses").doc(houseId).get();
//   if (!doc.exists) return null;
//   return doc.data();
// }

// /**
//  * updateHouse (partial updates)
//  * - updates object can include address, coords, nearestFireStationId, monitoringEnabled
//  */
// export async function updateHouse(houseId, updates = {}) {
//   if (!houseId) throw new Error("houseId required");
//   const safeUpdates = { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
//   await db.collection("houses").doc(houseId).set(safeUpdates, { merge: true });
//   return { success: true };
// }

// /**
//  * setHouseMonitorPassword
//  */
// export async function setHouseMonitorPassword(houseId, newPassword) {
//   const salt = bcrypt.genSaltSync(10);
//   const hash = bcrypt.hashSync(newPassword, salt);
//   await db.collection("houses").doc(houseId).set({ monitorPasswordHash: hash }, { merge: true });
//   return { success: true };
// }

// /**
//  * verifyHousePassword
//  */
// export async function verifyHousePassword(houseId, candidatePassword) {
//   const doc = await db.collection("houses").doc(houseId).get();
//   if (!doc.exists) throw new Error("House not found");
//   const data = doc.data();
//   if (!data.monitorPasswordHash) return false;
//   const ok = bcrypt.compareSync(candidatePassword, data.monitorPasswordHash);
//   return ok;
// }

// /** --------------------------
//  * Cameras
//  * -------------------------- */

// /**
//  * addCamera
//  * - houseId
//  * - label
//  * - source (rtsp, local-usb, etc.)
//  * - streamType (rtsp|usb|webrtc|other)
//  */
// export async function addCamera({ houseId, label, source, streamType = "rtsp" }) {
//   if (!houseId) throw new Error("houseId required");
//   const cameraRef = db.collection("cameras").doc();
//   const cameraId = cameraRef.id;
//   const payload = {
//     cameraId,
//     houseId,
//     label: label || "",
//     source: source || "",
//     streamType,
//     isMonitoring: false,
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     lastSeen: null,
//   };
//   await cameraRef.set(payload);
//   return { success: true, cameraId };
// }

// /**
//  * getCamerasByHouse
//  */
// export async function getCamerasByHouse(houseId) {
//   const snap = await db.collection("cameras").where("houseId", "==", houseId).get();
//   return snap.docs.map((d) => d.data());
// }

// /**
//  * getCamerasByOwnerEmail
//  * - collects all houses for owner then queries cameras using 'in' (chunked)
//  */
// export async function getCamerasByOwnerEmail(ownerEmail) {
//   const safeEmail = normalizeEmail(ownerEmail);
//   const housesSnap = await db.collection("houses").where("ownerEmail", "==", safeEmail).get();
//   const houseIds = housesSnap.docs.map((d) => d.id || d.data().houseId).filter(Boolean);
//   if (houseIds.length === 0) return [];

//   // Firestore 'in' supports up to 10 values per query - chunk if needed
//   const chunkSize = 10;
//   const results = [];
//   for (let i = 0; i < houseIds.length; i += chunkSize) {
//     const chunk = houseIds.slice(i, i + chunkSize);
//     const camerasSnap = await db.collection("cameras").where("houseId", "in", chunk).get();
//     camerasSnap.forEach((d) => results.push(d.data()));
//   }
//   return results;
// }

// /**
//  * updateCamera
//  */
// export async function updateCamera(cameraId, updates = {}) {
//   await db.collection("cameras").doc(cameraId).set({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
//   return { success: true };
// }

// /**
//  * deleteCamera
//  */
// export async function deleteCamera(cameraId) {
//   await db.collection("cameras").doc(cameraId).delete();
//   return { success: true };
// }

// /**
//  * startMonitoring / stopMonitoring
//  * - toggles camera.isMonitoring
//  * - optionally update lastSeen or notify Python backend via a publish mechanism later
//  */
// export async function startMonitoring(cameraId) {
//   await db.collection("cameras").doc(cameraId).set({ isMonitoring: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
//   return { success: true };
// }

// export async function stopMonitoring(cameraId) {
//   await db.collection("cameras").doc(cameraId).set({ isMonitoring: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
//   return { success: true };
// }

// /** --------------------------
//  * Fire Stations & provider assignment
//  * -------------------------- */

// /**
//  * addFireStation
//  * - station: { name, phone, email, coords: {lat,lng}, radiusKm }
//  */
// // export async function addFireStation(station) {
// //   const ref = db.collection("fireStations").doc();
// //   const stationId = ref.id;
// //   await ref.set({ stationId, ...station, createdAt: admin.firestore.FieldValue.serverTimestamp() });
// //   return { success: true, stationId };
// // }


// /**
//  * NEW FUNCTION: registerFireStation
//  * - This is a high-level function that handles the entire provider registration flow.
//  * - It creates the user, creates the station, and links them together.
//  */
// export async function registerFireStation({ email, name, stationName, stationAddress, stationPhone, coords }) {
//     // Step 1: Register the user with the 'provider' role.
//     await registerUser({ name, email, role: 'provider' });

//     // Step 2: Add the fire station details to the 'fireStations' collection.
//     const stationData = {
//         name: stationName,
//         address: stationAddress,
//         phone: stationPhone,
//         email: normalizeEmail(email), // Use the provider's email for the station
//         coords
//     };
//     const { stationId } = await addFireStation(stationData);

//     // Step 3: Link the newly created station to the provider's user account.
//     await assignStationToProvider(email, stationId);

//     return { success: true, userEmail: normalizeEmail(email), stationId };
// }


// /**
//  * addFireStation
//  * (No changes needed to the code, but this is the function being called)
//  * - station: { name, phone, email, coords }
//  */
// export async function addFireStation(station) {
//     const ref = db.collection("fireStations").doc();
//     const stationId = ref.id;
//     // Add the provider's email to the station data for easy reference
//     const payload = { 
//         stationId, 
//         ...station, 
//         providerEmail: normalizeEmail(station.email),
//         createdAt: admin.firestore.FieldValue.serverTimestamp() 
//     };
//     await ref.set(payload);
//     return { success: true, stationId };
// }


// /**
//  * findNearestFireStation(houseCoords)
//  * - Computes nearest station by haversine distance
//  */
// export async function findNearestFireStation({ lat, lng }) {
//   const snap = await db.collection("fireStations").get();
//   if (snap.empty) return null;
//   let best = null;
//   snap.forEach((d) => {
//     const data = d.data();
//     if (!data.coords) return;
//     const dist = haversineKm(lat, lng, data.coords.lat, data.coords.lng);
//     if (!best || dist < best.dist) best = { station: data, dist };
//   });
//   return best ? best.station : null;
// }

// /**
//  * assignStationToProvider
//  * - updates user's assignedStations array (stored inside users doc as array)
//  */
// export async function assignStationToProvider(providerEmail, stationId) {
//   const safeEmail = normalizeEmail(providerEmail);
//   await db.collection("users").doc(safeEmail).set({ assignedStations: admin.firestore.FieldValue.arrayUnion(stationId) }, { merge: true });
//   return { success: true };
// }
export async function verifyWithGemini({ imageUrl }) {
  // Check if Gemini is enabled
  if ((process.env.ENABLE_GEMINI || "false").toLowerCase() !== "true") {
    return {
      isFire: true,
      score: 0.99,
      reason: "Gemini disabled via environment",
      sensitive: false,
      sensitiveReason: "Skipped"
    };
  }

  // Check if API key exists
  if (!process.env.GEMINI_API_KEY) {
    return {
      isFire: true,
      score: 0.9,
      reason: "Missing GEMINI_API_KEY",
      sensitive: false,
      sensitiveReason: "Skipped"
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an AI safety verifier.
      1. Is this image a real hazardous fire/smoke? (true/false)
      2. Confidence score between 0 and 1
      3. Reason for your decision
      4. Does this image contain sensitive/private info (faces, license plates, documents)? (true/false)
      5. Reason for sensitive decision

      Respond strictly in JSON:
      {
        "isFire": boolean,
        "score": number,
        "reason": string,
        "sensitive": boolean,
        "sensitiveReason": string
      }
    `;

    // Convert URL → base64 inlineData for Gemini
    const imgBuffer = await fetch(imageUrl);
    if (!imgBuffer.ok) throw new Error(`Failed to fetch image, status ${imgBuffer.status}`);
    const arrayBuffer = await imgBuffer.arrayBuffer();
    const imgBase64 = Buffer.from(arrayBuffer).toString("base64");

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imgBase64
        }
      }
    ]);

    const text = result.response.text();
    console.log("Gemini raw response:", text);

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (parseErr) {
      console.warn("Gemini returned non-JSON, falling back. Raw:", text);
      return {
        isFire: true,
        score: 0.8,
        reason: "Fallback parse after non-JSON Gemini response",
        sensitive: false,
        sensitiveReason: "Skipped"
      };
    }
  } catch (err) {
    console.error("Gemini verification failed:", err);
    return {
      isFire: true,
      score: 0.8,
      reason: `Gemini error fallback: ${err.message}`,
      sensitive: false,
      sensitiveReason: "Skipped"
    };
  }
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
 * - returns houses assigned to provider's stations, with latest alert status if any
 */
export async function getProviderDashboardData(providerEmail) {
  const stationIds = await getProviderAssignedStations(providerEmail);
  if (!stationIds || stationIds.length === 0) return [];
  // get houses where nearestFireStationId in stationIds (chunk if >10)
  const chunkSize = 10;
  const houses = [];
  for (let i = 0; i < stationIds.length; i += chunkSize) {
    const chunk = stationIds.slice(i, i + chunkSize);
    const snap = await db.collection("houses").where("nearestFireStationId", "in", chunk).get();
    snap.forEach((d) => houses.push(d.data()));
  }
  // for each house we may attach active alerts (optional: query)
  // collect houseIds and get active alerts in one go
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
 * - called by Python (must supply serviceKey to authenticate)
 * - body: { serviceKey, cameraId, className, confidence, bbox, timestamp, snapshotBase64 }
 *
 * Flow:
 *  - Validate service key
 *  - Load camera -> house mapping
 *  - Create alerts/{alertId} doc with status PENDING
 *  - Upload snapshot to Storage and update alert doc
 *  - Optionally run Gemini check -> if false -> mark CANCELLED and return
 *  - Mark CONFIRMED -> find owner & nearest firestation -> send emails -> set flags
 */export async function triggerAlert(payload) {
  const {
    serviceKey,
    cameraId,
    className,
    confidence,
    bbox,
    timestamp,
    snapshotBase64,
  } = payload;

  // 🔐 Validate service key
  if (!serviceKey || serviceKey !== process.env.SERVICE_KEY) {
    throw { status: 401, message: "Invalid service key" };
  }
  if (!cameraId) throw new Error("cameraId required");

  // 🎥 Fetch camera + house
  const camDoc = await db.collection("cameras").doc(cameraId).get();
  if (!camDoc.exists) throw new Error("Camera not found");
  const cam = camDoc.data();

  const houseId = cam.houseId;
  const houseDoc = await db.collection("houses").doc(houseId).get();
  if (!houseDoc.exists) throw new Error("House not found");
  const house = houseDoc.data();

  // 📄 Create alert doc (PENDING)
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

  // 📷 Upload snapshot (if provided)
  let snapshotUrl = null;
  if (snapshotBase64) {
    const dest = `snapshots/${houseId}/${alertId}.jpg`;
    snapshotUrl = await uploadSnapshotBase64({
      base64Image: snapshotBase64,
      destinationPath: dest,
    });
    await alertRef.set({ detectionImage: snapshotUrl }, { merge: true });
  }

  // 🤖 Gemini verification
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

  // ✅ Confirm + attach Gemini results
  await alertRef.set(
    { status: "CONFIRMED", geminiCheck: geminiRes },
    { merge: true }
  );

  // 👤 Fetch owner
  const ownerEmail = house.ownerEmail;
  const ownerDoc = await db.collection("users").doc(ownerEmail).get();
  const owner = ownerDoc.exists ? ownerDoc.data() : { email: ownerEmail };

  // 🚒 Find nearest firestation
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

  // 📍 GPS link
    const gpsLink = house.coords
      ? `http://maps.google.com/?q=${house.coords.lat},${house.coords.lng}`
      : null;

  // 📧 Compose owner email
  const subjectOwner = `URGENT: Fire detected at your property (${
    house.address || houseId
  })`;
  const htmlOwner = `<p>Dear ${owner.name || "Owner"},</p>
    <p>We detected ${className} at your property (${
    house.address || "address unavailable"
  }) at ${new Date().toISOString()}.</p>
    <p><a href="${gpsLink}" target="_blank">Open location in Google Maps</a></p>`;

  // 🚫 Skip sending images if flagged sensitive
  const attachImage = !geminiRes.sensitive;

  // send owner email
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

  // send to firestation
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

  // 📝 Mark emails sent
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
 * deleteHouse
 * - Deletes a house document from Firestore.
 */
export async function deleteHouse(houseId) {
  if (!houseId) throw new Error("houseId required");
  await db.collection("houses").doc(houseId).delete();
  return { success: true };
}

/**
 * cancelAlert
 * - Called by owner to cancel pending alert (owner must authenticate via ID token at API layer)
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
  // chunk
  const chunkSize = 10;
  const results = [];
  for (let i = 0; i < houseIds.length; i += chunkSize) {
    const chunk = houseIds.slice(i, i + chunkSize);
    const snap = await db.collection("alerts").where("houseId", "in", chunk).where("status", "in", ["PENDING", "CONFIRMED", "NOTIFIED"]).get();
    snap.forEach((d) => results.push(d.data()));
  }
  return results;
}

/** --------------------------
 * Export list
 * -------------------------- */

export default {
  normalizeEmail,
  registerUser,
  getUserByEmail,
  assignRole,
  createHouse,
  getHousesByOwnerEmail,
  getHouseById,
  updateHouse,
  setHouseMonitorPassword,
  verifyHousePassword,
  addCamera,
  getCamerasByHouse,
  getCamerasByOwnerEmail,
  updateCamera,
  deleteCamera,
  startMonitoring,
  stopMonitoring,
  addFireStation,
  registerFireStation,
  findNearestFireStation,
  assignStationToProvider,
  getProviderAssignedStations,
  getProviderDashboardData,
  triggerAlert,
  cancelAlert,
  getActiveAlertsForOwner,
  uploadSnapshotBase64,
  sendAlertEmail,
  verifyWithGemini,
  deleteHouse,
};
