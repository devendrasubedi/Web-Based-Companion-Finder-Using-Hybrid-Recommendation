# Cloudinary Integration Guide

## Overview
This project uses Cloudinary to store and serve trail images. The Cloudinary helper module provides utilities to generate optimized image URLs for different use cases.

## Setup Instructions

### 1. Create a Cloudinary Account
- Sign up at [Cloudinary.com](https://cloudinary.com)
- Copy your **Cloud Name** from the dashboard

### 2. Configure Environment Variables
Add the following to your `.env` file in the server directory:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

You can find these values in your [Cloudinary Console](https://cloudinary.com/console)

### 3. Upload Images to Cloudinary

Images should be organized as:
```
Nepal-Treks/
├── Everest-Base-Camp
├── Annapurna-Base-Camp
├── Langtang-Valley
└── [other-trails]
```

### 4. Store Image Metadata in MongoDB

In the `Trails_Images` collection, store documents like:
```javascript
{
  "trail_id": "R0001",
  "public_id": "Nepal-Treks/Everest-Base-Camp",
  "original_url": "https://res.cloudinary.com/...",
  "uploaded_at": ISODate("2024-01-01T00:00:00Z")
}
```

## Image URL Functions

### `getCloudinaryUrl(publicId, options)`
Generates a Cloudinary URL with custom transformations.

```javascript
import { getCloudinaryUrl } from '../utils/cloudinaryHelper.js';

const url = getCloudinaryUrl('Nepal-Treks/Everest-Base-Camp', {
  width: 800,
  height: 600,
  crop: 'fill',
  quality: 'auto'
});
```

### `getCloudinaryCardImage(publicId)`
Pre-configured for trail card images (600x400px).

```javascript
const cardUrl = getCloudinaryCardImage('Nepal-Treks/Everest-Base-Camp');
```

### `getCloudinaryDetailImage(publicId)`
Pre-configured for trail detail page images (1200x600px).

```javascript
const detailUrl = getCloudinaryDetailImage('Nepal-Treks/Everest-Base-Camp');
```

## Integration in Controllers

The trail controllers automatically:
1. Query the `Trails_Images` collection for image metadata
2. Extract the `public_id` from MongoDB
3. Generate optimized Cloudinary URLs
4. Return URLs in API responses

### Example Response

```json
{
  "id": "R0001",
  "name": "Everest Base Camp",
  "image": "https://res.cloudinary.com/your-cloud/image/upload/w_600,h_400,c_fill,q_auto,f_auto/Nepal-Treks/Everest-Base-Camp",
  ...
}
```

## Fallback Behavior

If an image is not found in Cloudinary:
1. Placeholder URL is used: `https://via.placeholder.com/600x400?text=Trail`
2. Check browser console for error logs
3. Verify `public_id` in `Trails_Images` collection

## Benefits of Cloudinary

✅ **Automatic Optimization** - Images optimized for web delivery
✅ **Responsive Images** - Different sizes for different devices  
✅ **CDN Delivery** - Fast global content delivery
✅ **Format Conversion** - Automatic WebP, AVIF conversion
✅ **caching** - Built-in caching for performance

## Troubleshooting

### Images Not Showing
1. Check that `CLOUDINARY_CLOUD_NAME` is set in `.env`
2. Verify `public_id` in MongoDB matches Cloudinary folder structure
3. Check browser console for 404 errors
4. Verify image exists in Cloudinary dashboard

### Slow Image Loading
1. Images are automatically compressed using `q_auto` 
2. Format is automatically optimized using `f_auto`
3. If still slow, check Cloudinary CDN status
4. Consider creating different image sizes for different viewport widths

## More Information
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [URL Generation Guide](https://cloudinary.com/documentation/image_delivery)
- [Optimization Best Practices](https://cloudinary.com/documentation/best_practices)
