import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, LayersControl, LayerGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react'; // Fixed import case sensitivity

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const createCustomIcon = (color, label) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
             <span style="color: white; font-size: 14px; font-weight: bold;">${label[0]}</span>
           </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const StartIcon = createCustomIcon('#22c55e', 'S'); // Green
const EndIcon = createCustomIcon('#ef4444', 'E');   // Red
const PoiIcon = (type) => {
    let color = '#3b82f6';
    let label = 'P';
    if (type.includes('water')) { color = '#0ea5e9'; label = 'W'; }
    if (type.includes('food') || type.includes('tea')) { color = '#f97316'; label = 'F'; }
    if (type.includes('hotel') || type.includes('lodge')) { color = '#8b5cf6'; label = 'H'; }

    return createCustomIcon(color, label);
};

// Component to handle map bounds and updates
const MapUpdater = ({ center, bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center) {
            map.setView(center, 13);
        }
    }, [center, bounds, map]);
    return null;
};

const TrailMap = ({ geoJson, startLocation }) => {

    // Parse GeoJSON and Route Data
    const { positions, bounds, pois } = useMemo(() => {
        let positions = [];
        let pois = [];
        let bounds = null;

        if (geoJson) {
            // 1. Route Line
            let coordinates = [];
            if (geoJson.geo_json?.features) {
                const lineString = geoJson.geo_json.features.find(f => f.geometry.type === 'LineString');
                if (lineString) coordinates = lineString.geometry.coordinates;

                // Extract POIs from features
                pois = geoJson.geo_json.features
                    .filter(f => f.geometry.type === 'Point' && f.properties?.amenity)
                    .map(f => ({
                        lat: f.geometry.coordinates[1],
                        lng: f.geometry.coordinates[0],
                        name: f.properties.name || f.properties.amenity,
                        type: f.properties.amenity
                    }));

            } else if (geoJson.route?.coordinates) {
                coordinates = geoJson.route.coordinates;
            }

            // Convert [lng, lat] -> [lat, lng] for Leaflet
            // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
            if (coordinates.length > 0) {
                // Check format and filter invalid coords
                positions = coordinates
                    .map(coord => {
                        const lat = Number(coord[1]);
                        const lng = Number(coord[0]);
                        return (Number.isFinite(lat) && Number.isFinite(lng)) ? [lat, lng] : null;
                    })
                    .filter(p => p !== null);

                if (positions.length > 0) {
                    // Calculate bounds
                    const lats = positions.map(p => p[0]);
                    const lngs = positions.map(p => p[1]);
                    bounds = [
                        [Math.min(...lats), Math.min(...lngs)],
                        [Math.max(...lats), Math.max(...lngs)]
                    ];
                }
            }
        }

        // Validate POIs
        pois = pois.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

        // Fallback for demo if no geoJson but startLocation exists
        if (positions.length === 0 && startLocation && Number.isFinite(startLocation.lat) && Number.isFinite(startLocation.lng)) {
            const { lat, lng } = startLocation;
            // Mock small route
            positions = [
                [lat, lng],
                [lat + 0.01, lng + 0.01],
                [lat + 0.02, lng + 0.005]
            ];
            bounds = [
                [lat, lng],
                [lat + 0.02, lng + 0.01]
            ];
        }

        return { positions, bounds, pois };
    }, [geoJson, startLocation]);

    const startPoint = positions.length > 0 ? positions[0] : null;
    const endPoint = positions.length > 0 ? positions[positions.length - 1] : null;

    // Default center
    // Default center with validation
    const defaultCenter = [27.7172, 85.3240];
    const center = startPoint ||
        (startLocation && typeof startLocation.lat === 'number' && typeof startLocation.lng === 'number'
            ? [startLocation.lat, startLocation.lng]
            : defaultCenter);

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            scrollWheelZoom={false}
        >
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Topo">
                    <TileLayer
                        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>

                {/* POI Layer Group */}
                <LayersControl.Overlay checked name="Points of Interest">
                    <LayerGroup>
                        {pois.map((poi, idx) => (
                            <Marker
                                key={`poi-${idx}`}
                                position={[poi.lat, poi.lng]}
                                icon={PoiIcon(poi.type)}
                            >
                                <Popup>
                                    <div className="text-sm font-bold capitalize">{poi.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{poi.type}</div>
                                </Popup>
                            </Marker>
                        ))}
                    </LayerGroup>
                </LayersControl.Overlay>
            </LayersControl>

            {/* Route Polyline */}
            {positions.length > 0 && (
                <Polyline
                    positions={positions}
                    color="#2563eb" // Blue route
                    weight={4}
                    opacity={0.8}
                />
            )}

            {/* Start Marker */}
            {startPoint && (
                <Marker position={startPoint} icon={StartIcon}>
                    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                        Start
                    </Tooltip>
                </Marker>
            )}

            {/* End Marker */}
            {endPoint && (
                <Marker position={endPoint} icon={EndIcon}>
                    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                        End
                    </Tooltip>
                </Marker>
            )}

            <MapUpdater center={center} bounds={bounds} />
        </MapContainer>
    );
};

export default TrailMap;
