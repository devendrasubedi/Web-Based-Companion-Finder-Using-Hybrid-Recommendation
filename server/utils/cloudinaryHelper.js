// Cloudinary Helper Functions
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dsvhbnzzv'; // Replace with your actual cloud name
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Generate a Cloudinary URL from a public_id
 * @param {String} publicId - The image public_id in Cloudinary
 * @param {Object} options - Optional transformation options (width, height, quality, etc.)
 * @returns {String} - Full Cloudinary URL
 */
export const getCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId) {
    return null;
  }

  // Default transformation options
  const {
    width = 800,
    height = 600,
    crop = 'fill',
    quality = 'auto',
    fetch_format = 'auto'
  } = options;

  // Build transformation string
  const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${fetch_format}`;

  // Return full Cloudinary URL
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
};

/**
 * Get Cloudinary URL with default card image dimensions
 */
export const getCloudinaryCardImage = (publicId) => {
  return getCloudinaryUrl(publicId, {
    width: 600,
    height: 400,
    crop: 'fill',
    quality: 'auto'
  });
};

/**
 * Get Cloudinary URL with default detail page image dimensions
 */
export const getCloudinaryDetailImage = (publicId) => {
  return getCloudinaryUrl(publicId, {
    width: 1200,
    height: 600,
    crop: 'fill',
    quality: 'auto'
  });
};

export default {
  getCloudinaryUrl,
  getCloudinaryCardImage,
  getCloudinaryDetailImage,
  CLOUDINARY_CLOUD_NAME
};
