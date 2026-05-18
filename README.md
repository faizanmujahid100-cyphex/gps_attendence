# GIGCCL GPS-Based Attendance System

> **Government Islamia Graduate College Civil Lines, Lahore**
>
> A complete GPS-based attendance management system with Admin & Teacher web portals and a Student Android app.

---

## Project Structure

```
gigccl-attendance/
├── web/          Next.js 14 — Admin + Teacher portals
├── mobile/       Expo React Native — Student Android APK
├── firebase/     Firestore rules, indexes, seed script
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Mobile App | Expo SDK 51, React Native |
| Backend / DB | Firebase (Firestore, Auth, Storage) |
| GPS / Maps | Google Maps Embed API, Expo Location |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| Reports | jsPDF, jsPDF-AutoTable |
| Notifications | Firebase Cloud Messaging |

---

## Quick Start

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project — e.g. `gigccl-attendance`
3. Enable **Authentication** → Sign-in providers → **Email/Password**
4. Enable **Firestore Database** → Start in test mode
5. Copy your Firebase config values

### 2. Set Up Web App

```bash
cd web
npm install
```

Edit `web/.env.local` and fill in your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...  # Optional — falls back to OpenStreetMap
```

```bash
npm run dev      # → http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
```

### 3. Seed the Database

```bash
cd firebase
npm install

# Download your Firebase Admin SDK service account key:
# Firebase Console → Project Settings → Service accounts → Generate new private key
# Save as: firebase/serviceAccountKey.json

node seed.js
```

**Default accounts created by seed:**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gigccl.edu.pk | Admin@123 |
| Teacher | dr.khan@gigccl.edu.pk | Teacher@123 |
| Teacher | ms.fatima@gigccl.edu.pk | Teacher@123 |
| Teacher | mr.hassan@gigccl.edu.pk | Teacher@123 |
| Student | s1.ali@gigccl.edu.pk | Student@123 |
| Student | s2.sara@gigccl.edu.pk | Student@123 |
| *(8 more students)* | s3–s10@gigccl.edu.pk | Student@123 |

### 4. Deploy Firestore Rules & Indexes

```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# In project root
firebase init firestore

# Deploy
cd firebase
npm run deploy:rules
npm run deploy:indexes
```

### 5. Build Mobile APK

```bash
cd mobile

# Fill in mobile/.env with Firebase config
# (same values as web, without NEXT_PUBLIC_ prefix)

npm install

# Install EAS CLI
npm install -g eas-cli
eas login

# Configure EAS (first time)
eas build:configure

# Build APK (takes ~10 minutes, runs on Expo's cloud)
eas build --platform android --profile preview

# APK download link appears in terminal and at expo.dev
```

---

## Features Overview

### Admin Portal (`/admin`)

| Page | Description |
|------|-------------|
| `/admin/dashboard` | Live stats: total students, teachers, present %, active sessions; attendance donut chart; activity feed |
| `/admin/students` | Full CRUD table; search/filter by semester & section; CSV import/export; soft-delete |
| `/admin/teachers` | Full CRUD for teacher accounts; view assigned schedules |
| `/admin/schedule` | Day-by-day timetable grid; add/edit/delete lectures; conflict detection |
| `/admin/attendance` | Browse all records; filter by date, semester, section, status; export CSV |
| `/admin/geofence` | Live map preview; update campus lat/lng/radius; default 31.572329, 74.303710, 150m |
| `/admin/complaints` | View & resolve student complaints with written responses |
| `/admin/reports` | Student-wise attendance %; PDF export; students below 75% highlighted in red |

### Teacher Portal (`/teacher`)

| Page | Description |
|------|-------------|
| `/teacher/dashboard` | Today's class cards; session status; quick stats |
| `/teacher/attendance` | Open session → live GPS tracking → manual override with reason → confirm button |
| `/teacher/history` | Past sessions; click to see full record with status breakdown |
| `/teacher/students` | Students in teacher's sections; per-subject attendance % chart |

### Student Mobile App

| Screen | Description |
|--------|-------------|
| Login | Firebase auth; role check (students only); remember email |
| Home | GPS attendance button (large circular CTA); today's schedule; overall % |
| Attendance | Subject-wise breakdown with progress bars; tap to see per-session history |
| Complaints | List complaints; FAB to submit new complaint |
| Profile | Student info; change password; logout |

---

## Attendance Flow

```
Student presses GPS button
        ↓
App requests location permission
        ↓
Get GPS coordinates (high accuracy)
        ↓
Fetch geofence_settings from Firestore
        ↓
Calculate Haversine distance
        ↓
distance ≤ radius? → Mark PRESENT (method: gps)
distance > radius? → Mark ABSENT + show distance
        ↓
Teacher sees live GPS-verified list
        ↓
Teacher can override any status (requires reason)
        ↓
Teacher clicks "Confirm Attendance"
        ↓
Unmarked students auto-marked ABSENT
Session closed — only admin can modify now
```

---

## GPS / Haversine Formula

```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
// distance ≤ radiusMeters → PRESENT
```

---

## GIGCCL Campus Geofence

- **Latitude:** 31.572329
- **Longitude:** 74.303710
- **Default Radius:** 150 meters
- Admin can update from `/admin/geofence`

---

## Environment Variables

**web/.env.local**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # Optional
```

**mobile/.env**
```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

---

## APK Build & Distribution

```bash
cd mobile

# One-time setup
npm install -g eas-cli
eas login
eas build:configure

# Build preview APK
eas build --platform android --profile preview

# Build production APK
eas build --platform android --profile production
```

After build completes:
1. Download APK from [expo.dev](https://expo.dev) or the URL in terminal output
2. Enable "Install from unknown sources" on student devices
3. Share APK via WhatsApp, Google Drive, or a QR code link
4. Students install → login with their GIGCCL email

---

## Firestore Security Rules Summary

| Collection | Student | Teacher | Admin |
|-----------|---------|---------|-------|
| users | Read own | Read all | Full CRUD |
| geofence_settings | Read | Read | Full CRUD |
| schedules | Read | Read + Write | Full CRUD |
| attendance_sessions | Read | Read + Write | Full CRUD |
| attendance_records | Read own + Create | Read + Update | Full CRUD |
| complaints | Read/Write own | — | Full CRUD |

---

## Deployment

### Web App — Vercel (Recommended)

```bash
npm install -g vercel
cd web
vercel --prod
```

Set environment variables in Vercel dashboard.

### Firebase Hosting (Alternative)

```bash
npm install -g firebase-tools
cd web && npm run build
firebase init hosting
firebase deploy --only hosting
```

---

## CSV Import Format (Students)

```csv
name,email,rollNo,semester,section,phone
Muhammad Ali,ali@gigccl.edu.pk,2024-CS-001,3,A,+92-300-0000001
```

---

## Troubleshooting

**"Permission denied" in Firestore**
→ Deploy `firebase/firestore.rules` and ensure user has correct `role` in Firestore

**Location permission denied on mobile**
→ Go to device Settings → Apps → GIGCCL Attendance → Permissions → Enable Location

**APK won't install**
→ Enable "Install unknown apps" for the file manager in device Settings

**Teacher sees no students**
→ Check that students have matching `semester` and `section` fields in Firestore

**GPS button returns "No Active Class"**
→ Teacher must first open an attendance session from the Teacher portal

---

## License

Built for GIGCCL internal use. © 2024 Government Islamia Graduate College Civil Lines, Lahore.
