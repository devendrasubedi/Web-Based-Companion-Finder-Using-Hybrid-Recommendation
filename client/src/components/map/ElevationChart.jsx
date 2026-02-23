import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";
import { TrendingUp } from "lucide-react";

// ... haversine function stays the same ...
const haversine = (a, b) => {
    const toRad = d => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
};

export default function ElevationChart({ geoJson }) {
    const { chartData, stats, locations } = useMemo(() => {
        if (!geoJson || !geoJson.features) return { chartData: [], stats: null, locations: null };

        const features = geoJson.features;
        let allCoords = [];
        features.forEach(f => {
            if (f.geometry?.coordinates) allCoords = allCoords.concat(f.geometry.coordinates);
        });

        if (allCoords.length === 0) return { chartData: [], stats: null, locations: null };

        // Extract Names
        const firstSegmentName = features[0]?.properties?.name || "";
        const lastSegmentName = features[features.length - 1]?.properties?.name || "";
        const startLoc = firstSegmentName.split(/ to /i)[0] || "Start";
        const endLoc = lastSegmentName.split(/ to /i)[1] || lastSegmentName.split(/ to /i)[0] || "End";

        // Sampling
        const step = Math.max(1, Math.floor(allCoords.length / 500));
        const sampled = allCoords.filter((_, i) => i % step === 0);

        let cumDist = 0;
        let calcGain = 0, calcLoss = 0;
        let min = sampled[0][2], max = sampled[0][2];

        const data = sampled.map((p, i) => {
            const ele = p[2] || 0;
            if (i > 0) {
                cumDist += haversine(sampled[i - 1], p);
                const diff = ele - sampled[i - 1][2];
                if (diff > 0) calcGain += diff;
                else calcLoss += Math.abs(diff);
            }
            if (ele < min) min = ele;
            if (ele > max) max = ele;

            return { distance: parseFloat(cumDist.toFixed(2)), elevation: ele };
        });

        return {
            chartData: data,
            locations: { start: startLoc, end: endLoc },
            stats: {
                gain: geoJson.totalAscent || Math.round(calcGain),
                loss: geoJson.totalDescent || Math.round(calcLoss),
                distance: Math.round(geoJson.totalDistanceKm || cumDist),
                peak: Math.round(max),
                lowest: Math.round(min)
            }
        };
    }, [geoJson]);

    if (!chartData.length) return null;

    const maxDist = chartData[chartData.length - 1].distance;

    return (
        <div className="w-full flex flex-col h-full bg-white font-sans">
            {/* Stats Summary */}
            <div className="flex justify-between md:justify-start md:gap-8 mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100 px-4">
                <StatBox label="Dist" value={`${stats.distance} km`} />
                <StatBox label="Gain" value={`+${stats.gain} m`} color="text-green-600" />
                <StatBox label="Loss" value={`-${stats.loss} m`} color="text-red-500" />
                <StatBox label="Peak" value={`${stats.peak} m`} />
                <StatBox label="Low" value={`${stats.lowest} m`} />
            </div>

            <div className="flex-1 w-full relative min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                    <AreaChart data={chartData} margin={{ top: 25, right: 35, left: 10, bottom: 20 }}>
                        <defs>
                            <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#556B2F" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#556B2F" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />

                        <XAxis
                            dataKey="distance"
                            fontSize={10}
                            tickFormatter={v => `${Math.round(v)}k`}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                            tick={{ fill: '#6b7280' }}
                            dy={10}
                            minTickGap={25}
                        >
                            <Label value="Distance (km)" offset={-15} position="insideBottom" fontSize={10} fill="#6b7280" />
                        </XAxis>
                        <YAxis
                            fontSize={10}
                            domain={['dataMin - 50', 'dataMax + 50']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280' }}
                            width={45}
                            tickFormatter={v => `${v}m`}
                        >
                            <Label value="Elevation (m)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fontSize={10} fill="#6b7280" offset={-5} />
                        </YAxis>

                        <Tooltip content={<CustomTooltip />} />

                        <Area
                            type="monotone"
                            dataKey="elevation"
                            stroke="#556B2F"
                            strokeWidth={2}
                            fill="url(#eleGradient)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Helper components...
function StatBox({ label, value, color = "text-foreground" }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">{label}</span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-lg text-xs">
                <p className="text-muted-foreground mb-1"><span className="font-semibold text-foreground">{Math.round(label)}</span> km mark</p>
                <p className="text-primary font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {payload[0].value} m elevation
                </p>
            </div>
        );
    }
    return null;
};