import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, LayersControl, LayerGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mi from 'leaflet/dist/images/marker-icon.png';
import ms from 'leaflet/dist/images/marker-shadow.png';
import PoiSidebar, { POI_CATEGORIES } from './PoiSidebar';

// Fix default marker
L.Marker.prototype.options.icon = L.icon({ iconUrl: mi, shadowUrl: ms, iconSize: [25, 41], iconAnchor: [12, 41] });

// ─── Segment colors ───────────────────────────────────────────────────────────
const SEGMENT_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

// ─── Category color map (mirror PoiSidebar colors) ───────────────────────────
const CAT_COLOR = {
  stay: '#0ea5e9',
  food: '#f97316',
  water: '#06b6d4',
  attractions: '#8b5cf6',
  facilities: '#64748b',
  safety: '#ef4444',
  supplies: '#16a34a',
};

// ─── SVG Lucide icon strings per category ────────────────────────────────────
const CAT_SVG = {
  stay: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`,
  food: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
  water: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`,
  attractions: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3L14.5 4z"/><circle cx="12" cy="13" r="3"/></svg>`,
  facilities: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  safety: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  supplies: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
};

// ─── Dot marker for segment boundaries (A, B, C…) ────────────────────────────
const dotIcon = (bg, label) => L.divIcon({
  className: '',
  html: `<div style="background:${bg};width:24px;height:24px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:11px;font-weight:bold;color:white">${label}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ─── Lucide-based POI marker ──────────────────────────────────────────────────
const poiMarkerIcon = (catId) => {
  const color = CAT_COLOR[catId] || '#6b7280';
  const svg = CAT_SVG[catId] || CAT_SVG.attractions;
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
        ${svg}
      </div>
    </div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -34],
  });
};

// ─── Build flat list of active OSM tags from selected filter IDs ──────────────
const buildActiveTags = (selectedFilters) => {
  const tags = [];
  POI_CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      if (selectedFilters.includes(item.id)) {
        item.osmTags.forEach(([k, v]) => tags.push({ k, v, catId: cat.id, label: item.label }));
      }
    });
  });
  return tags;
};

// ─── Lookup catId from a POI's OSM tag value ──────────────────────────────────
const findCatId = (type) => {
  for (const cat of POI_CATEGORIES) {
    for (const item of cat.items) {
      for (const [, v] of item.osmTags) {
        if (v === type || type?.includes(v)) return cat.id;
      }
    }
  }
  return 'attractions';
};

// ─── Overpass query runner ────────────────────────────────────────────────────
const fetchOverpassPOIs = async (bbox, activeTags, signal) => {
  if (!activeTags.length) return [];
  // Deduplicate tags to avoid redundant node queries
  const uniqueTags = [];
  const seen = new Set();
  activeTags.forEach(t => {
    const key = `${t.k}=${t.v}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTags.push(t);
    }
  });

  const parts = uniqueTags.map(({ k, v }) => `node["${k}"="${v}"](${bbox});`).join('');
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(`[out:json][timeout:25];(${parts});out 1000;`),
      signal
    });
    if (!res.ok) {
      if (res.status === 429) console.error("Overpass API rate limit exceeded. Try again later.");
      return [];
    }
    const data = await res.json();
    return (data.elements || [])
      .filter(e => e.lat && e.lon)
      .map(e => {
        const t = e.tags || {};
        const type = t.tourism || t.amenity || t.natural || t.waterway || t.leisure || t.historic || t.shop || 'place';
        return {
          lat: e.lat,
          lng: e.lon,
          name: t.name || t['name:en'] || type.replace(/_/g, ' '),
          type,
          catId: findCatId(type),
        };
      });
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Error fetching POIs:", err);
    return [];
  }
};

// ─── Approx distance from point to trail (in degrees) ────────────────────────
const distToTrail = (lat, lng, trail) => {
  let min = Infinity;
  for (const p of trail) {
    const d = Math.sqrt((lat - p[0]) ** 2 + (lng - p[1]) ** 2);
    if (d < min) min = d;
  }
  return min;
};

// ─── Map bounds fitter ────────────────────────────────────────────────────────
const Fit = ({ b }) => {
  const map = useMap();
  useEffect(() => { if (b) map.fitBounds(b, { padding: [50, 50] }); }, [b, map]);
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrailMap({ geoJson, startLocation }) {
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [osmPois, setOsmPois] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFilter = useCallback(id =>
    setSelectedFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
    []
  );

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
    setOsmPois([]);
  }, []);

  // ── Parse segments from GeoJSON ────────────────────────────────────────────
  const { segments, allCoords, bounds, totalDistanceKm } = useMemo(() => {
    const segs = [];
    const feats = geoJson?.features || [];

    feats.forEach(f => {
      if (f.geometry?.type === 'LineString' && f.geometry.coordinates) {
        const path = f.geometry.coordinates.map(c => [Number(c[1]), Number(c[0])]);
        segs.push({
          path,
          name: f.properties?.name || `Segment ${segs.length + 1}`,
          distance: f.properties?.distanceKm || f.properties?.distance || 0,
          color: SEGMENT_COLORS[segs.length % SEGMENT_COLORS.length],
        });
      }
    });

    const all = segs.flatMap(s => s.path);
    let bnd = null;
    if (all.length) {
      let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
      for (const p of all) {
        if (p[0] < minLat) minLat = p[0]; if (p[0] > maxLat) maxLat = p[0];
        if (p[1] < minLng) minLng = p[1]; if (p[1] > maxLng) maxLng = p[1];
      }
      bnd = [[minLat, minLng], [maxLat, maxLng]];
    }
    return { segments: segs, allCoords: all, bounds: bnd, totalDistanceKm: geoJson?.totalDistanceKm || 0 };
  }, [geoJson]);

  // ── Fetch OSM POIs whenever selected filters change ────────────────────────
  useEffect(() => {
    if (!selectedFilters.length || !bounds) { setOsmPois([]); return; }

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      // 0.018 degrees is ~2km. 2km is generally accepted as the maximum reasonable walking deviation for a hiker off-trail.
      const pad = 0.018;
      const bbox = `${bounds[0][0] - pad},${bounds[0][1] - pad},${bounds[1][0] + pad},${bounds[1][1] + pad}`;
      const activeTags = buildActiveTags(selectedFilters);

      const raw = await fetchOverpassPOIs(bbox, activeTags, controller.signal);

      if (!cancelled) {
        // Keep only POIs within ~2.0 km of trail (approx 0.018 degrees)
        const nearby = raw.filter(poi => distToTrail(poi.lat, poi.lng, allCoords) < 0.018);
        setOsmPois(nearby);
        setIsLoading(false);
      }
    };

    // Debounce by 850ms to strictly avoid 429 rate limit
    const timer = setTimeout(run, 850);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedFilters, bounds, allCoords]);

  // ── Map center ─────────────────────────────────────────────────────────────
  const s = allCoords[0];
  const e = allCoords.at?.(-1) ?? allCoords[allCoords.length - 1];
  const c = s || (startLocation?.lat ? [startLocation.lat, startLocation.lng] : [27.7172, 85.324]);

  const startName = startLocation?.start || 'Start';
  const endName = startLocation?.end || 'End';

  return (
    <div className="relative h-full w-full">

      {/* Map tiles — clipped to container */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <MapContainer center={c} zoom={13} className="h-full w-full" style={{ zIndex: 0 }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Topo">
              <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Trail segments */}
          {segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1;
            const endPos = seg.path[seg.path.length - 1];
            const letter = String.fromCharCode(65 + idx);

            return (
              <LayerGroup key={idx}>
                <Polyline positions={seg.path} color={seg.color} weight={5} opacity={0.85}>
                  <Tooltip sticky>
                    <div className="p-1">
                      <b className="text-primary">{seg.name}</b><br />
                      <span className="text-gray-600">{Number(seg.distance).toFixed(1)} km</span>
                    </div>
                  </Tooltip>
                </Polyline>
                {!isLast && (
                  <Marker position={endPos} icon={dotIcon(seg.color, letter)}>
                    <Tooltip direction="top">
                      <b>Waypoint {letter}: {seg.name}</b><br />
                      <span>{Number(seg.distance).toFixed(1)} km</span>
                    </Tooltip>
                  </Marker>
                )}
              </LayerGroup>
            );
          })}

          {/* Start / End markers */}
          {s && (
            <Marker position={s} icon={dotIcon('#16a34a', '▶')}>
              <Tooltip permanent direction="top" offset={[0, -12]}>{startName}</Tooltip>
            </Marker>
          )}
          {e && (
            <Marker position={e} icon={dotIcon('#dc2626', '■')}>
              <Tooltip permanent direction="top" offset={[0, -12]}>{endName}</Tooltip>
            </Marker>
          )}

          {/* POI markers — grouped by category */}
          <LayerGroup>
            {osmPois.map((poi, i) => (
              <Marker key={i} position={[poi.lat, poi.lng]} icon={poiMarkerIcon(poi.catId)}>
                <Popup>
                  <div style={{ minWidth: '120px' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{poi.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: CAT_COLOR[poi.catId] || '#888', textTransform: 'capitalize' }}>
                      {poi.type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </LayerGroup>

          <Fit b={bounds} />
        </MapContainer>
      </div>

      {/* Distance badge — above map tiles */}
      {totalDistanceKm > 0 && (
        <div className="absolute z-[9999] top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground pointer-events-none">
          🥾 {totalDistanceKm.toFixed(1)} km total
        </div>
      )}

      {/* POI Sidebar — above map tiles, not clipped */}
      <PoiSidebar
        selectedFilters={selectedFilters}
        toggleFilter={toggleFilter}
        clearFilters={clearFilters}
        isLoading={isLoading}
        poiCount={osmPois.length}
      />

    </div>
  );
}
