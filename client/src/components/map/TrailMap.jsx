import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, LayersControl, LayerGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mi from 'leaflet/dist/images/marker-icon.png';
import ms from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({ iconUrl: mi, shadowUrl: ms, iconSize: [25, 41], iconAnchor: [12, 41] });

const dot = (bg, e) => L.divIcon({ className: '', html: `<div style="background:${bg};width:26px;height:26px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:14px">${e}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });

const EMOJI = {
  // Accommodation
  hotel:'🏠', guest_house:'🏡', hostel:'🛏️', alpine_hut:'🛖', camp_site:'⛺', chalet:'🏡',
  // Food
  restaurant:'🍴', cafe:'☕', bar:'🍺', pub:'🍺', fast_food:'🍟', drinking_water:'🚰',
  // Nature
  peak:'🏔️', spring:'💧', cliff:'🪨', cave_entrance:'🕳️', water:'🌊', waterfall:'💦', park:'🌿', nature_reserve:'🌲',
  // Views & Attractions
  viewpoint:'👁️', attraction:'⭐', museum:'🏛️', information:'ℹ️', monument:'🗿', memorial:'🪦', ruins:'🏚️', tower:'🗼'
};

const LABELS = {
  hotel:'Hotel', guest_house:'Guest House', hostel:'Hostel', alpine_hut:'Mountain Hut', camp_site:'Campsite', chalet:'Chalet',
  restaurant:'Restaurant', cafe:'Cafe', bar:'Bar', pub:'Pub', fast_food:'Fast Food', drinking_water:'Drinking Water',
  peak:'Mountain Peak', spring:'Spring', cliff:'Cliff', cave_entrance:'Cave', water:'Lake', waterfall:'Waterfall', park:'Park', nature_reserve:'Nature Reserve',
  viewpoint:'Viewpoint', attraction:'Attraction', museum:'Museum', information:'Info Point', monument:'Monument', memorial:'Memorial', ruins:'Ruins', tower:'Tower'
};

const poiIcon = t => {
  const e = EMOJI[t] || EMOJI[Object.keys(EMOJI).find(k => t?.includes(k))] || '📍';
  return L.divIcon({ className: '', html: `<span style="font-size:20px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${e}</span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
};

const FILTERS = [
  { id: 'stay', label: 'Accommodation', icon: '🏠', tags: [['tourism','hotel'],['tourism','guest_house'],['tourism','hostel'],['tourism','alpine_hut'],['tourism','camp_site'],['tourism','chalet']] },
  { id: 'food', label: 'Food & Drink', icon: '🍴', tags: [['amenity','restaurant'],['amenity','cafe'],['amenity','bar'],['amenity','pub'],['amenity','fast_food'],['amenity','drinking_water']] },
  { id: 'nature', label: 'Nature', icon: '🏔️', tags: [['natural','peak'],['natural','spring'],['natural','cliff'],['natural','cave_entrance'],['natural','water'],['waterway','waterfall'],['leisure','park'],['leisure','nature_reserve']] },
  { id: 'views', label: 'Viewpoints', icon: '👁️', tags: [['tourism','viewpoint'],['tourism','attraction'],['tourism','museum'],['tourism','information'],['historic','monument'],['historic','memorial'],['historic','ruins'],['man_made','tower']] },
];

const distToTrail = (lat, lng, trail) => {
  let min = Infinity;
  for (let i = 0; i < trail.length; i++) {
    const d = Math.sqrt((lat - trail[i][0]) ** 2 + (lng - trail[i][1]) ** 2);
    if (d < min) min = d;
  }
  return min;
};

const search = async (bbox, filters) => {
  let q = '';
  filters.forEach(f => f.tags.forEach(([k, v]) => { q += `node["${k}"="${v}"](${bbox});`; }));
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: 'data=' + encodeURIComponent(`[out:json][timeout:25];(${q});out 300;`)
    });
    const d = await r.json();
    return (d.elements || []).filter(e => e.lat && e.lon).map(e => {
      const t = e.tags || {};
      const type = t.tourism || t.amenity || t.natural || t.waterway || t.leisure || t.historic || t.man_made || 'place';
      return { lat: e.lat, lng: e.lon, name: t.name || t['name:en'] || LABELS[type] || type.replace(/_/g, ' '), type };
    });
  } catch { return []; }
};

const Fit = ({ b }) => { const m = useMap(); useEffect(() => { if (b) m.fitBounds(b, { padding: [50, 50] }); }, [b, m]); return null; };

export default function TrailMap({ geoJson, startLocation }) {
  const [on, setOn] = useState([]);
  const [pois, setPois] = useState([]);
  const [busy, setBusy] = useState(false);
  const flip = id => setOn(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const { route, bounds } = useMemo(() => {
    let coords = [];
    const feats = geoJson?.geo_json?.features;
    if (feats) { const l = feats.find(f => f.geometry.type === 'LineString'); if (l) coords = l.geometry.coordinates; }
    if (!coords.length && geoJson?.route?.coordinates) coords = geoJson.route.coordinates;
    if (!coords.length && startLocation?.lat) {
      const { lat, lng } = startLocation;
      coords = [[lng, lat], [lng + .01, lat + .01], [lng + .005, lat + .02]];
    }
    const route = coords.map(c => [Number(c[1]), Number(c[0])]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    let bounds = null;
    if (route.length) {
      const la = route.map(p => p[0]), ln = route.map(p => p[1]);
      bounds = [[Math.min(...la), Math.min(...ln)], [Math.max(...la), Math.max(...ln)]];
    }
    return { route, bounds };
  }, [geoJson, startLocation]);

  useEffect(() => {
    if (!on.length || !bounds) { setPois([]); return; }
    let dead = false;
    const run = async () => {
      setBusy(true);
      const p = 0.02;
      const bb = `${bounds[0][0]-p},${bounds[0][1]-p},${bounds[1][0]+p},${bounds[1][1]+p}`;
      const raw = await search(bb, FILTERS.filter(f => on.includes(f.id)));
      const nearby = raw.filter(poi => distToTrail(poi.lat, poi.lng, route) < 0.015);
      if (!dead) { setPois(nearby); setBusy(false); }
    };
    const t = setTimeout(run, 350);
    return () => { dead = true; clearTimeout(t); };
  }, [on, bounds, route]);

  const s = route[0], e = route.at(-1);
  const c = s || (startLocation?.lat ? [startLocation.lat, startLocation.lng] : [27.7172, 85.324]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute z-[1000] bottom-6 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-2 py-1.5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => flip(f.id)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${on.includes(f.id) ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}>
            <span>{f.icon}</span><span className="hidden sm:inline">{f.label}</span>
          </button>
        ))}
        {on.length > 0 && <button onClick={() => { setOn([]); setPois([]); }} className="ml-0.5 text-gray-400 hover:text-red-500 text-sm font-bold">✕</button>}
        {busy && <div className="ml-1 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
      </div>
      {pois.length > 0 && !busy && <div className="absolute z-[1000] bottom-[68px] left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">{pois.length} found</div>}

      <MapContainer center={c} zoom={13} scrollWheelZoom={true} touchZoom={true} doubleClickZoom={true} dragging={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topo"><TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
        </LayersControl>
        {route.length > 0 && <Polyline positions={route} color="#2563eb" weight={4} opacity={0.85} />}
        {s && <Marker position={s} icon={dot('#16a34a','🚩')}><Tooltip permanent direction="top" offset={[0,-12]}>Start</Tooltip></Marker>}
        {e && <Marker position={e} icon={dot('#dc2626','🏁')}><Tooltip permanent direction="top" offset={[0,-12]}>End</Tooltip></Marker>}
        <LayerGroup>
          {pois.map((p, i) => (
            <Marker key={`${p.lat}-${p.lng}-${i}`} position={[p.lat, p.lng]} icon={poiIcon(p.type)}>
              <Popup>
                <b style={{textTransform:'capitalize'}}>{p.name}</b><br/>
                <small style={{color:'#888'}}>{LABELS[p.type] || p.type.replace(/_/g,' ')}</small>
              </Popup>
            </Marker>
          ))}
        </LayerGroup>
        <Fit b={bounds} />
      </MapContainer>
    </div>
  );
}