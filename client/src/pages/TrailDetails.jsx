import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import TrailMap from '../components/map/TrailMap';
import ElevationChart from '../components/map/ElevationChart';
import WeatherForecast from '../components/TrailDetails/WeatherForecast';
import {
  Star, Heart, Navigation, Calendar, Ruler,
  TrendingUp, DollarSign, Home, User, ArrowRight,
  ArrowLeft, X, ChevronLeft, ChevronRight, CheckCircle
} from 'lucide-react';

// --- Constants ---
const PLACEHOLDER = 'https://via.placeholder.com/800x400?text=Trail';
const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700 border-green-300',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  challenging: 'bg-orange-100 text-orange-700 border-orange-300',
  difficult: 'bg-red-100 text-red-700 border-red-300',
};

// --- Helpers ---
const imgFallback = (e) => { e.target.src = PLACEHOLDER; };
const getDifficultyColor = (d) => DIFFICULTY_COLORS[d?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300';

const formatValue = (val, formatter) => {
  if (val == null) return null;
  return typeof val === 'object' ? formatter(val) : val;
};

const checkUserList = (list, id) =>
  list?.some((h) => (typeof h === 'string' ? h : h.id || h._id) === id) ?? false;

// --- Sub-Components ---
const StatItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <div className="min-w-0 flex-1 overflow-hidden">
      <p className="text-muted-foreground text-[10px] leading-tight truncate">{label}</p>
      <p className="text-foreground text-xs font-medium truncate" title={value}>{value}</p>
    </div>
  </div>
);

const Img = ({ src, alt, className = 'w-full h-full object-cover' }) => (
  <img src={src || PLACEHOLDER} alt={alt} className={className} onError={imgFallback} />
);

const ImageGallery = ({ images, selectedIndex, onSelect, onClose, trailName }) => {
  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onSelect((p) => (p > 0 ? p - 1 : images.length - 1));
      else if (e.key === 'ArrowRight') onSelect((p) => (p < images.length - 1 ? p + 1 : 0));
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [images.length, onClose, onSelect]);

  const nav = (dir) => onSelect((p) =>
    dir === -1 ? (p > 0 ? p - 1 : images.length - 1) : (p < images.length - 1 ? p + 1 : 0)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center justify-center mb-3">
          <Img src={images[selectedIndex]} alt={`${trailName} - ${selectedIndex + 1}`} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
        {images.length > 1 && (
          <>
            <button onClick={() => nav(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => nav(1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5 overflow-x-auto pb-3 px-3">
              {images.map((img, i) => (
                <button key={i} onClick={() => onSelect(i)}
                  className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${i === selectedIndex ? 'border-white scale-105' : 'border-white/30 hover:border-white/60'}`}>
                  <Img src={img} alt={`Thumb ${i + 1}`} />
                </button>
              ))}
            </div>
          </>
        )}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-xs">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

const PermitCard = ({ permit }) => (
  <div className="bg-gray-50/70 rounded-lg p-3 border border-border flex flex-col justify-center">
    <h4 className="font-semibold text-foreground text-sm mb-1.5 break-words">
      {permit.name} {permit.acronym && <span className="text-muted-foreground text-xs font-normal">({permit.acronym})</span>}
    </h4>
    {permit.rates && (
      <div className="flex flex-wrap gap-2 text-xs">
        {['Nepali', 'SAARC', 'Foreigner'].map((type) =>
          permit.rates[type] != null ? (
            <div key={type} className="bg-white px-2 py-1 rounded border border-border flex items-center gap-1.5 select-all">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                {type === 'Nepali' ? 'NPR' : type === 'SAARC' ? 'SAARC' : 'INTL'}
              </span>
              <span className="font-bold text-foreground">Rs. {permit.rates[type].toLocaleString()}</span>
            </div>
          ) : null
        )}
      </div>
    )}
  </div>
);

// --- Main Component ---
const TrailDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const mapSectionRef = useRef(null);

  const [trail, setTrail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch trail data
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const fetchTrail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await axios.get(`/api/trails/${id}`);
        if (!cancelled) { setTrail(data); setIsLoading(false); }

        // Lazy-load heavy assets in parallel
        axios.get(`/api/trails/${id}/media`).then(({ data: m }) => {
          if (!cancelled && m.images?.length) setTrail((p) => ({ ...p, images: m.images }));
        }).catch(() => { });
        axios.get(`/api/trails/${id}/map`).then(({ data: m }) => {
          if (!cancelled && m.features?.length) setTrail((p) => ({ ...p, geoJson: m }));
        }).catch(() => { });
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed to load trail'); setIsLoading(false); }
      }
    };
    fetchTrail();
    return () => { cancelled = true; };
  }, [id]);

  // Sync favorite & completed state from user profile
  useEffect(() => {
    if (!user || !id) return;
    setIsFavorite(checkUserList(user.savedHikes, id));
    setIsCompleted(checkUserList(user.pastHikes, id));
  }, [user, id]);

  const toggleAsync = useCallback(async (endpoint, state, setState) => {
    if (!user) { alert('Please login first'); return; }
    const prev = state;
    setState(!prev);
    try {
      const { data } = await axios.post(endpoint, { trailId: id, trailName: trail?.name });
      if (!data.success) setState(prev);
    } catch { setState(prev); }
  }, [user, id, trail?.name]);

  const handleReviewSubmit = async () => {
    if (!user) return;
    if (!newReview.rating) return alert('Please select a rating');
    try {
      setIsSubmittingReview(true);
      const { data } = await axios.post(`/api/trails/${id}/reviews`, {
        userId: user._id, userName: user.name, userImage: user.profilePicture,
        rating: newReview.rating, comment: newReview.comment,
      });
      if (data) {
        setTrail((p) => ({ ...p, reviews: data.reviews, rating: data.rating, numReviews: data.numReviews }));
        setNewReview({ rating: 0, comment: '' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally { setIsSubmittingReview(false); }
  };

  const allImages = useMemo(() => {
    if (!trail?.images?.length) return [PLACEHOLDER];
    return trail.images;
  }, [trail]);

  const heroImages = allImages.slice(0, 3);
  const galleryImages = allImages.slice(3);

  const locationText = useMemo(() => {
    if (!trail?.location) return 'Nepal';
    if (typeof trail.location === 'string') return `Nepal | ${trail.location}`;
    const parts = ['Nepal'];
    if (trail.location.provinces?.length) {
      parts.push(trail.location.provinces.join(', '));
    } else if (trail.province || trail.region) {
      parts.push(trail.province || trail.region);
    }
    if (trail.location.districts?.length) {
      parts.push(trail.location.districts.join(', '));
    } else if (trail.district) {
      parts.push(trail.district);
    }
    return parts.join(' | ');
  }, [trail]);

  const routeText = useMemo(() => {
    if (typeof trail?.location === 'object' && (trail.location.start || trail.location.end)) {
      return `${trail.location.start || 'Start'} – ${trail.location.end || 'End'}`;
    }
    return null;
  }, [trail]);

  const infoGrid = useMemo(() => [
    { label: 'Location', value: locationText },
    routeText && { label: 'Route', value: routeText },
    trail?.type && { label: 'Trail Type', value: trail.type },
  ].filter(Boolean), [locationText, routeText, trail?.type]);

  // --- Loading / Error states ---
  if (isLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
        <p className="text-muted-foreground text-sm">Loading trail…</p>
      </div>
    </div>
  );

  if (error || !trail) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h2 className="text-foreground text-lg font-bold mb-1">Trail not found</h2>
      <p className="text-muted-foreground text-xs mb-3">{error || 'Unable to load trail details'}</p>
      <button onClick={() => navigate('/explore')} className="text-primary text-sm hover:underline">Back to Explore</button>
    </div>
  );

  const tags = trail.tags || [];
  const reviews = trail.reviews || [];
  const itinerary = (trail.itinerary || []).map((item) =>
    typeof item === 'string' ? { description: item, points: [] } : item
  );

  const openGallery = (index = 0) => { setSelectedImageIndex(index); setShowGallery(true); };



  const stats = [
    { icon: Calendar, label: 'Duration', value: formatValue(trail.duration, (d) => `${d.min_days || 0}–${d.max_days || 0} days`) || trail.duration || 'N/A' },
    trail.distance && { icon: Ruler, label: 'Distance', value: formatValue(trail.distance, (d) => `${d.value || d.min_km || 0} ${d.unit || 'km'}`) || `${trail.distance} km` },
    trail.altitude && { icon: TrendingUp, label: 'Max Altitude', value: formatValue(trail.altitude, (a) => `${a.max_m?.toLocaleString() || 'N/A'} m`) || `${trail.altitude.toLocaleString()} m` },
    trail.cost && { icon: DollarSign, label: 'Est. Cost', value: formatValue(trail.cost, (c) => `${c.min_npr || 0}–${c.max_npr || 0} NPR`) || `NPR ${trail.cost}` },
    trail.accommodationType && { icon: Home, label: 'Accommodation', value: trail.accommodationType },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-10 pt-3">
      <div className="w-full px-3 sm:px-5 lg:px-7 max-w-7xl mx-auto flex flex-col items-center sm:items-stretch">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="mb-2 flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs self-start">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Hero */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden mb-5 border border-border w-full">
          <div className="relative h-[30vh] min-h-[220px] w-full flex gap-0.5">
            {heroImages.map((img, i) => (
              <div key={i} className="relative flex-1 overflow-hidden">
                <Img src={img} alt={`${trail.name} ${i + 1}`} />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 pointer-events-none">
              <div className="flex items-end justify-between pointer-events-auto max-w-full">
                <div className="max-w-[80%] min-w-0 pr-2">
                  <h1 className="text-white text-xl sm:text-2xl font-bold mb-1.5 drop-shadow-md truncate break-words">{trail.name}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${getDifficultyColor(trail.difficulty)}`}>
                      {trail.difficulty}
                    </span>
                    <div className="flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-foreground text-[10px] font-bold">{trail.rating}</span>
                    </div>
                  </div>
                </div>
                {allImages.length > 3 && (
                  <button onClick={() => openGallery(0)} className="bg-white/90 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-900 hover:bg-white shadow-md flex items-center gap-1.5 shrink-0 flex-nowrap">
                    See All <span className="bg-primary text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0">{allImages.length}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            {infoGrid.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 text-xs w-full">
                {infoGrid.map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">{label}</p>
                    <p className="text-foreground font-medium break-words leading-snug">{value}</p>
                  </div>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5 w-full">
                {tags.map((tag, i) => (
                  <span key={i} className="text-muted-foreground text-[10px] bg-secondary/10 px-2 py-0.5 rounded max-w-full break-words truncate" title={tag}>{tag}</span>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border w-full">
              {[
                { action: () => toggleAsync('/api/users/saved-hikes', isFavorite, setIsFavorite), active: isFavorite, icon: Heart, label: isFavorite ? 'Saved' : 'Save', activeClass: 'bg-primary text-white' },
                { action: () => toggleAsync('/api/users/completed-hikes', isCompleted, setIsCompleted), active: isCompleted, icon: CheckCircle, label: isCompleted ? 'Completed' : 'Mark Complete', activeClass: 'bg-green-600 text-white' },
                { action: () => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), active: true, icon: Navigation, label: 'View Map', activeClass: 'bg-accent text-white hover:bg-accent/90' },
              ].map(({ action, active, icon: Icon, label, activeClass }, i) => (
                <button key={i} onClick={action}
                  className={`flex-1 overflow-hidden flex-nowrap shrink-0 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${i < 2 ? (active ? activeClass : 'bg-white border border-border hover:bg-gray-50') : activeClass}`}>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${i < 2 && active ? 'fill-current' : ''}`} /> <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 mb-5 w-full">
          <h2 className="text-foreground text-base font-bold mb-3">Trail Details</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 w-full">
            {stats.map((s, i) => <StatItem key={i} {...s} />)}
          </div>
        </section>

        {/* Description & Gallery */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 mb-5 w-full">
          <h2 className="text-foreground text-base font-bold mb-2">About this Trail</h2>
          <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm mb-6 break-words">
            {trail.description || 'No description available.'}
          </p>

          {trail.permits_required?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-foreground text-sm font-semibold mb-3 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-primary" /> Permits & Fees</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trail.permits_required.map((p, i) => <PermitCard key={i} permit={p} />)}
              </div>
            </div>
          )}

          {galleryImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-foreground text-sm font-semibold">More Photos</h3>
                {allImages.length > 2 && (
                  <button onClick={() => openGallery(2)} className="text-primary text-xs font-medium hover:underline flex items-center gap-0.5">
                    See All ({allImages.length}) <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {galleryImages.slice(0, 4).map((img, i) => (
                  <div key={i} onClick={() => openGallery(i + 2)} className="rounded-md overflow-hidden h-28 cursor-pointer hover:scale-105 transition-transform">
                    <Img src={img} alt={`View ${i + 3}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Full-width Map */}
        <section ref={mapSectionRef} className="bg-white rounded-xl shadow-sm border border-border mb-5 w-full overflow-hidden">
          <div className="px-4 pt-3 pb-0 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground truncate">Trail Map &amp; POIs</h2>
          </div>
          <div className="h-[480px] w-full relative mt-2 shrink-0">
            <TrailMap geoJson={trail.geoJson} startLocation={trail.location} />
          </div>
        </section>

        {/* Elevation Profile — below map */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 mb-5 w-full overflow-hidden">
          <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5 truncate">
            <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" /> Elevation Profile
          </h3>
          <div className="h-[350px] min-h-[350px] w-full">
            <ElevationChart geoJson={trail.geoJson} trailData={trail} />
          </div>
        </section>

        {/* Weather */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 mb-5 w-full">
          <WeatherForecast lat={trail.latitude || 27.7172} lng={trail.longitude || 85.3240} />
        </section>

        {/* Itinerary */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 mb-5 w-full">
          <h2 className="text-foreground text-base font-bold mb-3">Itinerary</h2>
          <div className="space-y-2">
            {itinerary.length > 0 ? itinerary.map((item, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 bg-gray-50 rounded-lg border-l-2 border-primary min-w-0">
                <div className="shrink-0 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center font-bold text-[10px]">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  {item.day && <p className="text-foreground text-xs font-semibold break-words">{item.day}</p>}
                  {item.description && <p className="text-foreground text-xs pt-0.5 break-words">{item.description}</p>}
                  {item.points?.length > 0 && (
                    <ul className="text-muted-foreground text-[10px] mt-1.5 space-y-0.5 ml-3">
                      {item.points.map((pt, j) => <li key={j} className="list-disc break-words">{pt}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )) : <p className="text-muted-foreground text-xs italic truncate">Itinerary not available.</p>}
          </div>
        </section>

        {/* Reviews */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 mb-5 w-full">
          <h2 className="text-foreground text-base font-bold mb-3 truncate">Reviews ({reviews.length})</h2>

          {user ? (
            <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-border">
              <h3 className="text-xs font-semibold mb-2 truncate">Write a Review</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground truncate">Rating:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setNewReview((p) => ({ ...p, rating: s }))} className="focus:outline-none hover:scale-110 transition-transform">
                      <Star className={`w-5 h-5 ${s <= newReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea value={newReview.comment} onChange={(e) => setNewReview((p) => ({ ...p, comment: e.target.value }))}
                  placeholder="Share your experience…"
                  className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]" />
                <button onClick={handleReviewSubmit}
                  disabled={isSubmittingReview || !newReview.comment.trim() || !newReview.rating}
                  className="self-end px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmittingReview ? 'Posting…' : 'Post Review'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs break-words">
              Please <button onClick={() => navigate('/login')} className="font-bold hover:underline">login</button> to leave a review.
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-muted-foreground text-xs">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((r, i) => (
                <div key={r.id || i} className="p-3 bg-gray-50 rounded-lg min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {r.userImage ? <Img src={r.userImage} alt={r.userName} /> : <User className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-xs font-semibold truncate">{r.userName || 'User'}</p>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                        <span className="text-[10px] font-medium shrink-0">{r.rating}</span>
                      </div>
                    </div>
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-foreground/80 text-xs break-words">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Gallery Modal */}
      {showGallery && allImages.length > 0 && (
        <ImageGallery
          images={allImages}
          selectedIndex={selectedImageIndex}
          onSelect={setSelectedImageIndex}
          onClose={() => setShowGallery(false)}
          trailName={trail.name}
        />
      )}
    </div>
  );
};

export default TrailDetails;