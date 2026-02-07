# Debugging Cloudinary Images Integration

If images are not showing up, use these debug endpoints to understand what's in your database.

## Debug Endpoints

### 1. Check Images Collection Structure
```bash
GET http://localhost:5000/api/trails/debug/images
```

This will show you:
- All collections in your database
- Which image collection names exist
- Sample image documents from each collection
- The structure/fields of your image data

**Example response:**
```json
{
  "message": "Debug information for Cloudinary images collection",
  "collections": {
    "Trails_Images": {
      "exists": true,
      "count": 5,
      "samples": [
        {
          "_id": "...",
          "trail_id": "R0001",
          "public_id": "Nepal-Treks/Everest-Base-Camp",
          "url": "https://..."
        }
      ]
    }
  },
  "sampleTrails": [
    { "_id": "R0001", "name": "Everest Base Camp" }
  ]
}
```

### 2. Manually Link a Cloudinary Image to a Trail
```bash
POST http://localhost:5000/api/trails/debug/link-image
Content-Type: application/json

{
  "trail_id": "R0001",
  "public_id": "Nepal-Treks/Everest-Base-Camp"
}
```

This will create/update an image record in your Trails_Images collection.

## Troubleshooting Steps

### Step 1: Check if images collection exists
1. Run: `GET /api/trails/debug/images`
2. Look for your image collection in the response
3. Check if it has documents

### Step 2: Find your actual collection name
If your collection has a different name (e.g., `cloudinary_images`, `Images`), the response will show it.

### Step 3: Verify image document structure
Look at the `samples` in the response to see what fields your images have:
- If you have `public_id` → Good! It will work
- If you have `url` → You may need to use the URL directly
- If you have different field names → We can adapt

### Step 4: Check Cloudinary configuration
Ensure in your `.env`:
```
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
```

### Step 5: Manually link images
If no images exist in the collection:
1. Run `POST /api/trails/debug/link-image` for each trail
2. Provide the trail_id and the Cloudinary public_id
3. Refresh the page to see images

## What to Share with Support

If images still don't show, run this and share the response:
```
GET http://localhost:5000/api/trails/debug/images
```

This will help identify:
- The actual collection name
- The field names used for image data
- How many images are stored
- The exact structure of image documents

## Server Logs

Check your terminal where the server is running. You should see logs like:
```
Searching for images in 'Trails_Images' for trail R0001
Found image data: { trail_id: 'R0001', public_id: '...' }
Generated detail image URL: Nepal-Treks/Everest-Base-Camp -> https://res.cloudinary.com/...
```

If you see "No images found", it means either:
1. The collection or field names are different
2. No images have been uploaded to Cloudinary yet
3. The image links in the database are incorrect

## Next Steps

After debugging, you can:
1. Update the collection/field names in `trailController.js` if they're different
2. Bulk insert image records using the POST debug endpoint
3. Verify images are showing on the frontend
