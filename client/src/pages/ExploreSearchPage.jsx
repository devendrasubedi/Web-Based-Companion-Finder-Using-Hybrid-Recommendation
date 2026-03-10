import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TrailCard from '../components/TrailCard';
import axios from 'axios';
import { Search, X, SlidersHorizontal, MapPin, Calendar, Wallet, Mountain, Frown } from 'lucide-react';

const ExploreSearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sq = params.get('q') || params.get('search');
    if (sq) {
      setSearchQuery(decodeURIComponent(sq));
    }
  }, [location.search]);
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedDays, setSelectedDays] = useState('All');
  const [selectedBudget, setSelectedBudget] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [allTrails, setAllTrails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Provinces of Nepal
  const provinces = [
    'All',
    'Koshi',
    'Madhesh',
    'Bagmati',
    'Gandaki',
    'Lumbini',
    'Karnali',
    'Sudurpaschim'
  ];

  // 2. Budget Categories
  const budgetRanges = ['All', 'Low', 'Medium', 'High'];

  const difficulties = ['All', 'Easy', 'Moderate', 'Challenging', 'Difficult'];
  const daysOptions = ['All', '1-5 days', '5-10 days', '10-15 days', '15-20 days', '20+ days'];

  // Fetch trails from API
  useEffect(() => {
    const fetchTrails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get('/api/trails');
        console.log('Fetched trails:', response.data);

        let initialTrails = response.data || [];

        // 1. INSTANT LOAD from LocalStorage if available
        try {
          const cachedImages = JSON.parse(localStorage.getItem('trail_images_cache') || '{}');
          initialTrails = initialTrails.map(t => {
            const img = cachedImages[t.id] || cachedImages[String(t._id)];
            return img ? { ...t, image: img } : t;
          });
        } catch (e) { console.error("Error reading image cache", e); }

        setAllTrails(initialTrails);

        // 2. Background Fetch for missing images
        if (initialTrails.length > 0) {
          const trailIds = initialTrails.map(t => t.id || t._id);

          // Non-blocking call
          axios.post('/api/trails/batch-images', { ids: trailIds })
            .then(imgResp => {
              const imagesMap = imgResp.data;
              console.log('Fetched batch images:', Object.keys(imagesMap).length);

              try {
                const currentCache = JSON.parse(localStorage.getItem('trail_images_cache') || '{}');
                localStorage.setItem('trail_images_cache', JSON.stringify({ ...currentCache, ...imagesMap }));
              } catch (e) { /* ignore */ }

              setAllTrails(prev => prev.map(t => {
                const newImage = imagesMap[String(t.id)] || imagesMap[String(t._id)];
                return newImage ? { ...t, image: newImage } : t;
              }));
            })
            .catch(e => console.error("Background image fetch failed", e));
        }

      } catch (err) {
        console.error('Error fetching trails:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrails();
  }, []);

  // Log trail data structure when allTrails changes
  useEffect(() => {
    if (allTrails.length > 0) {
      console.log('📊 Trail Data Structure Debug:');
      console.log('Total trails loaded:', allTrails.length);
      console.log('First trail structure:', {
        name: allTrails[0].name,
        location: allTrails[0].location,
        location_provinces: allTrails[0].location?.provinces,
        province_field: allTrails[0].province,
        duration: allTrails[0].duration,
        all_keys: Object.keys(allTrails[0])
      });
      
      // Count trails by province
      const provinceCount = {};
      allTrails.forEach(t => {
        if (t.location?.provinces && Array.isArray(t.location.provinces)) {
          t.location.provinces.forEach(p => {
            provinceCount[p] = (provinceCount[p] || 0) + 1;
          });
        }
        if (t.province) {
          const prov = String(t.province);
          provinceCount[prov] = (provinceCount[prov] || 0) + 1;
        }
      });
      console.log('📍 Trails per province:', provinceCount);
      console.log('Total provinces found:', Object.keys(provinceCount).length);
    }
  }, [allTrails]);

  // Map of locations to provinces for matching
  const locationProvinceMap = {
    'Solukhumbu': 'Koshi',
    'Kaski': 'Gandaki',
    'Rasuwa': 'Bagmati',
    'Myagdi': 'Gandaki',
    'Sankhuwasabha': 'Koshi',
    'Ilam': 'Koshi',
    'Gorkha': 'Gandaki',
    'Dhading': 'Bagmati',
    'Kathmandu': 'Bagmati',
    'Taplejung': 'Koshi',
    'Panchthar': 'Koshi',
    'Gulmi': 'Gandaki',
    'Palpa': 'Gandaki',
    'Arghakhanchi': 'Lumbini',
    'Nuwakot': 'Bagmati',
    'Sindhuli': 'Bagmati',
    'Makwanpur': 'Bagmati',
    'Pokhari': 'Gandaki',
    'Junbesi': 'Koshi',
    'Nayapul': 'Gandaki',
    'Ghandruk': 'Gandaki',
    'Lukla': 'Koshi',
    'Juphal': 'Karnali'
  };

  // Normalize difficulty from API to match filter labels (Easy, Moderate, Challenging, Difficult)
  const normalizeDifficulty = (d) => {
    if (d == null) return '';
    const raw = String(d).trim();
    if (!raw || raw === '[object Object]') return '';
    const lower = raw.toLowerCase();
    // Map all variations to standard labels
    if (lower === 'hard' || lower === 'difficult') return 'difficult';
    if (lower === 'moderate' || lower === 'medium' || lower === 'intermediate') return 'moderate';
    if (lower === 'easy' || lower === 'beginner' || lower === 'very easy') return 'easy';
    if (lower === 'challenging' || lower === 'advanced' || lower === 'strenuous') return 'challenging';
    return lower;
  };

  // Filter Logic
  const filteredTrails = allTrails.filter(trail => {
    // Safety check - ensure trail exists
    if (!trail) return false;

    // Search through name, location, and description
    const searchLower = searchQuery.toLowerCase();
    const locationStr = trail.location && typeof trail.location === 'object' 
      ? (trail.location.provinces?.join(' ') || '') + ' ' + (trail.location.districts?.join(' ') || '') + ' ' + (trail.location.start || '') + ' ' + (trail.location.end || '')
      : String(trail.location || '');
    const matchesSearch = !searchQuery ||
      (trail.name && trail.name.toLowerCase().includes(searchLower)) ||
      (locationStr && locationStr.toLowerCase().includes(searchLower)) ||
      (trail.description && trail.description.toLowerCase().includes(searchLower));

    // Province Filter - check location.provinces array from MongoDB
    let matchesProvince = selectedProvince === 'All';
    if (!matchesProvince) {
      // Primary check: location.provinces array (from MongoDB trails_metadata collection)
      if (trail.location && typeof trail.location === 'object' && Array.isArray(trail.location.provinces)) {
        matchesProvince = trail.location.provinces.some(p => 
          p && p.toLowerCase().trim() === selectedProvince.toLowerCase().trim()
        );
      }
      // Fallback: direct province field (for sample/test data)
      else if (trail.province && String(trail.province).toLowerCase().trim() === selectedProvince.toLowerCase().trim()) {
        matchesProvince = true;
      }
      // Fallback: match location string against province map
      else if (trail.location && typeof trail.location === 'string') {
        const locationParts = trail.location.split('/').map(l => l.trim());
        for (const part of locationParts) {
          if (locationProvinceMap[part] === selectedProvince) {
            matchesProvince = true;
            break;
          }
        }
      }
    }

    // Difficulty - normalize API values (hard -> difficult, etc.) to match filter
    let matchesDifficulty = selectedDifficulty === 'All';
    if (!matchesDifficulty && trail.difficulty) {
      const trailDifficultyNorm = normalizeDifficulty(trail.difficulty);
      const filterDifficultyNorm = normalizeDifficulty(selectedDifficulty);
      const rawDifficulty = String(trail.difficulty).trim().toLowerCase();
      
      matchesDifficulty = (trailDifficultyNorm === filterDifficultyNorm) || (rawDifficulty === filterDifficultyNorm);
    }

    // Duration matching - parse string format "X days" properly
    let matchesDays = selectedDays === 'All';
    if (!matchesDays && trail.duration) {
      let daysNum = null;
      
      // Option 1: duration is an object with min_days (from MongoDB)
      if (typeof trail.duration === 'object' && trail.duration.min_days != null) {
        daysNum = trail.duration.min_days;
      }
      // Option 2: duration is a string like "10 days" 
      else if (typeof trail.duration === 'string') {
        // Extract first number from "X days" or "X-Y days" format
        const match = trail.duration.match(/(\d+)/);
        if (match) {
          daysNum = parseInt(match[1], 10);
        }
      }
      
      // If we could parse days, apply day range filters
      if (daysNum !== null) {
        if (selectedDays === '1-5 days') matchesDays = daysNum >= 1 && daysNum <= 5;
        else if (selectedDays === '5-10 days') matchesDays = daysNum > 5 && daysNum <= 10;
        else if (selectedDays === '10-15 days') matchesDays = daysNum > 10 && daysNum <= 15;
        else if (selectedDays === '15-20 days') matchesDays = daysNum > 15 && daysNum <= 20;
        else if (selectedDays === '20+ days') matchesDays = daysNum > 20;
      } else {
        // If we couldn't parse days, include the trail anyway (don't exclude)
        matchesDays = true;
      }
    }

    // Budget - categorize by cost and filter
    let matchesBudget = selectedBudget === 'All';
    if (!matchesBudget) {
      let price = null;
      
      // Extract price from multiple possible sources
      if (trail.cost && typeof trail.cost === 'object') {
        // Use min_npr if available, otherwise max_npr
        price = trail.cost.min_npr || trail.cost.max_npr;
      } else if (trail.cost_min != null) {
        price = trail.cost_min;
      } else if (trail.costMin != null) {
        price = trail.costMin;
      }
      
      if (price != null) {
        // Budget categories in NPR:
        // Low: < 70k, Medium: 70k-150k, High: > 150k
        if (selectedBudget === 'Low') {
          matchesBudget = price < 70000;
        } else if (selectedBudget === 'Medium') {
          matchesBudget = price >= 70000 && price <= 150000;
        } else if (selectedBudget === 'High') {
          matchesBudget = price > 150000;
        }
      } else {
        // No cost data - include trail (be lenient)
        matchesBudget = true;
      }
    }

    const matches = matchesSearch && matchesProvince && matchesDifficulty && matchesDays && matchesBudget;
    
    // Debug: log first matching trail
    if (matches && !window.__filteredTrailLogged) {
      console.log('📍 First matching trail:', {
        name: trail.name,
        location: trail.location,
        province_direct: trail.province,
        duration: trail.duration,
        cost: trail.cost,
        difficulty: trail.difficulty
      });
      window.__filteredTrailLogged = true;
    }

    return matches;
  });

  // Sort by relevance
  const sortedFilteredTrails = [...filteredTrails].sort((a, b) => {
    if (!searchQuery) return 0;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return 0;
    
    const getScore = (trail) => {
      let score = 0;
      const name = (trail.name || '').toLowerCase();
      if (name === query) score += 100;
      else if (name.startsWith(query)) score += 50;
      else if (name.includes(query)) score += 20;

      const locationStr = trail.location && typeof trail.location === 'object' 
        ? (trail.location.provinces?.join(' ') || '') + ' ' + (trail.location.districts?.join(' ') || '') + ' ' + (trail.location.start || '') + ' ' + (trail.location.end || '')
        : String(trail.location || '');
      if (locationStr.toLowerCase().includes(query)) score += 10;

      if (trail.description && trail.description.toLowerCase().includes(query)) score += 5;

      return score;
    };

    return getScore(b) - getScore(a);
  });


  // Debug logging
  useEffect(() => {
    console.log('===== 🔍 FILTER DEBUG =====');
    console.log('Active Filters:', {
      province: selectedProvince !== 'All' ? selectedProvince : '(All)',
      difficulty: selectedDifficulty !== 'All' ? selectedDifficulty : '(All)',
      days: selectedDays !== 'All' ? selectedDays : '(All)',
      budget: selectedBudget !== 'All' ? selectedBudget : '(All)',
      search: searchQuery ? `"${searchQuery}"` : '(None)'
    });
    console.log(`Total trails: ${allTrails.length} | Filtered: ${filteredTrails.length}`);
    
    if (filteredTrails.length === 0 && allTrails.length > 0) {
      console.log('\n⚠️ NO MATCHING TRAILS - Analyzing each trail:');
      
      allTrails.slice(0, 5).forEach((trail, idx) => {
        const provinces = trail.location?.provinces || [];
        const daysNum = typeof trail.duration === 'string' 
          ? parseInt(trail.duration.match(/(\d+)/)?.[1] || 0) 
          : (trail.duration?.min_days || 0);
        const cost = trail.cost?.min_npr || trail.cost?.max_npr || trail.cost_min || null;
        const difficulty = trail.difficulty || 'N/A';
        
        console.log(`\n📍 Trail ${idx}: ${trail.name}`);
        console.log(`  Province: [${provinces.join(', ')}] vs filter: ${selectedProvince}`);
        console.log(`  Difficulty: ${difficulty} vs filter: ${selectedDifficulty}`);
        console.log(`  Duration: ${daysNum} days vs filter: ${selectedDays}`);
        console.log(`  Budget: ${cost ? `₹${cost.toLocaleString()}` : 'N/A'} vs filter: ${selectedBudget}`);
        
        // Check each filter individually
        const matchProvince = selectedProvince === 'All' || provinces.some(p => p?.toLowerCase() === selectedProvince.toLowerCase());
        const matchDifficulty = selectedDifficulty === 'All' || normalizeDifficulty(difficulty) === selectedDifficulty.toLowerCase();
        const matchDays = selectedDays === 'All' || (
          selectedDays === '1-5 days' ? daysNum >= 1 && daysNum <= 5 :
          selectedDays === '5-10 days' ? daysNum > 5 && daysNum <= 10 :
          selectedDays === '10-15 days' ? daysNum > 10 && daysNum <= 15 :
          selectedDays === '15-20 days' ? daysNum > 15 && daysNum <= 20 :
          selectedDays === '20+ days' ? daysNum > 20 : true
        );
        
        let matchBudget = selectedBudget === 'All';
        if (!matchBudget && cost != null) {
          if (selectedBudget === 'Low') matchBudget = cost < 70000;
          else if (selectedBudget === 'Medium') matchBudget = cost >= 70000 && cost <= 150000;
          else if (selectedBudget === 'High') matchBudget = cost > 150000;
        } else if (cost == null && selectedBudget !== 'All') {
          matchBudget = true; // Be lenient if no cost data
        }
        
        console.log(`  → Province: ${matchProvince ? '✅' : '❌'} | Difficulty: ${matchDifficulty ? '✅' : '❌'} | Days: ${matchDays ? '✅' : '❌'} | Budget: ${matchBudget ? '✅' : '❌'}`);
      });
      console.log('========================');
    }
  }, [selectedProvince, selectedDifficulty, selectedDays, selectedBudget, searchQuery, allTrails, filteredTrails]);

  const hasActiveFilters = selectedProvince !== 'All' || selectedDifficulty !== 'All' || selectedDays !== 'All' || selectedBudget !== 'All';

  const clearFilters = () => {
    setSelectedProvince('All');
    setSelectedDifficulty('All');
    setSelectedDays('All');
    setSelectedBudget('All');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading trails...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-semibold mb-2">Error loading trails</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-12">
      <div className="w-full px-4 sm:px-6 lg:px-8">

        {/* Header & Search */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Explore Trails</h1>

          <div className="sticky top-20 z-10 bg-white/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6 shadow-sm">
            <div className="max-w-3xl flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to go?"
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-6 py-3 border rounded-xl font-medium transition-all ${showFilters || hasActiveFilters
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary/50'
                  }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg text-gray-900">Filter Trails</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-primary hover:text-primary/80 font-medium">
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Provinces */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" /> Province
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mountain className="w-4 h-4" /> Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {difficulties.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSelectedDifficulty(opt)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedDifficulty === opt ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4" /> Days
                </label>
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  {daysOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Budget */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Wallet className="w-4 h-4" /> Budget
                </label>
                <div className="flex flex-wrap gap-2">
                  {budgetRanges.map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedBudget(b)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedBudget === b ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
                        }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-4 text-gray-500">
          Found {sortedFilteredTrails.length} {sortedFilteredTrails.length === 1 ? 'adventure' : 'adventures'}
        </div>

        {sortedFilteredTrails.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedFilteredTrails.map((trail) => (
              <TrailCard
                key={trail.id}
                trail={trail}
                onClick={() => navigate(`/trail/${trail.id}`)}
              />
            ))}
          </div>
        ) : (
          /* Sad Empty State */
          <div className="text-center py-24 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Frown className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No trails found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              We couldn't find any trails matching your current filters. Try adjusting your criteria or clearing some filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* 
   This "export { ... }" line fixes the error in App.jsx because App.jsx uses { ExploreSearchPage }.
   The "export default" line is included for future use or other files.
*/
export { ExploreSearchPage };
export default ExploreSearchPage;