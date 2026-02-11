import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import TrailMap from '../components/map/TrailMap';
import ElevationChart from '../components/map/ElevationChart';
// TerrainAnalysis removed
import WeatherForecast from '../components/TrailDetails/WeatherForecast';
import {
  MapPin, Star, Heart, Navigation, Calendar, Ruler,
  TrendingUp, DollarSign, Home,
  User, ArrowRight, ArrowLeft, X, ChevronLeft, ChevronRight, CheckCircle
} from 'lucide-react';

const TrailDetails = () => {
  // --- 1. ROUTING & STATE ---
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [trail, setTrail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Ref for map scrolling
  const mapSectionRef = useRef(null);

  // --- 2. DATA FETCHING FROM API ---
  useEffect(() => {
    const fetchTrail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch Core Data (Fastest - Text only)
        // We await this because we need the basic trail structure to render the page layout
        const response = await axios.get(`/api/trails/${id}`);
        const trailData = response.data;
        setTrail(trailData);
        setIsLoading(false); // Show content immediately

        // 2. Fire-and-forget lazy loaders for heavy assets (Images and Map)
        // We do NOT await these together, they run in parallel and update state independently

        // Load Images
        const loadImages = async () => {
          try {
            const mediaResp = await axios.get(`/api/trails/${id}/media`);
            if (mediaResp.data.images && mediaResp.data.images.length > 0) {
              setTrail(prev => ({ ...prev, images: mediaResp.data.images }));
            }
          } catch (ignored) { console.warn("Image fetch failed", ignored); }
        };

        // Load Map Data
        const loadMap = async () => {
          try {
            const mapResp = await axios.get(`/api/trails/${id}/map`);
            if (mapResp.data.geoJson) {
              setTrail(prev => ({ ...prev, geoJson: mapResp.data.geoJson }));
            }
          } catch (ignored) { console.warn("Map fetch failed", ignored); }
        };

        // Start both independent fetches
        loadImages();
        loadMap();

      } catch (err) {
        console.error('Error fetching trail:', err);
        setError(err.message || 'Failed to load trail details');
        setIsLoading(false);
      }
    };
    if (id) {
      fetchTrail();
    }
  }, [id]);

  // Check if trail is already saved in user profile
  useEffect(() => {
    if (user && user.savedHikes && id) {
      const isSaved = user.savedHikes.some(hike => {
        const hikeId = typeof hike === 'string' ? hike : hike.id || hike._id;
        return hikeId === id;
      });
      setIsFavorite(isSaved);
    }
  }, [user, id]);

  // Check if trail is already completed in user profile
  useEffect(() => {
    if (user && user.pastHikes && id) {
      const isCompleted = user.pastHikes.some(hike => {
        const hikeId = typeof hike === 'string' ? hike : hike.id || hike._id;
        return hikeId === id;
      });
      setIsCompleted(isCompleted);
    }
  }, [user, id]);

  const handleToggleSave = async () => {
    if (!user) {
      // Redirect to login or show toast
      alert("Please login to save trails");
      return;
    }

    try {
      const previousState = isFavorite;
      setIsFavorite(!previousState); // Optimistic update

      const response = await axios.post('/api/users/saved-hikes', {
        trailId: id,
        trailName: trail?.name
      });

      if (response.data.success) {
        // Update local auth store if needed to keep UI in sync across pages
        //Ideally updateAuthUser({ ...user, savedHikes: response.data.savedHikes });
        // For now, simpler approach or assume page refresh updates it
      } else {
        setIsFavorite(previousState); // Revert on failure
      }
    } catch (error) {
      console.error("Error saving trail:", error);
      setIsFavorite(!isFavorite); // Revert on error
    }
  };

  const handleToggleCompleted = async () => {
    if (!user) {
      alert("Please login to mark trails as completed");
      return;
    }

    try {
      const previousState = isCompleted;
      setIsCompleted(!previousState); // Optimistic update

      const response = await axios.post('/api/users/completed-hikes', {
        trailId: id,
        trailName: trail?.name
      });

      if (response.data.success) {
        // Success - the optimistic update is already applied
      } else {
        setIsCompleted(previousState); // Revert on failure
      }
    } catch (error) {
      console.error("Error marking trail as completed:", error);
      setIsCompleted(!isCompleted); // Revert on error
    }
  };

  // C
  // Compute images array safely
  const allImages = React.useMemo(() => {
    if (!trail) return ["https://via.placeholder.com/800x400?text=Trail"];
    return (trail.images && Array.isArray(trail.images) && trail.images.length > 0)
      ? trail.images
      : ["https://via.placeholder.com/800x400?text=Trail"];
  }, [trail]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (showImageGallery && allImages.length > 0) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setShowImageGallery(false);
        } else if (e.key === 'ArrowLeft') {
          setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
        } else if (e.key === 'ArrowRight') {
          setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showImageGallery, allImages.length]);


  // --- 4. ERROR HANDLING ---
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading trail details...</p>
        </div>
      </div>
    );
  }

  if (error || !trail) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-4">
        <h2 className="text-foreground text-xl font-bold mb-2">Trail not found</h2>
        <p className="text-muted-foreground text-sm mb-4">{error || 'Unable to load trail details'}</p>
        <button onClick={() => navigate('/explore')} className="text-primary hover:underline">
          Back to Explore
        </button>
      </div>
    );
  }

  // --- 5. HELPER FUNCTIONS ---
  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'challenging': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'difficult': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // --- 6. DATA PREPARATION ---
  // First 3 images for hero section
  const heroImages = allImages.slice(0, 3);
  // Remaining images for gallery (if more than 3)
  const galleryImages = allImages.slice(3);

  const tags = trail?.tags || [];

  // Handle itinerary - can be array of objects or strings
  const itinerary = (trail?.itinerary || []).map(item => {
    if (typeof item === 'string') {
      return { description: item, points: [] };
    }
    return item;
  });

  const reviews = trail?.reviews || [];



  return (
    <div className="min-h-screen bg-background pb-12 pt-4">
      <div className="w-full px-4 sm:px-6 lg:px-8">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* --- SECTION 1: COMPACT HERO WITH 3 IMAGES --- */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-border">
          {/* Hero section with 3 images side by side */}
          <div className="relative h-[35vh] min-h-[250px] w-full flex gap-1">
            {heroImages.length > 0 ? (
              <>
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={heroImages[0]}
                    alt={`${trail.name} - View 1`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/800x400?text=Trail";
                    }}
                  />
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={heroImages.length > 1 ? heroImages[1] : heroImages[0]}
                    alt={`${trail.name} - View 2`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/800x400?text=Trail";
                    }}
                  />
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={heroImages.length > 2 ? heroImages[2] : heroImages[0]}
                    alt={`${trail.name} - View 3`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/800x400?text=Trail";
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src="https://via.placeholder.com/800x400?text=Trail"
                  alt={trail.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-white text-2xl md:text-3xl font-bold mb-2 drop-shadow-md">
                    {trail.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${getDifficultyColor(trail.difficulty)}`}>
                      {trail.difficulty}
                    </span>
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-foreground text-xs font-bold">{trail.rating}</span>
                    </div>
                  </div>
                </div>
                {allImages.length > 3 && (
                  <button
                    onClick={() => {
                      setShowImageGallery(true);
                      setSelectedImageIndex(0);
                    }}
                    className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-white transition-all shadow-lg flex items-center gap-2"
                  >
                    <span>See All</span>
                    <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      {allImages.length}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
              {trail.location && (
                <div>
                  <p className="text-muted-foreground text-xs">Location</p>
                  <p className="text-foreground font-medium">
                    {typeof trail.location === 'object'
                      ? `${trail.location.start || ''} - ${trail.location.end || ''}`
                      : trail.location
                    }
                  </p>
                </div>
              )}
              {(trail.province || trail.region) && (
                <div>
                  <p className="text-muted-foreground text-xs">Region</p>
                  <p className="text-foreground font-medium">{trail.province || trail.region}</p>
                </div>
              )}
              {trail.district && (
                <div>
                  <p className="text-muted-foreground text-xs">District</p>
                  <p className="text-foreground font-medium">{trail.district}</p>
                </div>
              )}
              {trail.type && (
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="text-foreground font-medium">{trail.type}</p>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className="text-muted-foreground text-xs bg-secondary/10 px-2.5 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border">
              {/* Connected to User Favorites API */}
              <button
                onClick={handleToggleSave}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${isFavorite ? 'bg-primary text-white' : 'bg-white border border-border hover:bg-gray-50'
                  }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Saved' : 'Save'}
              </button>

              {/* Completed Button */}
              <button
                onClick={handleToggleCompleted}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${isCompleted ? 'bg-green-600 text-white' : 'bg-white border border-border hover:bg-gray-50'
                  }`}
              >
                <CheckCircle className={`w-4 h-4 ${isCompleted ? 'fill-current' : ''}`} />
                {isCompleted ? 'Completed' : 'Mark Complete'}
              </button>

              <button
                onClick={scrollToMap}
                className="flex-1 py-2.5 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 flex items-center justify-center gap-2 transition-all"
              >
                <Navigation className="w-4 h-4" />
                View Map
              </button>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: COMPACT STATISTICS --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="text-foreground text-lg font-bold mb-4">Trail Details</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Helper Component for Stats to reduce code repetition */}
            <StatItem
              icon={Calendar}
              label="Duration"
              value={
                trail.duration && typeof trail.duration === 'object'
                  ? `${trail.duration.min_days || 0}-${trail.duration.max_days || 0} days`
                  : trail.duration || 'N/A'
              }
            />

            {trail.distance && (
              <StatItem
                icon={Ruler}
                label="Distance"
                value={
                  typeof trail.distance === 'object'
                    ? `${trail.distance.value || trail.distance.min_km || 0} ${trail.distance.unit || 'km'}`
                    : `${trail.distance} km`
                }
              />
            )}

            {trail.altitude && (
              <StatItem
                icon={TrendingUp}
                label="Max Altitude"
                value={
                  typeof trail.altitude === 'object'
                    ? `${trail.altitude.max_m ? trail.altitude.max_m.toLocaleString() : 'N/A'} m`
                    : `${trail.altitude.toLocaleString()} m`
                }
              />
            )}

            {trail.cost && (
              <StatItem
                icon={DollarSign}
                label="Est. Cost"
                value={
                  typeof trail.cost === 'object'
                    ? `${trail.cost.min_npr || 0}-${trail.cost.max_npr || 0} NPR`
                    : `NPR ${trail.cost}`
                }
              />
            )}

            {trail.accommodationType && (
              <StatItem icon={Home} label="Accommodation" value={trail.accommodationType} />
            )}

          </div>
        </div>

        {/* --- SECTION 3: DESCRIPTION (Smaller Text & Gallery) --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="text-foreground text-lg font-bold mb-3">About this Trail</h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base mb-6">
            {trail.description || "No description available."}
          </p>

          {galleryImages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground text-base font-semibold">More Photos</h3>
                {allImages.length > 2 && (
                  <button
                    onClick={() => {
                      setShowImageGallery(true);
                      setSelectedImageIndex(2);
                    }}
                    className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    See All ({allImages.length})
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {galleryImages.slice(0, 4).map((img, index) => (
                  <div
                    key={index}
                    className="rounded-lg overflow-hidden h-32 shadow-sm cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => {
                      setShowImageGallery(true);
                      setSelectedImageIndex(index + 2);
                    }}
                  >
                    <img
                      src={img}
                      alt={`View ${index + 3}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/400x300?text=Trail";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- SECTION 4: MAP & ANALYSIS --- */}
        <div ref={mapSectionRef} className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 h-[600px] lg:h-[500px]">
            {/* Map Container */}
            <div className="flex-1 h-full min-h-[300px] rounded-lg overflow-hidden border border-border relative z-0">
              <TrailMap geoJson={trail.geoJson} startLocation={trail.location} />
            </div>

            {/* Elevation & Stats Panel */}
            <div className="lg:w-1/3 flex flex-col gap-4">
              {/* Elevation Chart */}
              <div className="h-full bg-gray-50 rounded-lg p-3 border border-border flex flex-col">
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Elevation Profile
                </h3>
                <div className="flex-1 w-full min-h-0">
                  <ElevationChart geoJson={trail.geoJson} trailData={trail} />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- SECTION 5: WEATHER FORECAST --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          {/* Use latitude/longitude from trail data for accurate weather */}
          <WeatherForecast lat={trail.latitude || 27.7172} lng={trail.longitude || 85.3240} />
        </div>

        {/* --- SECTION 5: COMPACT ITINERARY --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="text-foreground text-lg font-bold mb-4">Itinerary</h2>
          <div className="space-y-3">
            {itinerary.length > 0 ? (
              itinerary.map((item, index) => (
                <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg border-l-2 border-primary">
                  <div className="shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {item.day && <p className="text-foreground text-sm font-semibold">{item.day}</p>}
                    {item.description && <p className="text-foreground text-sm pt-0.5">{item.description}</p>}
                    {item.points && item.points.length > 0 && (
                      <ul className="text-muted-foreground text-xs mt-2 space-y-1 ml-3">
                        {item.points.map((point, pidx) => (
                          <li key={pidx} className="list-disc">{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm italic">Itinerary not available.</p>
            )}
          </div>
        </div>

        {/* --- SECTION 6: COMPACT REVIEWS --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground text-lg font-bold">Reviews ({reviews.length})</h2>
            <button className="text-primary text-sm font-medium hover:underline">Write a Review</button>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-muted-foreground text-sm">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, idx) => (
                <div key={review.id || idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-semibold">{review.userName || 'User'}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-muted-foreground">{review.rating}</span>
                      </div>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{review.date}</span>
                  </div>
                  <p className="text-foreground/80 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 7: RELATED TRAILS (Smaller Cards) --- */}
        {/* TODO: Implement similar trails recommendations from API */}
        {/* <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h3 className="text-foreground text-lg font-bold mb-4">Similar Trails</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {similarTrails
              .filter(t => t.id !== trail.id)
              .slice(0, 2)
              .map((relatedTrail) => (
                <div
                  key={relatedTrail.id}
                  onClick={() => navigate(`/trail/${relatedTrail.id}`)}
                  className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-border"
                >
                  <div className="w-16 h-16 rounded-md overflow-hidden shrink-0">
                    <img
                      src={relatedTrail.image}
                      alt={relatedTrail.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-foreground text-sm font-semibold truncate">{relatedTrail.name}</p>
                    <p className="text-muted-foreground text-xs mb-1">{relatedTrail.region}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium uppercase">
                        {relatedTrail.difficulty}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground self-center" />
                </div>
              ))}
          </div>
        </div> */}

      </div>

      {/* Image Gallery Modal */}
      {showImageGallery && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setShowImageGallery(false)}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-full text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center mb-4">
              <img
                src={allImages[selectedImageIndex]}
                alt={`${trail.name} - Image ${selectedImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/1200x800?text=Trail";
                }}
              />
            </div>

            {/* Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full text-white transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full text-white transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 px-4 hide-scrollbar">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${index === selectedImageIndex
                      ? 'border-white scale-110'
                      : 'border-white/30 hover:border-white/60'
                      }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/100x100?text=Trail";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
              {selectedImageIndex + 1} / {allImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: STAT ITEM (Keeps main code clean) ---
const StatItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-foreground text-sm font-medium">{value}</p>
    </div>
  </div>
);

export default TrailDetails;