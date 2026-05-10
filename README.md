# Aura Frontend

Mobile-first webapp for sharing location-verified photos. Users capture moments at real places; GPS EXIF data is extracted and verified on upload.

**Live**: https://aura-frontend-255644230597.us-central1.run.app
**Backend**: https://aura-backend-255644230597.us-central1.run.app

## Tech Stack

- Next.js 16.1.6 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- `exifr` — EXIF/GPS extraction
- `browser-image-compression` — WebP conversion & compression

## Local Development

```bash
npm install
npm run dev -- -H 0.0.0.0   # expose on network for mobile testing
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://<your-local-ip>:8080
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

## Pages

| Route | Description |
|---|---|
| `/` | Feed — two-column masonry, location filter, archetype chips |
| `/upload` | Multi-photo upload (max 3), EXIF GPS extraction |
| `/profile` | User profile, uploaded/saved tabs, archetype stats |
| `/profile/edit` | Edit name & bio |
| `/post/[id]` | Post detail — carousel, map, walking distance, perspectives |
| `/friends` | Search users, follow/unfollow |
| `/notifications` | Activity notifications |
| `/login` | Email/password login |
| `/register` | New user signup |

## Key Files

```
src/
├── app/                        # Next.js App Router pages
├── components/
│   ├── TopBar.tsx              # Shared header (logo + friends + bell icons)
│   └── PostGrid.tsx            # Shared post grid (empty / single / multi)
├── lib/
│   ├── api.ts                  # apiGet/apiPost with auto JWT headers
│   ├── auth.ts                 # saveToken / getToken / removeToken
│   └── geocoding.ts            # Mapbox token fetch + place search
├── services/
│   └── uploadService.ts        # EXIF extraction, compression, upload
shared/
└── aura-schema.ts              # Source of truth — all TypeScript types
```

## Deploy to GCP

```bash
git push origin main
gcloud builds submit --config cloudbuild.yaml
```

The Mapbox token is stored as a Cloud Run env var (not in source):
```bash
gcloud run services update aura-frontend --update-env-vars MAPBOX_TOKEN=pk.your_token
```
