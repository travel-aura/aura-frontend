# Aura Frontend - Project Documentation

## Project Overview

**Aura** is a mobile-first webapp for sharing location-verified photos with EXIF metadata. Users capture moments at real places, and the backend verifies GPS coordinates to ensure authenticity.

**Design Priority**: Mobile phone webapp (not desktop-first)

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Font**: Geist Sans
- **Image Processing**:
  - `exifr` - EXIF metadata extraction
  - `browser-image-compression` - Image optimization & WebP conversion

## Quick Reference

### Key Files
- `shared/aura-schema.ts` - Source of truth for data contracts
- `src/services/uploadService.ts` - Upload logic with EXIF extraction
- `src/app/upload/page.tsx` - Upload UI (max 3 photos)
- `src/lib/auth.ts` - JWT token management
- `src/lib/api.ts` - API utilities

### Upload Flow Summary
```
User selects 1-3 photos → Pick GPS anchor photo → Fill title/category
→ Frontend extracts EXIF from anchor (if exists)
→ Compress all to WebP
→ Single POST with FormData:
  - 'images': [file1, file2, file3]  // Same field name
  - 'metadata': { title, archetype_tag, lat?, lng?, is_verified }
→ Backend: upload.array('images', 5)
→ Database: image_urls TEXT[] + nullable GPS
```

### GPS Handling
- **With GPS**: `is_verified: true`, includes `lat`, `lng`, `altitude`, `heading`
- **Without GPS**: `is_verified: false`, GPS fields omitted

### Critical Naming
- FormData field: `images`
- Backend Multer: `upload.array('images', 5)`
- Database column: `image_urls TEXT[]`
- RPC parameter: `p_image_urls TEXT[]`

## Current Implementation

### ✅ Completed Features

#### 1. Authentication System
- **Login** (`/login`) - Email/password authentication
- **Register** (`/register`) - New user signup with name, email, password
- **JWT Token Management** - Tokens stored in localStorage
- **Auto-redirect** - After login/register → redirects to `/profile`

**Flow**:
```
User logs in → Backend returns { session: { access_token } }
→ Frontend saves token to localStorage as 'aura_token'
→ Token automatically included in all authenticated API requests
```

#### 2. Multi-Photo Upload with EXIF Processing (Carousel Support)
**Location**: `/upload`

**"Magic" 4-Step Process**:
1. **Extract** - Reads GPS (lat/lng), altitudeitude, heading from EXIF before compression (from anchor photo)
   - If GPS found → `is_verified: true` + GPS data included
   - If NO GPS → `is_verified: false` + GPS data omitted (not sent to backend)
2. **Compress** - Converts any image format (JPG, PNG, HEIC) → WebP (max 400KB, 1440px) for all photos
3. **Pack** - Bundles ALL optimized images + metadata into single FormData
4. **Ship** - Sends to backend with JWT authentication in ONE request

**Features**:
- **Multi-photo carousel** (max 3 photos per upload)
- Single request with all photos for atomic operation
- **GPS optional** - Upload works with or without location data
- GPS photo selector (choose which photo to use for location data - applied to all)
- Upload progress tracking with visual progress bar
- Category selection: "The Angle", "The Path", "The Spot", "The Interior"
- Title & description input (shared across all photos in carousel)
- Loading states & error handling
- Auto-redirect to feed after successful upload
- "Change" button to reselect photos
- Yellow warning banner if no GPS data found

**Supported Formats**: JPG, PNG, HEIC (iPhone), WebP, etc.

**Upload Limit**: Maximum 3 photos per post (enforced at selection)

**Carousel Structure**:
- All photos share same GPS coordinates (from anchor photo) if GPS exists
- All photos share same title, description, category
- Stored in database as single row with `image_urls` array (TEXT[])
- `is_verified: false` if no GPS data found

**GPS Optional Behavior**:
```
Photos WITH GPS (original camera photos):
→ Extract GPS → Upload with lat/lng/altitude/heading → is_verified: true
→ Redirect to feed immediately

Photos WITHOUT GPS (screenshots, downloads, edited photos):
→ No GPS found → Upload WITHOUT GPS fields → is_verified: false
→ Show warning: "⚠️ No location data found. Upload completed as unverified."
→ Auto-dismiss after 3 seconds → Redirect to feed
```

#### 3. Feed/Landing Page
**Location**: `/` (Home)

**Features**:
- Fetches all users' posts from `GET /api/auras/feed?limit=10&offset=0`
- Two-column masonry layout
- Shows latest 10 posts by default (sorted by `created_at` DESC)
- "Load More" pagination button
- Displays first image from carousel (`image_urls[0]`)
- Multi-image indicator (layers icon) for carousels
- Shows archetype badge, title, description
- Relative timestamps (5m ago, 2h ago, 3d ago)
- Verification pin 📍 for GPS-verified posts

**Data Flow**:
```typescript
GET /api/auras/feed?limit=10&offset=0
→ Returns: { ok: true, auras: Post[], pagination: {...} }
→ Display in two-column grid
→ Load More → offset=10, offset=20, etc.
```

#### 4. Profile Page
**Location**: `/profile`

**Features**:
- Fetches current user's posts from `GET /api/auras/me`
- Fetches archetype statistics from `GET /api/auras/me/stats`
- Real-time stats calculation (count & percentage per archetype)
- Grid display of user's uploaded posts (3 columns)
- Shows first image from carousel with multi-image indicator
- Tabs: Uploaded / Saved (Saved not yet implemented)
- Edit profile button
- Auto-redirect to login if not authenticated

**Archetype Stats Display**:
```
Angle    Path    Spot    Interior
  5       3       12        2
22.73%  13.64%  54.55%   9.09%
```

#### 5. Profile & Edit Profile Pages
**Locations**: `/profile`, `/profile/edit`

**Profile Page Features**:
- Displays user's **name** under profile picture
- Shows user bio (if exists)
- Fetches current user's posts from `GET /api/auras/me`
- Fetches archetype statistics from `GET /api/auras/me/stats`
- Real-time stats calculation (count & percentage per archetype)
- Grid display of user's uploaded posts (3 columns)
- Shows first image from carousel with multi-image indicator
- Tabs: Uploaded / Saved (Saved not yet implemented)
- Edit profile button
- Auto-redirect to login if not authenticated

**Edit Profile Features**:
- Fetches current user profile from `GET /me`
- Edit name (max 10 characters)
- Edit bio (max 100 characters)
- Character counters for name and bio
- **Account section**: Shows user's email
- Saves changes via `PUT /api/profile/update`
- Validation: name is required
- Error handling for rate limits and failed saves
- Auto-redirect to profile after successful save

**Backend Response Format**:
```typescript
// GET /me returns
{
  ok: true,
  user: {
    id: string;               // UUID (note: "id", not "user_id")
    email: string;
    name?: string;            // May not exist for new users
    bio?: string | null;
    avatar_url?: string | null;
  }
}

// PUT /api/profile/update payload
{
  name?: string;              // Max 10 chars
  bio?: string;               // Max 100 chars
}
```

**Display Logic**:
- Profile page: Shows **name** under profile picture (fallback to email prefix if no name)
- Edit profile page: Shows **email** in Account section at bottom

#### 6. Pages Implemented

- **Feed/Home** (`/`) - Two-column masonry feed with real backend data & pagination
- **Upload** (`/upload`) - Multi-photo upload with EXIF processing
- **Profile** (`/profile`) - User profile with name, bio, posts & archetype stats
- **Edit Profile** (`/profile/edit`) - Name & bio editing with validation
- **Login** (`/login`) - Authentication
- **Register** (`/register`) - User signup

#### 7. Design Updates
- **Removed mock phone status bars** - Cleaned up time, battery, signal indicators from all pages (these were design mockups, not needed in actual webapp)

## API Integration

### Backend URL
**Local Development**: `http://localhost:8080`
**Production**: `https://aura-backend-255644230597.us-central1.run.app`

Currently configured for **localhost** (local development).

### Endpoints Used

```typescript
// Authentication
POST /auth/register
POST /auth/login
POST /auth/logout

// User Profile
GET /me                          // Get current user info
PUT /api/profile/update          // Update user profile (name, bio)

// Auras/Posts
GET /api/auras/feed              // Get all auras (paginated) ?limit=10&offset=0
GET /api/auras/me                // Get current user's auras
GET /api/auras/me/stats          // Get current user's archetype statistics
POST /api/auras/upload           // Upload new aura with images
```

### Backend Responses

**Feed Response:**
```json
{
  "ok": true,
  "auras": [
    {
      "id": "uuid",
      "title": "Beach Sunset",
      "image_urls": ["url1", "url2"],
      "archetype_tag": "The Path",
      "created_at": "2026-03-18T...",
      "is_verified": true,
      ...
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 10
  }
}
```

**Stats Response:**
```json
{
  "ok": true,
  "stats": {
    "angle": 5,
    "path": 3,
    "spot": 12,
    "interior": 2
  }
}
```

**User's Posts Response:**
```json
{
  "ok": true,
  "auras": [...]
}
```

### Authentication Headers
All authenticated requests include:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Feed/Home
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Register
│   ├── upload/page.tsx             # Upload with EXIF processing
│   ├── profile/
│   │   ├── page.tsx                # Profile view
│   │   └── edit/page.tsx           # Edit profile
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind imports
├── lib/
│   ├── api.ts                      # API utilities (apiPost, apiGet)
│   └── auth.ts                     # Token management (saveToken, getToken)
├── services/
│   └── uploadService.ts            # Image upload with EXIF extraction
└── shared/
    └── aura-schema.ts              # SOURCE OF TRUTH: Data contracts & types
```

## Shared Schema (Source of Truth)

**Location**: `shared/aura-schema.ts`

This file contains TypeScript interfaces that define the data contract between frontend and backend. All code should reference these types to ensure consistency.

**CRITICAL**: Uses **snake_case** to match SQL exactly (`image_urls`, `archetype_tag`, `created_at`, `is_verified`).

**Key Types**:
1. `Archetype` - Union type for category tags
2. `Aura` - Complete database object with all fields
3. `Post` - Simplified for profile/feed display
4. `AuraUploadMetadata` - What frontend sends in upload
5. `ProfileData` - Profile page response structure
6. `InsertAuraParams` - Backend RPC function parameters
7. `FeedResponse` - Feed response with pagination
8. `ArchetypeStats` - Archetype statistics
9. `UserProfile` - User profile from GET /me endpoint
10. `ProfileUpdatePayload` - Profile update request body

**Usage**:
```typescript
import type { Post, ArchetypeStats } from '@/shared/aura-schema';

// Feed posts
const posts: Post[] = feedResponse.auras;

// Stats
const stats: ArchetypeStats = {
  angle: 5,
  path: 3,
  spot: 12,
  interior: 2
};
```

**Key Fields**:
- `image_urls` (NOT `imageUrls`) - Array of image URLs for carousel
- `archetype_tag` (NOT `archetypeTag`) - Category tag
- `created_at` (NOT `createdAt`) - Timestamp
- `is_verified` (NOT `isVerified`) - GPS verification flag

**UserProfile Schema**:
```typescript
export interface UserProfile {
  id: string;               // UUID (backend sends "id", not "user_id")
  email: string;
  name?: string;            // Max 10 chars, may not exist for new users
  bio?: string | null;      // Max 100 chars, optional
  avatar_url?: string | null; // Optional
}

export interface ProfileUpdatePayload {
  name?: string;            // Max 10 chars
  bio?: string;             // Max 100 chars
}
```

**Important Notes**:
- Backend returns `{ ok: true, user: UserProfile }` - user data is nested
- Field `id` (not `user_id`) matches Supabase auth response
- `name`, `bio`, `avatar_url` are optional - new users may not have them set
- Frontend falls back to email prefix if `name` is missing

## Configuration

### Environment Variables

**`.env.local`** (local development):
```env
NEXT_PUBLIC_API_URL=http://10.124.57.22:8080
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
```
*(Using network IP for mobile device testing)*
*(Actual Mapbox token stored in .env.local - not committed to git)*

**`Dockerfile`** (production):
```dockerfile
ENV NEXT_PUBLIC_API_URL=https://aura-backend-255644230597.us-central1.run.app
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
```
*(Mapbox token passed as build argument during deployment)*

**Deployment with Cloud Build:**
```bash
gcloud run deploy aura-frontend --source . \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

### CORS Configuration (Backend Required)

For local development, backend must have CORS configured:

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3006',
    'http://10.124.57.22:3006',  // Your local network
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Deployment URLs
- **Frontend**: https://aura-frontend-255644230597.us-central1.run.app/
- **Backend**: https://aura-backend-255644230597.us-central1.run.app/

## Development Setup

### Local Testing

1. **Start Backend** (in backend directory):
   ```bash
   # Make sure backend runs on network IP
   node server.js
   # Should be accessible at http://192.168.1.30:8080
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   # Runs at http://192.168.1.30:3003 (or available port)
   ```

3. **Test on Phone**:
   - Ensure phone is on same WiFi network
   - Navigate to `http://192.168.1.30:3003`
   - Works with actual device camera photos (HEIC with GPS)

### Important Notes

- **Mobile-first**: All layouts use full-width responsive design (`min-h-screen`, `w-full`)
- **No mock data in upload**: Real file input, actual EXIF extraction, live uploads
- **Token persistence**: JWT stored in localStorage (survives page refreshes)
- **HEIC support**: iPhone photos automatically converted to WebP

## Design Tokens (from Figma)

```typescript
// Colors
Active nav / accent: #fa6460 (coral/red)
Brand dark: #2c2c2c
Filter pill active bg: #5a5a5a, text: #f5f5f5
Body text: #1e1e1e, secondary: #757575
Username text: rgba(17,17,17,0.8)
Card badge: bg #2c2c2c, text #f3f3f3
```

## Figma Reference
- **File**: Aura_working
- **URL**: https://www.figma.com/design/NQ7XLgy8r4H0v0bFfJ0KKH/Aura_working
- **Key Screens**:
  - 1:59 = Feed (Landing Page)
  - 9:20 = Upload empty state
  - 9:41 = Upload filled state
  - 13:149 = Detail Page

## Key Implementation Details

### 1. Authentication Flow
```typescript
// Login/Register saves token
const response = await apiPost('/auth/login', { email, password });
if (response.session?.access_token) {
  saveToken(response.session.access_token);
}

// Upload reads token
const token = getToken();
fetch('/api/auras/upload', {
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### 2. Multi-Photo Upload Flow (with GPS Optional)
```typescript
// 1. Extract EXIF from anchor photo (before compression strips it)
const exifData = await exifr.parse(gpsAnchorFile, {
  gps: true,
  altitudeitude: true,
  imgDirection: true
});

// Check if GPS data exists
let sharedGPS = {};
let isVerified = true;

if (!exifData?.latitude || !exifData?.longitude) {
  // No GPS found - upload as unverified
  console.warn('⚠️ No GPS data found. Upload will proceed as unverified.');
  isVerified = false;
  // sharedGPS remains empty - fields will not be sent to backend
} else {
  // GPS found - include coordinates
  sharedGPS = {
    lat: exifData.latitude,
    lng: exifData.longitude,
    altitude: exifData.altitudeitude || 0,
    heading: exifData.GPSImgDirection || 0
  };
  isVerified = true;
}

// 2. Compress & convert ALL photos to WebP
const optimizedImages = [];
for (const file of files) {
  const optimized = await imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1440,
    fileType: 'image/webp'
  });
  optimizedImages.push(optimized);
}

// 3. Pack ALL images into single FormData with 'images' field
const formData = new FormData();

// Append multiple files with SAME field name
optimizedImages.forEach((blob, index) => {
  formData.append('images', blob, `aura_${index + 1}.webp`);
});

// Append metadata once
const metadata = {
  title,
  archetype_tag,
  description,
  ...sharedGPS,        // Empty object {} if no GPS, or { lat, lng, altitude, heading }
  is_verified: isVerified  // false if no GPS, true if GPS found
};

formData.append('metadata', JSON.stringify(metadata));

// 4. Ship with auth - ONE request for all photos
fetch('/api/auras/upload', {
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

// Backend receives: req.files array (Multer: upload.array('images', 5))
// Database stores: image_urls TEXT[] = ['url1', 'url2', 'url3']
```

### 3. Multi-Photo Upload: Naming Convention (CRITICAL)

**Single Source of Truth** - Use plural naming across entire stack:

| Layer | Field/Variable Name | Type | Notes |
|-------|-------------------|------|-------|
| **Frontend FormData** | `images` | File[] | Multiple files, same field name |
| **Backend Multer** | `upload.array('images', 5)` | - | Must match FormData field |
| **Backend RPC Call** | `p_image_urls` | string[] | Plural parameter name |
| **Database Column** | `image_urls` | TEXT[] | Plural, array type |
| **Database Function** | `p_image_urls` | TEXT[] | Plural parameter |

**Frontend (Already Implemented)**:
```typescript
// Append multiple files with SAME field name 'images'
formData.append('images', blob1, 'aura_1.webp');
formData.append('images', blob2, 'aura_2.webp');
formData.append('images', blob3, 'aura_3.webp');
```

**Backend Required Changes**:
```typescript
// Change from upload.single('image') to upload.array('images', 5)
app.post('/api/auras/upload',
  authenticateToken,
  upload.array('images', 5),  // Max 5 files
  async (req, res) => {
    const files = req.files;  // Array of files
    const metadata = JSON.parse(req.body.metadata);

    // Upload files to storage
    const imageUrls = await Promise.all(
      files.map(file => uploadToStorage(file))
    );

    // Insert into database - GPS fields may be undefined
    await supabase.rpc('insert_aura', {
      p_user_id: req.user.id,
      p_title: metadata.title,
      p_image_urls: imageUrls,  // Array: ['url1', 'url2', 'url3']
      p_archetype_tag: metadata.archetype_tag,
      p_description: metadata.description || null,
      p_lat: metadata.lat || null,        // NULL if no GPS
      p_lng: metadata.lng || null,        // NULL if no GPS
      p_altitude: metadata.altitude || 0,           // Default 0
      p_heading: metadata.heading || 0,   // Default 0
      p_is_verified: metadata.is_verified // false if no GPS
    });
  }
);
```

**Database Required Changes**:
```sql
-- Rename column to plural
ALTER TABLE auras RENAME COLUMN image_url TO image_urls;

-- Or create fresh with complete schema
CREATE TABLE auras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  archetype_tag TEXT NOT NULL CHECK (archetype_tag IN ('The Angle', 'The Path', 'The Spot', 'The Interior')),
  image_urls TEXT[] NOT NULL,  -- Array type for carousel

  -- GPS fields - NULLABLE (may be NULL if no GPS data)
  lat DOUBLE PRECISION,        -- NULL if no GPS
  lng DOUBLE PRECISION,        -- NULL if no GPS
  altitude DOUBLE PRECISION DEFAULT 0,
  heading DOUBLE PRECISION DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update RPC function to handle nullable GPS
CREATE OR REPLACE FUNCTION insert_aura(
  p_user_id UUID,
  p_title TEXT,
  p_image_urls TEXT[],              -- Array parameter (plural)
  p_archetype_tag TEXT,
  p_description TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,     -- Nullable GPS fields
  p_lng DOUBLE PRECISION DEFAULT NULL,     -- Nullable GPS fields
  p_altitude DOUBLE PRECISION DEFAULT 0,
  p_heading DOUBLE PRECISION DEFAULT 0,
  p_is_verified BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  image_urls TEXT[],
  archetype_tag TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO auras (
    user_id, title, image_urls, archetype_tag, description,
    lat, lng, altitude, heading, is_verified
  )
  VALUES (
    p_user_id, p_title, p_image_urls, p_archetype_tag, p_description,
    p_lat, p_lng, p_altitude, p_heading, p_is_verified
  )
  RETURNING *;
END;
$$;
```

### 4. Mobile-First Responsive Design
```typescript
// Always use full-width containers
className="relative flex min-h-screen w-full flex-col bg-white"

// Account for mobile keyboard
className="flex-1 overflow-y-auto pb-safe"

// Touch-friendly UI
className="py-3"  // Larger touch targets
```

## Known Issues & Solutions

### Issue: "Please log in first to upload photos"
**Cause**: Token not saved properly
**Solution**: Backend returns `session.access_token`, not `access_token` directly
**Fix Applied**: Updated to use `response.session?.access_token`

### Issue: Port conflicts (3000, 3001 in use)
**Solution**: Next.js auto-selects available port (e.g., 3003)
**To force specific port**: `npm run dev -- -p 3000`

### Issue: Can't access on phone
**Solution**: Start dev server with network access:
```bash
npm run dev -- -H 0.0.0.0
```

## Testing Checklist

### Authentication
- [ ] Register new user → token saved → redirected to profile
- [ ] Login existing user → token saved → redirected to profile
- [ ] Logout → token cleared
- [ ] Check console: `localStorage.getItem('aura_token')` returns JWT

### Single Photo Upload
- [ ] Upload 1 photo with GPS data → EXIF extracted → image compressed → upload successful → `is_verified: true`
- [ ] Upload 1 photo without GPS → upload successful → warning shown → `is_verified: false`
- [ ] Image converted to WebP format
- [ ] Check metadata: GPS fields present when photo has EXIF, omitted when no EXIF

### Multi-Photo Upload (Carousel)
- [ ] Select 3 photos → all display in preview strip
- [ ] Select more than 3 photos → only first 3 taken, warning shown
- [ ] Tap GPS selector on different photos → blue ring moves correctly
- [ ] Remove photo → remaining photos adjust, GPS selector updates
- [ ] Upload 3 photos with GPS → progress bar shows "Uploading photo X of 3"
- [ ] Upload 3 photos without GPS → warning shown → upload completes → `is_verified: false`
- [ ] Backend receives single request with 3 files (check Network tab)
- [ ] Database stores array of URLs in `image_urls` column
- [ ] Verify GPS fields in metadata:
  - [ ] With GPS: `lat`, `lng`, `altitude`, `heading` present, `is_verified: true`
  - [ ] Without GPS: GPS fields omitted, `is_verified: false`

### UI/UX
- [ ] All pages load without mock status bar
- [ ] Mobile responsive on actual device
- [ ] "Change" button replaces all selected photos
- [ ] Upload button shows "Upload 3 Photos" when multiple selected

## Next Steps

### Backend (Required for Multi-Photo Upload) ⚠️ CRITICAL

#### 1. Multer Configuration Update
```typescript
// BEFORE
upload.single('image')

// AFTER
upload.array('images', 5)  // Max 5 files, field name 'images'
```

#### 2. Database Schema Migration
```sql
-- Step 1: Rename column
ALTER TABLE auras RENAME COLUMN image_url TO image_urls;

-- Step 2: Change column type to array
ALTER TABLE auras ALTER COLUMN image_urls TYPE TEXT[] USING ARRAY[image_urls];

-- Step 3: Make GPS fields nullable
ALTER TABLE auras ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE auras ALTER COLUMN lng DROP NOT NULL;
```

#### 3. RPC Function Update
```sql
-- Update parameter name and type
CREATE OR REPLACE FUNCTION insert_aura(
  p_image_urls TEXT[],              -- Changed from p_image_url TEXT
  p_lat DOUBLE PRECISION DEFAULT NULL,     -- Now nullable
  p_lng DOUBLE PRECISION DEFAULT NULL,     -- Now nullable
  p_is_verified BOOLEAN DEFAULT false,
  -- ... other params
)
```

#### 4. Upload Endpoint Handler
```typescript
app.post('/api/auras/upload',
  authenticateToken,
  upload.array('images', 5),  // Handle multiple files
  async (req, res) => {
    const files = req.files;  // Array instead of single file
    const metadata = JSON.parse(req.body.metadata);

    // Upload all files to storage
    const imageUrls = await Promise.all(
      files.map(file => uploadFileToStorage(file))
    );

    // Insert with nullable GPS fields
    await supabase.rpc('insert_aura', {
      p_image_urls: imageUrls,
      p_lat: metadata.lat || null,
      p_lng: metadata.lng || null,
      p_is_verified: metadata.is_verified
    });
  }
);
```

#### 5. Testing Checklist
- [ ] Test single photo upload
- [ ] Test multi-photo upload (2-3 photos)
- [ ] Test upload with GPS data
- [ ] Test upload without GPS data (screenshot)
- [ ] Verify `image_urls` array stored correctly
- [ ] Verify nullable GPS fields work
- [ ] Check `is_verified` flag correctness

### Frontend (Potential Enhancements)
- [ ] Implement logout functionality (clear token + redirect to login)
- [ ] Add protected route middleware (redirect to login if no token)
- [ ] Fetch and display user's uploaded photos on profile (carousel display)
- [ ] Fetch and display feed posts from backend (carousel support)
- [ ] Add photo detail page with carousel navigation
- [ ] Implement "save" functionality
- [ ] Add loading skeletons for better UX
- [ ] Error boundary for better error handling
- [ ] Token refresh mechanism
- [ ] Deploy frontend updates to GCP

## Backend Integration Reference

### What Backend Receives

**Request Object:**
```typescript
// Using upload.array('images', 5)
req.files = [
  {
    fieldname: 'images',
    originalname: 'photo1.webp',
    mimetype: 'image/webp',
    size: 389472,
    buffer: <Buffer...>,
    path: 'uploads/xyz123.webp'  // If using disk storage
  },
  {
    fieldname: 'images',
    originalname: 'photo2.webp',
    mimetype: 'image/webp',
    size: 412348,
    buffer: <Buffer...>,
    path: 'uploads/abc456.webp'
  },
  // ... up to 3 files
]

req.body.metadata = '{"title":"Beach Day","archetype_tag":"The Path",...}'
```

**Parsed Metadata (with GPS):**
```typescript
const metadata = JSON.parse(req.body.metadata);
// {
//   title: "Beach Day",
//   archetype_tag: "The Path",
//   description: "Sunset walk",
//   lat: 37.7749,
//   lng: -122.4194,
//   altitude: 15.5,
//   heading: 270.0,
//   is_verified: true
// }
```

**Parsed Metadata (without GPS):**
```typescript
const metadata = JSON.parse(req.body.metadata);
// {
//   title: "Cafe Interior",
//   archetype_tag: "The Interior",
//   description: "Cozy space",
//   is_verified: false
//   // Note: lat, lng, altitude, heading NOT present
// }
```

### Current Upload Request Format

**Single Request with Multiple Files:**

```http
POST /api/auras/upload
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="images"; filename="aura_1.webp"
Content-Type: image/webp

<binary data>
------WebKitFormBoundary...
Content-Disposition: form-data; name="images"; filename="aura_2.webp"
Content-Type: image/webp

<binary data>
------WebKitFormBoundary...
Content-Disposition: form-data; name="images"; filename="aura_3.webp"
Content-Type: image/webp

<binary data>
------WebKitFormBoundary...
Content-Disposition: form-data; name="metadata"

{"title":"Beach Day","archetype_tag":"The Path","description":"Sunset","lat":37.77,"lng":-122.41,"altitude":10,"heading":180,"is_verified":true}
------WebKitFormBoundary...
```

**Metadata JSON Schema:**
```typescript
interface AuraUploadMetadata {
  // Always required
  title: string;
  archetype_tag: 'The Angle' | 'The Path' | 'The Spot' | 'The Interior';
  description?: string;       // Optional user input
  is_verified: boolean;       // true if GPS exists, false if no GPS

  // GPS fields - ONLY included if EXIF data found
  lat?: number;               // From anchor photo (omitted if no GPS)
  lng?: number;               // From anchor photo (omitted if no GPS)
  altitude?: number;               // From anchor photo (omitted if no GPS, default: 0)
  heading?: number;           // From anchor photo (omitted if no GPS, default: 0)
}
```

**Example: With GPS Data**
```json
{
  "title": "Beach Sunset",
  "archetype_tag": "The Path",
  "description": "Beautiful evening",
  "lat": 37.7749,
  "lng": -122.4194,
  "altitude": 15.5,
  "heading": 270.0,
  "is_verified": true
}
```

**Example: Without GPS Data** (screenshot, downloaded image, edited photo)
```json
{
  "title": "Cafe Interior",
  "archetype_tag": "The Interior",
  "description": "Cozy atmosphere",
  "is_verified": false
}
```
Note: `lat`, `lng`, `altitude`, `heading` fields are **not sent** when GPS is missing.

**Key Points:**
- All images use the SAME FormData field name: `images`
- Metadata sent once, applies to all images
- All images share GPS coordinates from anchor photo (if GPS exists)
- Backend receives `req.files` array (not `req.file`)
- GPS fields are **optional** - presence determined by EXIF data availability

## Deployment

### To Deploy Updated Frontend to GCP:

```bash
# 1. Commit changes
git add .
git commit -m "feat: implement authentication and upload with EXIF"
git push origin main

# 2. Deploy to Cloud Run
gcloud run deploy aura-frontend --source .

# Note: Production uses env var from Dockerfile
# ENV NEXT_PUBLIC_API_URL=https://aura-backend-255644230597.us-central1.run.app
```

## Debug Commands

```bash
# Check token in browser console
localStorage.getItem('aura_token')

# Clear token
localStorage.clear()

# Check all localStorage
console.log(localStorage)

# Network tab filter
# Filter by: /api/auras/upload or /auth/

# Inspect upload payload in Network tab
# Look for FormData with multiple 'images' entries
# Check metadata JSON for GPS fields (present/absent)
```

## Important Implementation Notes

### 🔴 Critical Points

1. **GPS Fields Are Optional**
   - Frontend checks if EXIF data exists
   - If GPS found: sends `lat`, `lng`, `altitude`, `heading` + `is_verified: true`
   - If NO GPS: omits GPS fields entirely + `is_verified: false`
   - Backend MUST handle nullable GPS columns

2. **Naming Convention (Must Match Exactly)**
   - Frontend FormData field: `images` (plural)
   - Backend Multer: `upload.array('images', 5)`
   - Database column: `image_urls` (plural, TEXT[] type)
   - RPC parameter: `p_image_urls` (plural, TEXT[] type)

3. **Single Request Architecture**
   - Frontend sends ONE POST with all files
   - NOT 3 separate requests
   - Backend receives `req.files` array
   - Database stores one row with `image_urls` array

4. **EXIF Extraction Timing**
   - MUST extract EXIF BEFORE compression
   - Compression strips all metadata
   - GPS data applied to ALL photos in upload

5. **Type Safety**
   - All code imports types from `shared/aura-schema.ts`
   - Changes to schema must update shared file
   - Backend should match TypeScript interfaces

### ⚠️ Common Pitfalls

- ❌ Don't add `Content-Type` header (breaks multipart boundary)
- ❌ Don't assume GPS fields always exist (they're optional)
- ❌ Don't use `upload.single()` - must be `upload.array()`
- ❌ Don't store as single URL - must be TEXT[] array
- ❌ Don't block uploads without GPS - allow with `is_verified: false`

### ✅ Best Practices

- ✓ Always check `is_verified` flag to determine GPS presence
- ✓ Use shared schema types for consistency
- ✓ Handle nullable GPS in database queries
- ✓ Show clear warnings when GPS is missing
- ✓ Test with both GPS and non-GPS photos

## Complete Feature Overview

### Multi-Photo Carousel Upload

**What It Does:**
Upload 1-3 photos as a single "aura" post with shared metadata and optional GPS location.

**User Flow:**
1. Select 1-3 photos (max enforced)
2. Pick GPS anchor photo (blue ring indicator)
3. Enter title, description, category
4. Click "Upload X Photos"
5. See progress bar during upload
6. If no GPS: yellow warning shown
7. Redirect to feed

**Technical Flow:**
1. Extract EXIF from anchor photo (if available)
2. Optimize all photos to WebP (<400KB each)
3. Bundle into single FormData request
4. Send to `/api/auras/upload` with JWT auth
5. Backend processes files array
6. Store as one row with `image_urls` array

**Data Model:**
```typescript
// Frontend sends
FormData {
  images: [File, File, File],    // 1-3 WebP files
  metadata: JSON {
    title: string,
    archetype_tag: Archetype,
    description?: string,
    lat?: number,                // Only if GPS found
    lng?: number,                // Only if GPS found
    altitude?: number,                // Only if GPS found
    heading?: number,            // Only if GPS found
    is_verified: boolean         // false if no GPS
  }
}

// Database stores
{
  id: UUID,
  user_id: UUID,
  title: string,
  image_urls: string[],          // ['url1', 'url2', 'url3']
  archetype_tag: Archetype,
  lat: number | null,            // NULL if no GPS
  lng: number | null,            // NULL if no GPS
  is_verified: boolean,          // false if no GPS
  created_at: timestamp
}
```

**Key Features:**
- ✅ Atomic operation (all photos or none)
- ✅ GPS optional (works with screenshots, downloads)
- ✅ Single database row per post
- ✅ Automatic carousel structure
- ✅ Type-safe with shared schema
- ✅ Progress tracking
- ✅ Error handling

---

## Project Status Summary

### ✅ Frontend - COMPLETE (100%)

**Upload:**
- [x] Multi-photo upload UI (max 3 photos)
- [x] GPS anchor photo selector
- [x] Single request upload (all images in one POST)
- [x] Upload progress tracking
- [x] GPS optional handling (`is_verified: false` if no GPS)
- [x] Yellow warning for uploads without GPS
- [x] FormData with field name `images`
- [x] Metadata with optional GPS fields (`altitude` not `alt`)

**Profile:**
- [x] Fetch and display user's posts from `/api/auras/me`
- [x] Real archetype statistics from `/api/auras/me/stats`
- [x] Dynamic percentage calculation
- [x] Grid display with multi-image indicators
- [x] Auto-redirect to login if not authenticated
- [x] Display user name under profile picture
- [x] Display bio if exists

**Edit Profile:**
- [x] Fetch user profile from `/me` endpoint
- [x] Edit name (max 10 chars) with character counter
- [x] Edit bio (max 100 chars) with character counter
- [x] Save changes via `PUT /api/profile/update`
- [x] Validation (name required)
- [x] Error handling for rate limits
- [x] Display email in Account section

**Feed:**
- [x] Fetch all users' posts from `/api/auras/feed`
- [x] Two-column masonry layout
- [x] Pagination (Load More button)
- [x] Display first image from carousel
- [x] Relative timestamps (5m ago, 2h ago)
- [x] Verification indicators

**Shared:**
- [x] Type-safe schema (`shared/aura-schema.ts`) with snake_case
- [x] All interfaces match SQL structure exactly

### ⚠️ Backend - Required for Full Functionality
- [ ] CORS configuration for local development
- [ ] Change Multer to `upload.array('images', 5)`
- [ ] Endpoints: `/api/auras/me`, `/api/auras/me/stats`, `/api/auras/feed`
- [ ] Database: `image_urls TEXT[]` column
- [ ] RPC functions: `get_user_auras`, `get_user_archetype_stats`, `get_all_auras`

### 📋 Data Contract
**Frontend sends:** FormData with multiple files + metadata JSON (snake_case)
**Backend expects:** `req.files` array + snake_case fields
**Database stores:** `image_urls TEXT[]` + nullable `lat`/`lng`
**All fields:** snake_case (`image_urls`, `archetype_tag`, `created_at`, `is_verified`)

---

**Last Updated**: 2026-03-19
**Current Status**: Core features complete - Upload, Profile, Edit Profile, Feed all implemented with real backend integration
**Environment**: Configured for `http://10.124.57.22:8080` (network IP for mobile testing)
**Next**: Backend profile update endpoint (`PUT /api/profile/update`) implementation
