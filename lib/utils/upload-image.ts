import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Convert HEIC image to JPEG using server-side API
 * @param file - The HEIC file to convert
 * @returns Converted JPEG file
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/convert-heic', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Conversion failed');
    }

    // Get the JPEG blob from response
    const blob = await response.blob();

    // Create new File from Blob
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], fileName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error);
    throw new Error('Failed to convert HEIC image. Please try a different format.');
  }
}

/**
 * Upload an image to Firebase Storage
 * @param file - The image file to upload
 * @param folder - The storage folder path (e.g., 'properties', 'agents')
 * @returns The download URL of the uploaded image
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  try {
    let fileToUpload = file;

    // Convert HEIC to JPEG if necessary
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      fileToUpload = await convertHeicToJpeg(file);
    }

    // Generate unique filename: timestamp + random string + original extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const extension = fileToUpload.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Create storage reference
    const storageRef = ref(storage, `${folder}/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, fileToUpload);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);

    // Provide more specific error messages
    if (error?.code === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase Storage rules.');
    } else if (error?.code === 'storage/retry-limit-exceeded') {
      throw new Error('Upload timeout. Please check your internet connection.');
    } else if (error?.code === 'storage/invalid-checksum') {
      throw new Error('File upload failed. Please try again.');
    }

    throw error; // Throw the original error for better debugging
  }
}

/**
 * Validate image file
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  // Check file type (including HEIC/HEIF which will be auto-converted)
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const isHeic = fileExtension === 'heic' || fileExtension === 'heif';

  if (!validTypes.includes(file.type) && !isHeic) {
    return 'Please upload a valid image file (JPG, PNG, WebP, or HEIC)';
  }

  // Check file size (max 10MB for HEIC since they're typically larger, 5MB for others)
  const maxSize = isHeic || file.type === 'image/heic' || file.type === 'image/heif'
    ? 10 * 1024 * 1024 // 10MB for HEIC
    : 5 * 1024 * 1024;  // 5MB for others

  if (file.size > maxSize) {
    return `Image size must be less than ${isHeic ? '10MB' : '5MB'}`;
  }

  return null;
}
