import exifr from 'exifr';
import imageCompression from 'browser-image-compression';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { AuraUploadMetadata, Archetype } from '../../shared/aura-schema';

export interface AuraMetadata {
  title: string;
  archetype_tag: Archetype;
  description?: string;
}

export interface UploadProgress {
  current: number;
  total: number;
  status: 'extracting' | 'optimizing' | 'uploading' | 'complete';
}

export interface UploadResult {
  data: any;
  hasGPS: boolean;
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload multiple photos with shared GPS data from an anchor photo
 * Sends all images in a single request for carousel/gallery structure
 */
export const processAndUploadMultipleAuras = async (
  files: File[],
  gpsAnchorFile: File,
  userMetadata: AuraMetadata,
  onProgress?: ProgressCallback
) => {
  try {
    // --- STEP 1: EXTRACT GPS FROM ANCHOR PHOTO ---
    onProgress?.({ current: 0, total: files.length, status: 'extracting' });

    console.log('Extracting GPS from anchor photo...');
    const exifData = await exifr.parse(gpsAnchorFile, {
      gps: true,
      altitude: true,
      imgDirection: true,
    });

    let sharedGPS: {
      lat?: number;
      lng?: number;
      alt?: number;
      heading?: number;
    } = {};
    let isVerified = true;

    if (!exifData?.latitude || !exifData?.longitude) {
      console.warn('⚠️ No GPS data found in anchor photo. Upload will proceed as unverified.');
      isVerified = false;
    } else {
      sharedGPS = {
        lat: exifData.latitude,
        lng: exifData.longitude,
        alt: exifData.altitude || 0,
        heading: exifData.GPSImgDirection || 0,
      };
      console.log('Shared GPS data:', sharedGPS);
    }

    // --- STEP 2: OPTIMIZE ALL PHOTOS ---
    const token = getToken();
    if (!token) {
      throw new Error('Please log in first to upload photos');
    }

    const compressionOptions = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1440,
      fileType: 'image/webp' as const,
    };

    const optimizedImages: Blob[] = [];

    for (let i = 0; i < files.length; i++) {
      onProgress?.({ current: i + 1, total: files.length, status: 'optimizing' });

      console.log(`Optimizing photo ${i + 1}/${files.length}...`);
      const optimizedBlob = await imageCompression(files[i], compressionOptions);
      optimizedImages.push(optimizedBlob);

      console.log(`Photo ${i + 1}: ${(files[i].size / 1024 / 1024).toFixed(2)}MB → ${(optimizedBlob.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // --- STEP 3: BUILD SINGLE FORMDATA WITH MULTIPLE FILES ---
    onProgress?.({ current: files.length, total: files.length, status: 'uploading' });

    const formData = new FormData();

    // Append all images with the same field name 'images'
    optimizedImages.forEach((blob, index) => {
      formData.append('images', blob, `aura_${index + 1}.webp`);
    });

    // Append metadata once
    const auraPayload: AuraUploadMetadata = {
      ...userMetadata,
      ...sharedGPS,
      is_verified: isVerified,
    };

    formData.append('metadata', JSON.stringify(auraPayload));

    // --- STEP 4: SINGLE UPLOAD REQUEST ---
    console.log(`Uploading ${files.length} photos in one request...`);

    const response = await fetch(`${API_BASE}/api/auras/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await response.json();
    onProgress?.({ current: files.length, total: files.length, status: 'complete' });

    console.log(`All ${files.length} photos uploaded successfully!`, result);

    return {
      data: result,
      hasGPS: isVerified
    };

  } catch (error) {
    console.error("Multi-upload process failed:", error);
    throw error;
  }
};

/**
 * Legacy single photo upload (kept for backwards compatibility)
 */
export const processAndUploadAura = async (
  file: File,
  userMetadata: AuraMetadata
) => {
  return await processAndUploadMultipleAuras([file], file, userMetadata);
};
