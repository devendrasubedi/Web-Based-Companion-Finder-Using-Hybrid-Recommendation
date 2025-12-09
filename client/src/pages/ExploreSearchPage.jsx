import { useState } from 'react';
import TrailCard from '../components/TrailCard'; 
import { mockTrails } from '../data/mockData';
import { Search, X, SlidersHorizontal, MapPin, Calendar, Wallet, Mountain, Frown } from 'lucide-react';

const ExploreSearchPage = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedDays, setSelectedDays] = useState('All');
  const [selectedBudget, setSelectedBudget] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

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

  // Filter Logic
  const filteredTrails = mockTrails.filter(trail => {
    // Search
    const matchesSearch = !searchQuery || 
      trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trail.region && trail.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (trail.description && trail.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Province
    const matchesProvince = selectedProvince === 'All' || 
      (trail.province === selectedProvince) || 
      (trail.region && trail.region.includes(selectedProvince));

    // Difficulty
    const matchesDifficulty = selectedDifficulty === 'All' || trail.difficulty === selectedDifficulty;

    // Days
    const matchesDays = selectedDays === 'All' || 
       (trail.duration && trail.duration === selectedDays) ||
       (trail.duration && trail.duration.includes(selectedDays.split(' ')[0])); 

    // Budget Logic
    let matchesBudget = true;
    if (selectedBudget !== 'All') {
      const priceString = String(trail.price || trail.cost || '0').replace(/[^0-9.]/g, '');
      const price = parseFloat(priceString);

      if (selectedBudget === 'Low') matchesBudget = price < 500;       
      else if (selectedBudget === 'Medium') matchesBudget = price >= 500 && price <= 1500; 
      else if (selectedBudget === 'High') matchesBudget = price > 1500; 
    }

    return matchesSearch && matchesProvince && matchesDifficulty && matchesDays && matchesBudget;
  });

  const hasActiveFilters = selectedProvince !== 'All' || selectedDifficulty !== 'All' || selectedDays !== 'All' || selectedBudget !== 'All';

  const clearFilters = () => {
    setSelectedProvince('All');
    setSelectedDifficulty('All');
    setSelectedDays('All');
    setSelectedBudget('All');
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
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
                className={`flex items-center gap-2 px-6 py-3 border rounded-xl font-medium transition-all ${
                  showFilters || hasActiveFilters
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
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        selectedDifficulty === opt ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
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
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        selectedBudget === b ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
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
          Found {filteredTrails.length} {filteredTrails.length === 1 ? 'adventure' : 'adventures'}
        </div>

        {filteredTrails.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTrails.map((trail) => (
              <TrailCard
                key={trail.id}
                trail={trail}
                onClick={() => onNavigate('trail-detail', trail.id)}
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