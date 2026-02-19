import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Haversine distance between two [lng, lat] points in km
const haversine = (a, b) => {
    const toRad = d => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
};

const SEGMENT_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

const ElevationChart = ({ geoJson, trailData }) => {

    // Compute segment boundaries (cumulative distance at each segment end)
    const segmentMarkers = useMemo(() => {
        const features = geoJson?.features || [];
        if (features.length <= 1) return [];

        const markers = [];
        let cumDist = 0;

        features.forEach((f, idx) => {
            if (f.geometry?.type !== 'LineString' || !f.geometry.coordinates) return;
            const coords = f.geometry.coordinates;
            // Add distance for this segment
            for (let i = 1; i < coords.length; i++) {
                cumDist += haversine(coords[i - 1], coords[i]);
            }
            // Mark boundary at end of each segment (except the last)
            if (idx < features.length - 1) {
                markers.push({
                    distance: cumDist,
                    letter: String.fromCharCode(65 + idx),
                    name: f.properties?.name || `Segment ${idx + 1}`,
                    color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
                });
            }
        });

        // Scale to totalDistanceKm if available
        const totalKm = geoJson?.totalDistanceKm;
        if (totalKm && cumDist > 0) {
            const scale = totalKm / cumDist;
            markers.forEach(m => { m.distance *= scale; });
        }

        return markers;
    }, [geoJson]);

    // Extract elevation data from GeoJSON or use mock data based on trail stats
    const getElevationData = () => {
        let coords = [];

        // 1. Try to get coordinates from features array (compressed schema)
        if (geoJson?.features) {
            geoJson.features.forEach(f => {
                if (f.geometry?.type === 'LineString' && f.geometry.coordinates) {
                    coords = coords.concat(f.geometry.coordinates);
                }
            });
        }
        // 2. Fallback to simple route object
        else if (geoJson?.route?.coordinates?.length > 0) {
            coords = geoJson.route.coordinates;
        }

        // If we found coordinates, process them
        if (coords.length > 0) {
            const hasElevation = coords[0].length > 2;

            // Compute cumulative Haversine distance for all coords
            let cumDist = 0;
            const distances = coords.map((point, i) => {
                if (i > 0) cumDist += haversine(coords[i - 1], point);
                return cumDist;
            });

            // Scale to totalDistanceKm if available
            const totalKm = geoJson?.totalDistanceKm;
            if (totalKm && cumDist > 0) {
                const scale = totalKm / cumDist;
                distances.forEach((_, i) => { distances[i] *= scale; });
                cumDist = totalKm;
            }

            if (hasElevation) {
                // Real elevation data available
                const data = coords.map((point, i) => ({
                    distance: distances[i],
                    elevation: point[2]
                }));
                // Sample down if too many points
                if (data.length > 500) {
                    const step = Math.ceil(data.length / 500);
                    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
                }
                return data;
            }

            // No elevation in coords — generate realistic profile from trail metadata + actual distances
            const minAlt = trailData?.altitude?.min_m || 1000;
            const maxAlt = trailData?.altitude?.max_m || 3000;
            const range = maxAlt - minAlt;

            // Sample ~100 points along the actual trail distance
            const numPoints = Math.min(coords.length, 100);
            const step = Math.max(1, Math.floor(coords.length / numPoints));
            const data = [];

            for (let i = 0; i < coords.length; i += step) {
                const progress = distances[i] / cumDist;
                const wave1 = Math.sin(progress * Math.PI);
                const wave2 = Math.sin(progress * Math.PI * 3) * 0.15;
                const wave3 = Math.sin(progress * Math.PI * 7 + 1.2) * 0.08;
                const wave4 = Math.sin(progress * Math.PI * 13 + 0.5) * 0.04;
                const combined = Math.max(0, Math.min(1, wave1 + wave2 + wave3 + wave4));
                data.push({
                    distance: distances[i],
                    elevation: Math.round(minAlt + range * combined)
                });
            }
            if (data.length > 0 && data[data.length - 1].distance < cumDist) {
                data.push({ distance: cumDist, elevation: Math.round(minAlt + range * 0.05) });
            }
            return data;
        }

        // 3. Final fallback: no coordinates at all — use metadata only
        const minAlt = trailData?.altitude?.min_m || 1000;
        const maxAlt = trailData?.altitude?.max_m || 3000;
        const totalDist = trailData?.distance?.value || geoJson?.totalDistanceKm || 10;
        const points = 30;
        const data = [];

        for (let i = 0; i <= points; i++) {
            const progress = i / points;
            const wave = Math.sin(progress * Math.PI) + Math.sin(progress * Math.PI * 3) * 0.12;
            const elevation = minAlt + (maxAlt - minAlt) * Math.max(0, wave);
            data.push({
                distance: totalDist * progress,
                elevation: Math.round(elevation)
            });
        }
        return data;
    };

    const data = getElevationData();

    // Calculate Gain and Loss
    const stats = useMemo(() => {
        if (!data || data.length < 2) return { gain: 0, loss: 0 };

        let gain = 0;
        let loss = 0;

        for (let i = 1; i < data.length; i++) {
            const diff = data[i].elevation - data[i - 1].elevation;
            if (diff > 0) gain += diff;
            else loss += Math.abs(diff);
        }

        return {
            gain: Math.round(gain),
            loss: Math.round(loss)
        };
    }, [data]);

    // Start/End names from trail location
    const startName = trailData?.location?.start || 'Start';
    const endName = trailData?.location?.end || 'End';

    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">Elevation data not available</div>;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex flex-wrap gap-3 mb-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Gain: <span className="text-foreground">{stats.gain}m</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Loss: <span className="text-foreground">{stats.loss}m</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Max: <span className="text-foreground">{Math.max(...data.map(d => d.elevation))}m</span>
                </div>
            </div>

            {/* Start/End location labels */}
            <div className="flex justify-between mb-1 text-[10px] font-semibold text-muted-foreground px-9">
                <span title={startName}>🚩 {startName}</span>
                <span title={endName}>{endName} 🏁</span>
            </div>

            <div className="flex-1 min-h-0" style={{ minHeight: '60px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 15,
                            right: 10,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="distance"
                            tickFormatter={(val) => `${val.toFixed(0)}km`}
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tickFormatter={(val) => `${val}m`}
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            domain={['auto', 'auto']}
                            width={35}
                        />
                        <Tooltip
                            formatter={(value) => [`${value}m`, 'Elevation']}
                            labelFormatter={(label) => `Distance: ${Number(label).toFixed(1)}km`}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        />

                        {/* Segment boundary markers (A, B, C…) */}
                        {segmentMarkers.map((marker) => (
                            <ReferenceLine
                                key={marker.letter}
                                x={marker.distance}
                                stroke={marker.color}
                                strokeDasharray="4 3"
                                strokeWidth={1.5}
                                label={{
                                    value: marker.letter,
                                    position: 'top',
                                    fill: marker.color,
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                }}
                            />
                        ))}

                        <Area
                            type="monotone"
                            dataKey="elevation"
                            stroke="#16a34a"
                            fill="#dcfce7"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ElevationChart;

