/**
 * Uploads an image file to Cloudinary using unsigned upload.
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to be set.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing in environment variables. Please check your .env file.');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  // Optional: You can also specify folder here if not defined in the preset
  // formData.append('folder', 'marketplace');

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url; // Cloudinary returns the HTTPS URL of the uploaded image here
}
