# Aura Frontend - Project Documentation

## Project Overview

**Aura** is a mobile-first webapp for sharing location-verified photos with EXIF metadata. Users capture moments at real places, and the backend verifies GPS coordinates to ensure authenticity.

**Design Priority**: Mobile phone webapp (not desktop-first)

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"` in globals.css, `@tailwindcss/postcss` in postcss.config.mjs)
- **Font**: Geist Sans via `next/font/google`
- **Image Processing**:
  - `exifr` - EXIF metadata extraction
  - `browser-image-compression` - Image optimization & WebP conversion

## Quick Reference

### Key Files
- `shared/aura-schema.ts` - Source of truth for data contracts & types
- `src/services/uploadService.ts` - Upload logic with EXIF extraction
- `src/app/upload/page.tsx` - Upload UI (max 3 photos, Anchor/Perspective prompt)
- `src/lib/auth.ts` - JWT token management (`getToken`, `saveToken`, `getUserId`, `saveUserId`)
- `src/lib/api.ts` - API utilities (`apiGet`, `apiPost`, `apiPut`, `API_BASE`)
- `src/lib/geocoding.ts` - Mapbox reverse geocoding + place search autocomplete
- `src/components/TopBar.tsx` - Shared header (logo + friends + bell icons) used by feed and own profile
- `src/components/PostGrid.tsx` - Shared post grid (empty/single/multi) used by own profile and public profile

### Archetypes (CURRENT — 3 categories)
```typescript
export type Archetype = 'Photo Spots' | 'Wanderings' | 'Indoor Vibes';
```
These are sent as `archetype_tag` in all upload and filter requests.

### Stats Field Mapping
The backend `ArchetypeStats` response uses legacy DB field names. Frontend maps them as:
| DB field | Displayed label |
|---|---|
| `stats.angle` | Photo Spots |
| `stats.spot` | Wanderings |
| `stats.interior` | Indoor Vibes |
| `stats.path` | *(unused — not displayed)* |

### Upload Flow Summary
```
User selects 1-3 photos → Pick GPS anchor photo → Fill title/category/tags
→ Frontend checks nearby posts (GPS required) → Anchor or Perspective prompt
→ Frontend extracts EXIF from anchor (if exists)
→ Compress all to WebP (max 400KB, 1440px each)
→ Single POST with FormData:
  - 'images': [file1, file2, file3]  // Same field name
  - 'metadata': { title, archetype_tag, tags?, lat?, lng?, is_verified, parent_id? }
→ Backend: upload.array('images', 5)
→ Database: image_urls TEXT[] + nullable GPS
```

### GPS Handling
- **With GPS**: `is_verified: true`, includes `lat`, `lng`, `altitude`, `heading`
- **Without GPS**: `is_verified: false`, GPS fields omitted entirely

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
- **JWT Token Management** - Tokens stored in localStorage as `aura_token`
- **User ID** - Stored in localStorage as `aura_user_id` (used to detect own posts)
- **Auto-redirect** - After login/register → redirects to `/profile`

**Flow**:
```
User logs in → Backend returns { session: { access_token }, user: { id } }
→ Frontend saves token via saveToken() → localStorage 'aura_token'
→ Frontend saves user ID via saveUserId() → localStorage 'aura_user_id'
→ Token automatically included in all authenticated API requests
```

#### 2. Multi-Photo Upload with EXIF Processing (Carousel Support)
**Location**: `/upload`

**"Magic" 4-Step Process** (implemented in `src/services/uploadService.ts`):
1. **Extract** - Reads GPS (lat/lng), altitude, heading from EXIF before compression (from anchor photo)
   - If GPS found → `is_verified: true` + GPS data included
   - If NO GPS → `is_verified: false` + GPS data omitted (not sent to backend)
2. **Compress** - Converts any image format (JPG, PNG, HEIC) → WebP (max 400KB, 1440px) for all photos
3. **Pack** - Bundles ALL optimized images + metadata into single FormData
4. **Ship** - Sends to backend with JWT authentication in ONE request

**Features**:
- **Multi-photo carousel** (max 3 photos per upload)
- Single request with all photos for atomic operation
- **GPS optional** - Upload works with or without location data
- GPS anchor photo selector (blue ring indicator) — GPS from anchor applied to all photos
- **Nearby post check** — before upload, fetches `GET /api/auras/check-nearby?lat=&lng=`; if nearby posts exist, shows bottom sheet prompting user to add as **Perspective** (sets `parent_id`) or create a new **Anchor** (`parent_id: null`)
- **Tags** — up to 5 tags selectable from a full tag list; included in `metadata.tags`
- Upload progress tracking with visual progress bar
- Category selection: `"Photo Spots"`, `"Wanderings"`, `"Indoor Vibes"`
- Title & description input (shared across all photos in carousel)
- Loading states & error handling
- Auto-redirect to feed after successful upload
- "Change" button to reselect all photos
- Yellow warning banner if no GPS data found

**Supported Formats**: JPG, PNG, HEIC (iPhone), WebP, etc.

**Upload Limit**: Maximum 3 photos per post (enforced at selection)

**GPS Optional Behavior**:
```
Photos WITH GPS (original camera photos):
→ Check nearby → Anchor/Perspective prompt if nearby exists
→ Extract GPS → Upload with lat/lng/altitude/heading → is_verified: true
→ Redirect to feed immediately

Photos WITHOUT GPS (screenshots, downloads, edited photos):
→ Skip nearby check (no coords available)
→ Upload WITHOUT GPS fields → is_verified: false
→ Show warning: "⚠️ No location data found. Upload completed as unverified."
→ Auto-dismiss after 3 seconds → Redirect to feed
```

#### 3. Feed/Landing Page
**Location**: `/` (Home)

**Features**:
- Fetches posts from `GET /api/auras/feed?limit=10&offset=0[&lat&lng&radius&archetype&tag&following]`
- Two-column masonry layout with "Load More" pagination
- **All / Following** tab toggle (`?following=true` param — backend filter needed for Following tab)
- **Location filter**: Near Me button (geolocation) + city search autocomplete via Mapbox
- **Archetype chip filters**: All, Photo Spots, Wanderings, Indoor Vibes
- **Tag filter** via "Advanced Search" button → bottom sheet with full tag list; selected tag shown as `#tag` chip
- Displays `image_urls[0]`, layers icon for multi-image posts, archetype badge, title, timestamp, distance (if location active), `+N perspectives` count
- 📍 pin for GPS-verified posts
- "Be a Pioneer" CTA when no posts found in a location-filtered view

#### 4. Own Profile Page
**Location**: `/profile`

**Features**:
- Fetches `GET /me` → displays name (fallback: email prefix) + bio
- Fetches `GET /api/auras/me` → uploaded posts (sorted newest first)
- Fetches `GET /api/auras/me/stats` → archetype stats with count & percentage
- Fetches `GET /api/saves` → saved posts
- Tabs: **Uploaded** / **Saved** — both use shared `<PostGrid />`
- **Edit profile** button → `/profile/edit`
- **Share profile** button → copies `/profile/{userId}` URL to clipboard
- Auto-redirect to `/login` if no token

**Stats displayed** (3 columns):
```
Photo Spots   Wanderings   Indoor Vibes
    5             12            2
  22.73%        54.55%        9.09%
```

#### 5. Edit Profile Page
**Location**: `/profile/edit`

**Features**:
- Fetches `GET /me` → pre-fills name + bio
- Edit name (max 10 characters) with character counter
- Edit bio (max 100 characters) with character counter
- **Account section**: Shows user's email (read-only)
- Saves via `PUT /api/profile/update`
- Validation: name is required
- Error handling for rate limits and failed saves
- Auto-redirect to `/profile` after successful save

#### 6. Public Profile Page
**Location**: `/profile/[id]`

**Features**:
- Fetches `GET /api/users/:id` → `{ profile: PublicProfile, posts: Post[], stats: ArchetypeStats }`
- Shows avatar, name, bio, follower/following/post counts
- **Follow / Following** toggle: `POST /api/follows` / `DELETE /api/follows/:user_id`
- **Share profile** button → copies URL to clipboard
- Archetype stats (3 columns, same mapping as own profile)
- Posts grid via shared `<PostGrid />`
- Back button → previous page or home

#### 7. Post Detail Page
**Location**: `/post/[id]`

**Features**:
- Fetches `GET /api/auras/:id` (falls back to feed search if endpoint unavailable)
- **Horizontal image carousel** with scroll + dot indicators; tap any image to open lightbox (fullscreen, prev/next arrows)
- **Like button** with optimistic UI and count: `POST /api/likes` / `DELETE /api/likes/:id`
- **Comment button** — shows auth toast if not logged in (UI only, no backend yet)
- **Save button** (hidden on own posts): `POST /api/saves` / `DELETE /api/saves/:id`; save state loaded via `GET /api/saves/check?aura_id=`
- **Share button** → copies `/post/:id` URL to clipboard
- Archetype tag + Verified badge + user-selected tags display
- Static Mapbox map with post location pin (coral) + user location pin (blue)
- Walking distance and time via Mapbox Directions API
- "Open in Google Maps" link for GPS-verified posts
- City/neighborhood label via Mapbox reverse geocoding
- **Perspectives strip** (linked thumbnails) via `GET /api/auras/:id/perspectives`
- Header: back button (→ home if no history) + user avatar/name link → `/profile/:id` (or `/profile` if own post)
- Auth toast for unauthenticated actions ("Log in to like", etc.)
- `Promise.allSettled()` so missing backend endpoints fail silently

#### 8. Friends Page
**Location**: `/friends`

**Features**:
- Debounced search input (300ms) → `GET /api/users/search?q=`
- User cards with avatar, name, Follow / Following toggle
- `POST /api/follows { user_id }` to follow, `DELETE /api/follows/:user_id` to unfollow
- Empty state, no-results state, graceful 404 handling

#### 9. Notifications Page
**Location**: `/notifications`

**Features**:
- Loads `GET /api/notifications` on mount
- Calls `PATCH /api/notifications/read` to mark all as read
- Notification types: `follow`, `save`, `perspective`
- **Follow notifications**: shows Follow back / Following toggle button
- **Save/Perspective notifications**: shows post title linked to `/post/:id`
- Unread notifications highlighted in `#fff8f8`
- "All caught up" empty state

#### 10. Shared Components
- **`TopBar`** (`src/components/TopBar.tsx`) — "Aura" wordmark + friends icon + bell icon with unread badge. Fetches unread notification count on mount. Used by feed (`/`) and own profile (`/profile`).
- **`PostGrid`** (`src/components/PostGrid.tsx`) — handles empty / single / multi-post layout. Used by own profile tabs and public profile page.

**Note**: Upload, post detail, friends, and notifications pages define their own inline bottom nav / back navigation — `BottomNav` is not a shared component.

#### 11. Pages Implemented

| Page | Route | Notes |
|---|---|---|
| Feed/Home | `/` | Masonry feed, filters, location search |
| Upload | `/upload` | Multi-photo, EXIF, Anchor/Perspective |
| Own Profile | `/profile` | Stats, tabs, edit/share |
| Edit Profile | `/profile/edit` | Name/bio |
| Public Profile | `/profile/[id]` | Follow/unfollow, posts grid |
| Post Detail | `/post/[id]` | Lightbox, map, likes, perspectives |
| Friends | `/friends` | Search, follow/unfollow |
| Notifications | `/notifications` | Follow-back, mark-read |
| Login | `/login` | JWT auth |
| Register | `/register` | Signup |

## API Integration

### Backend URL
**Local Development**: Set via `NEXT_PUBLIC_API_URL` in `.env.local` (typically a network IP for mobile testing)
**Production**: `https://aura-backend-255644230597.us-central1.run.app`
**Fallback** (if env not set): `http://localhost:5000` (hardcoded in `src/lib/api.ts`)

### Endpoints Used

```typescript
// Authentication
POST /auth/register
POST /auth/login
POST /auth/logout

// User Profile
GET /me                                    // Get current user info → { ok, user: UserProfile }
PUT /api/profile/update                    // Update name/bio → { name?, bio? }
GET /api/users/:id                         // Public profile → { profile: PublicProfile, posts, stats }
GET /api/users/search?q=                   // Search users → { users: [..., is_following] }

// Auras/Posts
GET /api/auras/feed                        // Paginated feed ?limit&offset&lat&lng&radius&archetype&tag&following
GET /api/auras/:id                         // Single post → { ok, aura: Aura } (with perspectives embedded)
GET /api/auras/me                          // Current user's posts → { ok, auras: Post[] }
GET /api/auras/me/stats                    // Archetype stats → { ok, stats: ArchetypeStats }
POST /api/auras/upload                     // Upload new aura (multipart/form-data)
GET /api/auras/:id/perspectives            // Child posts → { perspectives: Aura[] }
GET /api/auras/check-nearby?lat=&lng=      // Nearby posts for Anchor/Perspective prompt

// Likes
POST /api/likes                            // Like a post { aura_id }
DELETE /api/likes/:aura_id                 // Unlike a post

// Saves
POST /api/saves                            // Save a post { aura_id }
DELETE /api/saves/:aura_id                 // Unsave a post
GET /api/saves                             // Current user's saved posts → { ok, auras: Post[] }
GET /api/saves/check?aura_id=              // Check if saved → { saved: boolean }

// Follows
POST /api/follows                          // Follow a user { user_id }
DELETE /api/follows/:user_id               // Unfollow a user

// Notifications
GET /api/notifications                     // User notifications → { notifications: Notification[] }
PATCH /api/notifications/read              // Mark all notifications as read
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
      "archetype_tag": "Photo Spots",
      "tags": ["GoldenHour", "Beaches"],
      "created_at": "2026-05-10T...",
      "is_verified": true,
      "is_liked": false,
      "like_count": 3,
      "perspectives_count": 2,
      "distance_meters": 450
    }
  ],
  "pagination": { "limit": 10, "offset": 0, "count": 10 }
}
```

**Stats Response:**
```json
{
  "ok": true,
  "stats": { "angle": 5, "path": 0, "spot": 12, "interior": 2 }
}
```

**Public Profile Response:**
```json
{
  "profile": {
    "user_id": "uuid",
    "name": "Alice",
    "bio": "...",
    "avatar_url": null,
    "follower_count": 10,
    "following_count": 5,
    "is_following": false,
    "post_count": 22
  },
  "posts": [...],
  "stats": { "angle": 5, "path": 0, "spot": 12, "interior": 2 }
}
```

### Authentication Headers
All authenticated requests include:
```typescript
headers: { 'Authorization': `Bearer ${token}` }
```
`apiGet` / `apiPost` / `apiPut` in `src/lib/api.ts` add this header automatically from localStorage.

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Feed/Home
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Register
│   ├── upload/page.tsx             # Upload (multi-photo, EXIF, Anchor/Perspective)
│   ├── profile/
│   │   ├── page.tsx                # Own profile (stats, tabs, edit/share)
│   │   ├── [id]/page.tsx           # Public profile (follow/unfollow, posts)
│   │   └── edit/page.tsx           # Edit name & bio
│   ├── post/[id]/page.tsx          # Post detail (carousel, map, likes, perspectives)
│   ├── friends/page.tsx            # Search users, follow/unfollow
│   ├── notifications/page.tsx      # Activity notifications, follow-back
│   ├── api/
│   │   └── mapbox-token/route.ts   # Server-side Mapbox token endpoint
│   ├── layout.tsx                  # Root layout (Geist Sans font)
│   └── globals.css                 # Tailwind v4 import
├── components/
│   ├── TopBar.tsx                  # Shared header — used by feed & own profile only
│   └── PostGrid.tsx                # Shared post grid — used by own & public profile
├── lib/
│   ├── api.ts                      # apiGet, apiPost, apiPut + API_BASE
│   ├── auth.ts                     # getToken, saveToken, getUserId, saveUserId
│   └── geocoding.ts                # Mapbox reverse geocoding + place search
├── services/
│   └── uploadService.ts            # 4-step upload: EXIF → WebP → FormData → POST
└── shared/
    └── aura-schema.ts              # SOURCE OF TRUTH: all TypeScript data contracts
```

## Shared Schema (Source of Truth)

**Location**: `shared/aura-schema.ts`

**CRITICAL**: Uses **snake_case** to match SQL exactly. All frontend code must import types from here.

**Current Types**:
1. `Archetype` — `'Photo Spots' | 'Wanderings' | 'Indoor Vibes'`
2. `Aura` — Complete DB object (includes `is_liked`, `like_count`, `tags`, `perspectives`)
3. `Post` — Simplified for feed/profile display
4. `AuraUploadMetadata` — What frontend sends as metadata JSON in upload
5. `ProfileData` — Profile page response structure
6. `InsertAuraParams` — Backend RPC parameters
7. `FeedResponse` — Feed response with pagination
8. `ArchetypeStats` — `{ angle, path, spot, interior }` (DB field names, not display labels)
9. `UserProfile` — From `GET /me`
10. `ProfileUpdatePayload` — `PUT /api/profile/update` body
11. `PublicProfile` — From `GET /api/users/:id`
12. `PublicProfileResponse` — Full public profile response
13. `Notification` — Notification object (`follow | save | perspective`)

**Key Fields**:
- `image_urls` (NOT `imageUrls`) — array of image URLs for carousel
- `archetype_tag` (NOT `archetypeTag`) — category tag string
- `created_at` (NOT `createdAt`) — ISO timestamp
- `is_verified` (NOT `isVerified`) — GPS verification flag
- `is_liked` — whether the requesting user has liked this post
- `like_count` — total likes on the post
- `tags` — optional string array of user-selected tags
- `parent_id` — `null` = Anchor post, `string` = Perspective of that Anchor

**UserProfile**:
```typescript
export interface UserProfile {
  id: string;               // UUID — "id" not "user_id"
  email: string;
  name?: string;            // Max 10 chars; may be absent on new users
  bio?: string | null;
  avatar_url?: string | null;
}
```

**PublicProfile**:
```typescript
export interface PublicProfile {
  user_id: string;          // Note: "user_id" not "id" on public profile
  name: string;
  bio: string | null;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  post_count: number;
}
```

**Important Notes**:
- `GET /me` returns `{ ok: true, user: UserProfile }` — user data is nested under `user`
- `GET /api/users/:id` returns `{ profile: PublicProfile, posts: Post[], stats: ArchetypeStats }`
- Frontend falls back to email prefix if `name` is missing

## Configuration

### Environment Variables

**`.env.local`** (local development):
```env
NEXT_PUBLIC_API_URL=http://<your-network-ip>:8080
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
```
*(Use network IP, not localhost, for mobile device testing)*

**`Dockerfile`** (production):
```dockerfile
ENV NEXT_PUBLIC_API_URL=https://aura-backend-255644230597.us-central1.run.app
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
```

**Deployment:**
```bash
gcloud run deploy aura-frontend --source . \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

### Deployment URLs
- **Frontend**: https://aura-frontend-255644230597.us-central1.run.app/
- **Backend**: https://aura-backend-255644230597.us-central1.run.app/

## Development Setup

### Local Testing

1. **Start Frontend**:
   ```bash
   npm run dev -- -H 0.0.0.0
   # Binds to all interfaces so phone on same WiFi can connect
   ```

2. **Test on Phone**:
   - Ensure phone is on same WiFi network
   - Navigate to `http://<your-network-ip>:<port>`

### Important Notes

- **Mobile-first**: All layouts use `min-h-screen w-full flex flex-col bg-white`
- **No mock status bar**: Do not add time/battery/signal bars to any page
- **Token persistence**: JWT stored in localStorage (survives page refreshes)
- **HEIC support**: iPhone photos automatically converted to WebP by `browser-image-compression`

## Design Tokens (from Figma)

```
Active nav / accent:     #fa6460  (coral/red)
Brand dark:              #2c2c2c
Filter pill active:      bg #5a5a5a, text #f5f5f5
Body text:               #1e1e1e
Secondary text:          #757575
Card badge:              bg #2c2c2c, text #f3f3f3
Tag selected:            bg #fff1c2, text #595959
Background:              #ffffff
Light bg / input:        #f3f3f3
Border:                  #d9d9d9
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
// Login/Register saves token AND user ID
const response = await apiPost('/auth/login', { email, password });
if (response.session?.access_token) saveToken(response.session.access_token);
if (response.user?.id) saveUserId(response.user.id);

// Upload reads token
const token = getToken();
fetch(`${API_BASE}/api/auras/upload`, {
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData,  // DO NOT set Content-Type — browser sets multipart boundary
});
```

### 2. Multi-Photo Upload Flow
```typescript
// STEP 1: Extract EXIF from anchor photo (BEFORE compression strips it)
const exifData = await exifr.parse(gpsAnchorFile, { gps: true });

let sharedGPS = {};
let isVerified = false;
if (exifData?.latitude && exifData?.longitude) {
  sharedGPS = {
    lat: exifData.latitude, lng: exifData.longitude,
    altitude: exifData.altitude || 0, heading: exifData.GPSImgDirection || 0,
  };
  isVerified = true;
}

// STEP 2: Compress ALL photos to WebP
const optimized = await imageCompression(file, {
  maxSizeMB: 0.4, maxWidthOrHeight: 1440, fileType: 'image/webp'
});

// STEP 3: Build single FormData
const formData = new FormData();
optimizedImages.forEach((blob, i) => formData.append('images', blob, `aura_${i+1}.webp`));
formData.append('metadata', JSON.stringify({
  title, archetype_tag, description, tags, parent_id,
  ...sharedGPS, is_verified: isVerified,
}));

// STEP 4: One request
fetch(`${API_BASE}/api/auras/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
```

### 3. Naming Convention (CRITICAL — Must Match Across Stack)

| Layer | Field/Variable | Type |
|---|---|---|
| Frontend FormData | `images` | File[] (same field name repeated) |
| Backend Multer | `upload.array('images', 5)` | — |
| Backend RPC Call | `p_image_urls` | string[] |
| Database Column | `image_urls` | TEXT[] |

### 4. Anchor vs Perspective
Posts have a `parent_id` field:
- `parent_id: null` = **Anchor** (independent post)
- `parent_id: "<uuid>"` = **Perspective** (linked to an anchor at the same location)

Upload flow checks nearby posts (`GET /api/auras/check-nearby`) and shows a bottom sheet letting the user choose. The user's selection is passed as `parent_id` in the upload metadata.

### 5. Like System (Optimistic UI)
```typescript
// Optimistic update first, then API call, revert on error
const prev = { isLiked, likeCount };
setIsLiked(!isLiked); setLikeCount(c => isLiked ? c - 1 : c + 1);
try {
  if (prev.isLiked) await fetch(`${API_BASE}/api/likes/${post.id}`, { method: 'DELETE', headers });
  else await fetch(`${API_BASE}/api/likes`, { method: 'POST', headers, body: JSON.stringify({ aura_id: post.id }) });
} catch {
  setIsLiked(prev.isLiked); setLikeCount(prev.likeCount);
}
```

### 6. Own Post Detection
`getUserId()` (from localStorage `aura_user_id`) is compared against `post.user?.id` to determine if the current user owns a post. Own posts hide the save button on the detail page and link the username header to `/profile` instead of `/profile/:id`.

## Known Issues & Solutions

### Issue: "Please log in first to upload photos"
**Cause**: Token not saved properly after login
**Fix**: Backend returns `session.access_token` (nested under `session`), not top-level `access_token`

### Issue: Can't access on phone
**Fix**: `npm run dev -- -H 0.0.0.0` to bind to all interfaces

### Issue: Port conflicts
**Fix**: Next.js auto-selects available port; force with `npm run dev -- -p 3000`

## Important Implementation Notes

### 🔴 Critical Points

1. **GPS Fields Are Optional**
   - `sharedGPS` object is empty `{}` if no EXIF data found
   - Only when GPS exists: `lat`, `lng`, `altitude`, `heading` are spread into metadata
   - `is_verified: false` + no GPS fields if no EXIF

2. **Single Request Architecture**
   - ONE POST with ALL images — not separate requests per photo
   - Backend receives `req.files` array (not `req.file`)
   - Database stores ONE row with `image_urls TEXT[]`

3. **EXIF Extraction Timing**
   - MUST extract EXIF BEFORE compression — compression strips metadata

4. **Do NOT set Content-Type on FormData requests**
   - Browser must set it automatically to include the multipart boundary

5. **Archetypes are 3 values only**
   - `'Photo Spots' | 'Wanderings' | 'Indoor Vibes'`
   - Old values (`The Angle`, `The Path`, `The Spot`, `The Interior`) are OBSOLETE

### ⚠️ Common Pitfalls

- ❌ Don't add `Content-Type` header to FormData fetch (breaks multipart boundary)
- ❌ Don't assume GPS fields always exist (they're optional)
- ❌ Don't use `upload.single()` — must be `upload.array('images', 5)`
- ❌ Don't store as single URL — must be `TEXT[]` array
- ❌ Don't block uploads without GPS — allow with `is_verified: false`
- ❌ Don't use old archetype names (The Angle, The Path, etc.)

### ✅ Best Practices

- ✓ Import all types from `shared/aura-schema.ts`
- ✓ Use `API_BASE` from `src/lib/api.ts` for all backend URLs
- ✓ Use `getToken()` / `saveToken()` from `src/lib/auth.ts` for token management
- ✓ Use `Promise.allSettled()` when calling endpoints that may not exist yet
- ✓ Use `getUserId()` to detect own posts (hide save button, link to own profile)

## Project Status Summary

### ✅ Frontend - COMPLETE

**Upload:**
- [x] Multi-photo upload UI (max 3 photos), inline SVG icons (no external assets)
- [x] GPS anchor photo selector with blue ring indicator
- [x] Single request upload (all images in one POST)
- [x] Upload progress bar
- [x] GPS optional handling (`is_verified: false` if no GPS, yellow warning)
- [x] Nearby post prompt → Anchor or Perspective choice (`parent_id`)
- [x] Tag selection (up to 5 from full tag list)

**Feed:**
- [x] Two-column masonry layout with pagination
- [x] All / Following tab toggle
- [x] Location filter (Near Me + city search via Mapbox geocoding)
- [x] Archetype chip filters (Photo Spots, Wanderings, Indoor Vibes)
- [x] Tag filter via Advanced Search bottom sheet
- [x] `+N perspectives` badge on anchor posts
- [x] Distance display when location filter active
- [x] Shared `<TopBar />` header

**Profile (Own):**
- [x] Name, bio, avatar display
- [x] Archetype stats with count & percentage (3 columns)
- [x] Uploaded/Saved tabs via shared `<PostGrid />`
- [x] Edit profile + Share profile buttons
- [x] Saved posts from `GET /api/saves`
- [x] Shared `<TopBar />` header

**Profile (Public `/profile/[id]`):**
- [x] Follower/following/post counts
- [x] Follow / Following toggle
- [x] Archetype stats
- [x] Posts grid via shared `<PostGrid />`
- [x] Share profile button

**Post Detail:**
- [x] Horizontal image carousel + dot indicators
- [x] Lightbox (fullscreen, prev/next arrows, image count)
- [x] Like button with optimistic UI + count
- [x] Save button (hidden on own posts)
- [x] Share button (copies URL to clipboard)
- [x] Tags display
- [x] Static Mapbox map + walking distance/time
- [x] "Open in Google Maps" link
- [x] City/neighborhood label from reverse geocoding
- [x] Perspectives thumbnails strip
- [x] Auth toasts for unauthenticated actions
- [x] Back button → home fallback

**Friends:**
- [x] Debounced user search, follow/unfollow toggle

**Notifications:**
- [x] Notification list (follow, save, perspective types)
- [x] Follow-back button on follow notifications
- [x] Mark-all-read on page open

**Shared Components:**
- [x] `src/components/TopBar.tsx` — header (feed + own profile)
- [x] `src/components/PostGrid.tsx` — post grid (own + public profile)

### ⚠️ Backend Endpoints — Status

| Endpoint | Status | Notes |
|---|---|---|
| `POST /api/saves` | May have DB issues | Frontend wired up |
| `GET /api/saves` | May have DB issues | Frontend wired up |
| `GET /api/saves/check?aura_id=` | May not exist | Frontend handles 404 silently |
| `GET /api/auras/:id/perspectives` | May not exist | Frontend handles 404 silently |
| `GET /api/users/search?q=` | May not exist | Friends page handles gracefully |
| `POST /api/follows` | May not exist | Friends/Public profile handle gracefully |
| `DELETE /api/follows/:user_id` | May not exist | Friends/Public profile handle gracefully |
| `GET /api/notifications` | May not exist | Notifications page handles gracefully |
| `PATCH /api/notifications/read` | May not exist | Called fire-and-forget |
| `GET /api/auras/check-nearby` | May not exist | Upload handles gracefully |
| `GET /api/users/:id` | May not exist | Public profile shows error state |
| `POST /api/likes` | May not exist | Like button handles gracefully |
| `DELETE /api/likes/:id` | May not exist | Like button handles gracefully |
| `GET /api/auras/feed?following=true` | Partial | Following tab sends param; backend filter may not be implemented |

### 📋 Data Contract Summary
- **Frontend sends**: FormData with multiple files + metadata JSON (all snake_case)
- **Backend expects**: `req.files` array + `req.body.metadata` JSON string
- **Database stores**: `image_urls TEXT[]` + nullable `lat`/`lng` + `tags TEXT[]`
- **All fields**: snake_case (`image_urls`, `archetype_tag`, `created_at`, `is_verified`)
- **Archetypes**: `'Photo Spots' | 'Wanderings' | 'Indoor Vibes'` (3 values)

---

**Last Updated**: 2026-05-29
**Deployment**: GCP Cloud Run — `gcloud builds submit --config cloudbuild.yaml`
**Mapbox token**: Set via env var at build time (not committed to git)
