import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockTrails } from '../data/mockData';
import {
  MapPin, Star, Heart, Navigation, Calendar, Ruler,
  TrendingUp, DollarSign, Home,
  User, ArrowRight, ArrowLeft
} from 'lucide-react';

const TrailDetails = () => {
  // --- 1. ROUTING & STATE ---
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  // Ref for map scrolling
  const mapSectionRef = useRef(null);

  // --- 2. DATA FETCHING (Mock) ---
  // BACKEND TODO: Fetch from API -> /api/trails/${id}
  const trail = mockTrails.find(t => t.id === id || t.id === String(id));

  // --- 3. ERROR HANDLING ---
  if (!trail) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-4">
        <h2 className="text-foreground text-xl font-bold mb-2">Trail not found</h2>
        <button onClick={() => navigate('/explore')} className="text-primary hover:underline">
          Back to Explore
        </button>
      </div>
    );
  }

  // --- 4. HELPER FUNCTIONS ---
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

  // --- 5. DATA PREPARATION ---
  const displayImages = trail.images || [trail.image];
  const tags = trail.tags || [];
  const itinerary = trail.itinerary || [];
  const reviews = trail.reviews || [];

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

        {/* --- SECTION 1: COMPACT HERO --- */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-border">
          {/* Reduced height to 35vh for compactness */}
          <div className="relative h-[35vh] min-h-[250px] w-full">
            <img
              src={displayImages[0]}
              alt={trail.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6">
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
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Region</p>
                <p className="text-foreground font-medium">{trail.province || trail.region}</p>
              </div>
              {trail.district && (
                <div>
                  <p className="text-muted-foreground text-xs">District</p>
                  <p className="text-foreground font-medium">{trail.district}</p>
                </div>
              )}
              {trail.trailType && (
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="text-foreground font-medium">{trail.trailType}</p>
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
              {/* BACKEND TODO: Connect to User Favorites API */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${isFavorite ? 'bg-primary text-white' : 'bg-white border border-border hover:bg-gray-50'
                  }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Saved' : 'Save'}
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
            <StatItem icon={Calendar} label="Duration" value={trail.duration} />
            <StatItem icon={Ruler} label="Distance" value={trail.distanceKm ? `${trail.distanceKm} km` : 'N/A'} />
            <StatItem icon={TrendingUp} label="Max Altitude" value={trail.maxAltitude ? `${trail.maxAltitude.toLocaleString()} m` : 'N/A'} />
            <StatItem icon={DollarSign} label="Est. Cost" value={trail.price ? `$${trail.price}` : 'Contact us'} />
            <StatItem icon={Home} label="Accommodation" value={trail.accommodationType || 'Teahouse'} />

          </div>
        </div>

        {/* --- SECTION 3: DESCRIPTION (Smaller Text & Gallery) --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="text-foreground text-lg font-bold mb-3">About this Trail</h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base mb-6">
            {trail.description || "No description available."}
          </p>

          {displayImages.length > 1 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {displayImages.slice(1, 5).map((img, index) => (
                <div key={index} className="rounded-lg overflow-hidden h-32 shadow-sm">
                  <img
                    src={img}
                    alt={`View ${index}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 4: MAP (Kept Large as Requested) --- */}
        <div ref={mapSectionRef} className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="text-foreground text-lg font-bold mb-4">Interactive Map</h2>

          {/* BACKEND TODO: Insert Google Maps / Leaflet Component Here */}
          <div className="w-full h-[50vh] min-h-[350px] bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            <div className="text-center">
              <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-foreground font-medium text-sm">Map View Loading...</p>
              <p className="text-muted-foreground text-xs">Lat: {trail.latitude || '-'}, Long: {trail.longitude || '-'}</p>
            </div>
          </div>
        </div>

        {/* --- SECTION 5: COMPACT ITINERARY --- */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="text-foreground text-lg font-bold mb-4">Itinerary</h2>
          <div className="space-y-3">
            {itinerary.length > 0 ? (
              itinerary.map((day, index) => (
                <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg border-l-2 border-primary">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <p className="text-foreground text-sm pt-0.5">{day}</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h3 className="text-foreground text-lg font-bold mb-4">Similar Trails</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockTrails
              .filter(t => t.id !== trail.id)
              .slice(0, 2)
              .map((relatedTrail) => (
                <div
                  key={relatedTrail.id}
                  onClick={() => navigate(`/trail/${relatedTrail.id}`)}
                  className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-border"
                >
                  <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
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
        </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENT: STAT ITEM (Keeps main code clean) ---
const StatItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-foreground text-sm font-medium">{value}</p>
    </div>
  </div>
);

export default TrailDetails;