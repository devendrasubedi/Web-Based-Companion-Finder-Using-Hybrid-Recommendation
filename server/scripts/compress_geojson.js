/**
 * compress_geojson.js
 * 
 * Reads all trails from Trails_GeoJSON, applies RDP simplification,
 * and writes compressed versions to Trails_GeoJSON_Compressed.
 * 
 * Usage: node scripts/compress_geojson.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

// --- Ramer-Douglas-Peucker Algorithm ---
// Works on [lng, lat, elevation?] coordinates
function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
    const u = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (mag * mag);
    const closestX = lineStart[0] + u * dx;
    const closestY = lineStart[1] + u * dy;
    return Math.sqrt((point[0] - closestX) ** 2 + (point[1] - closestY) ** 2);
}

function rdpSimplify(points, epsilon) {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIdx = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > maxDist) {
            maxDist = d;
            maxIdx = i;
        }
    }

    if (maxDist > epsilon) {
        const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
        const right = rdpSimplify(points.slice(maxIdx), epsilon);
        return left.slice(0, -1).concat(right);
    }
    return [points[0], points[end]];
}

// --- Main ---
async function main() {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const db = conn.connection.useDb('auth_db');
    const srcCollection = db.collection('Trails_GeoJSON');
    const dstCollection = db.collection('Trails_GeoJSON_Compressed');

    // Epsilon controls aggressiveness of simplification
    // ~0.0003 degrees ≈ ~33 meters — good balance of accuracy vs compression
    const EPSILON = 0.0003;
    const MIN_POINTS = 20; // never simplify below this

    const trails = await srcCollection.find({}).toArray();
    console.log(`Found ${trails.length} trails to compress`);

    let totalOriginal = 0;
    let totalCompressed = 0;

    const compressed = [];

    for (const trail of trails) {
        const features = (trail.features || []).map(f => {
            if (f.geometry?.type !== 'LineString' || !f.geometry.coordinates) return f;

            const original = f.geometry.coordinates;
            totalOriginal += original.length;

            let simplified = rdpSimplify(original, EPSILON);

            // Ensure minimum number of points
            if (simplified.length < MIN_POINTS && original.length >= MIN_POINTS) {
                // Re-sample at regular intervals
                const step = Math.floor(original.length / MIN_POINTS);
                simplified = [];
                for (let i = 0; i < original.length; i += step) {
                    simplified.push(original[i]);
                }
                // Always include the last point
                if (simplified[simplified.length - 1] !== original[original.length - 1]) {
                    simplified.push(original[original.length - 1]);
                }
            }

            totalCompressed += simplified.length;

            return {
                type: f.type || 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: simplified
                },
                properties: f.properties || {}
            };
        });

        compressed.push({
            trailId: trail.trailId,
            trailName: trail.trailName,
            totalDistanceKm: trail.totalDistanceKm,
            features,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // Clear existing and insert
    await dstCollection.deleteMany({});
    if (compressed.length > 0) {
        await dstCollection.insertMany(compressed);
    }

    const ratio = totalOriginal > 0 ? ((1 - totalCompressed / totalOriginal) * 100).toFixed(1) : 0;
    console.log(`\nDone!`);
    console.log(`  Trails compressed: ${compressed.length}`);
    console.log(`  Total coords: ${totalOriginal.toLocaleString()} → ${totalCompressed.toLocaleString()} (${ratio}% reduction)`);
    console.log(`  Avg per trail: ${Math.round(totalOriginal / trails.length).toLocaleString()} → ${Math.round(totalCompressed / trails.length).toLocaleString()}`);

    // Verify
    const verifyCount = await dstCollection.countDocuments();
    console.log(`  Verified: ${verifyCount} docs in Trails_GeoJSON_Compressed`);

    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
