import { useState } from 'react';
import { Mountain, Star, Heart, Home, Sparkles, Loader, CheckCircle2, Languages, Plus, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const interestCategories = {
  adventure: {
    name: 'Adventure',
    icon: Mountain,
    description: "High-altitude, Challenging, Remote, Camping, Offbeat"
  },
  cultural: {
    name: 'Cultural',
    icon: Star,
    description: "Heritage, Pilgrimage, Cultural, Traditional Villages, Monasteries"
  },
  nature: {
    name: 'Nature',
    icon: Heart,
    description: "Scenic, Wildlife, Photography, Lakes, Waterfalls, Forests"
  },
  comfort: {
    name: 'Comfort',
    icon: Home,
    description: "Tea-house, Easy, Family-friendly, Short-trek"
  },
  spiritual: {
    name: 'Spiritual',
    icon: Sparkles,
    description: "Pilgrimage, Meditation, Religious, Peace"
  }
};

const PreferencesPage = () => {
  const { user, savePreferences, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [preferences, setPreferences] = useState({
    interests: [],
    experienceLevel: 'Beginner',
    availability: 'Weekends',
    budget: 'Medium',
    languagesKnown: []
  });

  const [customLanguage, setCustomLanguage] = useState('');

  const commonLanguages = ['Nepali', 'English', 'Hindi', 'Newari', 'Maithili', 'Tamang', 'Gurung', 'Sherpa'];

  const toggleInterest = (interest) => {
    if (preferences.interests.includes(interest)) {
      setPreferences({
        ...preferences,
        interests: preferences.interests.filter(i => i !== interest)
      });
    } else {
      setPreferences({
        ...preferences,
        interests: [...preferences.interests, interest]
      });
    }
  };

  const toggleLanguage = (lang) => {
    if (preferences.languagesKnown.includes(lang)) {
      setPreferences({
        ...preferences,
        languagesKnown: preferences.languagesKnown.filter(l => l !== lang)
      });
    } else {
      setPreferences({
        ...preferences,
        languagesKnown: [...preferences.languagesKnown, lang]
      });
    }
  };

  const addCustomLanguage = () => {
    if (customLanguage.trim() && !preferences.languagesKnown.includes(customLanguage.trim())) {
      setPreferences({
        ...preferences,
        languagesKnown: [...preferences.languagesKnown, customLanguage.trim()]
      });
      setCustomLanguage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await savePreferences({
        interests: preferences.interests,
        experienceLevel: preferences.experienceLevel,
        availability: preferences.availability,
        budget: preferences.budget,
        languagesKnown: preferences.languagesKnown
      });
      navigate('/');
    } catch (error) {
      console.error("Failed to save preferences", error);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-linear-to-br from-primary via-secondary to-accent relative overflow-hidden flex items-center justify-center">
      {/* Decorative Elements matching Auth Pages */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">Welcome, {user?.name}!</h1>
          <p className="text-emerald-100 drop-shadow-sm">Customize your trekking experience</p>
        </div>

        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Interest Categories Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
            <h2 className="text-gray-800 text-xl font-bold mb-6 text-center">What brings you to the mountains?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(interestCategories).map(([key, category]) => {
                const Icon = category.icon;
                const isSelected = preferences.interests.includes(key);
                return (
                  <motion.button
                    key={key}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleInterest(key)}
                    className={`relative flex flex-col items-start text-left p-5 rounded-xl border-2 transition-all duration-200 h-full ${isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                      : 'border-transparent bg-gray-50 hover:bg-emerald-50/30 hover:border-emerald-200'
                      }`}
                  >
                    <div className={`p-3 rounded-lg mb-3 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 shadow-sm'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-emerald-900' : 'text-gray-800'}`}>{category.name}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {category.description}
                    </p>
                    {isSelected && (
                      <div className="absolute top-3 right-3 text-emerald-500">
                        <CheckCircle2 className="w-6 h-6 fill-emerald-500 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Additional Details Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
            <h2 className="text-gray-800 text-xl font-bold mb-6">A few more details...</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Experience Level */}
              <div>
                <label htmlFor="experienceLevel" className="block text-gray-700 font-semibold mb-2 text-sm">
                  Experience Level
                </label>
                <div className="relative">
                  <select
                    id="experienceLevel"
                    value={preferences.experienceLevel}
                    onChange={(e) => setPreferences({ ...preferences, experienceLevel: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-700 appearance-none transition-all hover:bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              {/* Availability */}
              <div>
                <label htmlFor="availability" className="block text-gray-700 font-semibold mb-2 text-sm">
                  Availability
                </label>
                <div className="relative">
                  <select
                    id="availability"
                    value={preferences.availability}
                    onChange={(e) => setPreferences({ ...preferences, availability: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-700 appearance-none transition-all hover:bg-white"
                  >
                    <option value="Weekends">Weekends Only</option>
                    <option value="Weekdays">Weekdays</option>
                    <option value="Flexible">Flexible</option>
                    <option value="Long Breaks">Long Breaks/Holidays</option>
                  </select>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label htmlFor="budget" className="block text-gray-700 font-semibold mb-2 text-sm">
                  Budget Range
                </label>
                <div className="relative">
                  <select
                    id="budget"
                    value={preferences.budget}
                    onChange={(e) => setPreferences({ ...preferences, budget: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-700 appearance-none transition-all hover:bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Languages Known */}
            <div className="mt-8">
              <label className="block text-gray-700 font-semibold mb-3 text-sm flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Languages Known
              </label>

              <div className="flex flex-wrap gap-2 mb-4">
                {commonLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${preferences.languagesKnown.includes(lang)
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {lang}
                  </button>
                ))}

                {/* Display valid custom languages that are NOT in commonLanguages */}
                {preferences.languagesKnown
                  .filter(lang => !commonLanguages.includes(lang))
                  .map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-emerald-500 text-white shadow-md flex items-center gap-1"
                    >
                      {lang}
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="Add other language..."
                  className="flex-grow px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-700"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomLanguage())}
                />
                <button
                  type="button"
                  onClick={addCustomLanguage}
                  className="px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-4 px-6 rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl font-bold text-lg disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader className="animate-spin" /> : "Complete Profile"}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

export default PreferencesPage;