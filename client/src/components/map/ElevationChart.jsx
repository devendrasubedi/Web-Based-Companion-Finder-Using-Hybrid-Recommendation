import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ElevationChart = ({ geoJson, trailData }) => {
    // Extract elevation data from GeoJSON or use mock data based on trail stats
    const getElevationData = () => {
        let coords = [];

        // 1. Try to get coordinates from FeatureCollection (Preferred)
        if (geoJson?.geo_json?.features) {
            const lineString = geoJson.geo_json.features.find(f => f.geometry.type === 'LineString');
            if (lineString?.geometry?.coordinates) {
                coords = lineString.geometry.coordinates;
            }
        }
        // 2. Fallback to simple route object
        else if (geoJson?.route?.coordinates?.length > 0) {
            coords = geoJson.route.coordinates;
        }

        // If we found coordinates, process them
        if (coords.length > 0) {
            // Check if coordinates have elevation (Z-axis, i.e., 3rd element)
            const hasElevation = coords[0].length > 2;

            if (hasElevation) {
                // Determine total distance to normalize x-axis (optional, but good for display)
                return coords.map((point, index) => ({
                    distance: index * 0.1, // Approximate distance factor if actual distance calc is too heavy
                    elevation: point[2]
                }));
            }
        }

        // 3. Fallback: Generate a simulated curve based on min/max altitude
        const minAlt = trailData?.altitude?.min_m || 1000;
        const maxAlt = trailData?.altitude?.max_m || 3000;
        const points = 20;
        const data = [];

        for (let i = 0; i <= points; i++) {
            // Create a bell-curve like shape for mountain pass
            const progress = i / points;
            const curve = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
            const elevation = minAlt + (maxAlt - minAlt) * curve;
            data.push({
                distance: (trailData?.distance?.value || 10) * progress,
                elevation: Math.round(elevation)
            });
        }
        return data;
    };

    const data = getElevationData();

    // Calculate Gain and Loss
    const stats = React.useMemo(() => {
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

    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">Elevation data not available</div>;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex gap-4 mb-2 text-xs font-medium text-muted-foreground">
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

            <div className="flex-1 min-h-0" style={{ minHeight: '60px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
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
