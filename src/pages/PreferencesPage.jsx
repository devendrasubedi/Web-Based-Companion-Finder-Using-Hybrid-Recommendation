import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mountain,
  Landmark,
  Leaf,
  Coffee,
  SunMoon
} from "lucide-react";

const categories = [
  {
    name: "Adventure",
    icon: <Mountain className="w-6 h-6 text-primary" />,
    color: "bg-primary/10", 
    subtags: ["high-altitude", "challenging", "remote", "camping", "offbeat"]
  },
  {
    name: "Cultural",
    icon: <Landmark className="w-6 h-6 text-secondary" />,
    color: "bg-secondary/10",
    subtags: ["heritage", "pilgrimage", "cultural", "traditional-villages", "monasteries"]
  },
  {
    name: "Nature",
    icon: <Leaf className="w-6 h-6 text-muted-foreground" />,
    color: "bg-muted/30",
    subtags: ["scenic", "wildlife", "photography", "lakes", "waterfalls", "forests"]
  },
  {
    name: "Comfort",
    icon: <Coffee className="w-6 h-6 text-accent" />,
    color: "bg-accent/10",
    subtags: ["tea-house", "easy", "family-friendly", "short-trek"]
  },
  {
    name: "Spiritual",
    icon: <SunMoon className="w-6 h-6 text-[#A67B5B]" />, 
    color: "bg-[#A67B5B]/10",
    subtags: ["pilgrimage", "meditation", "religious", "peace"]
  }
];

const PreferencesPage = () => {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);

  const toggleCategory = (name) => {
    if (selectedCategories.includes(name)) {
      setSelectedCategories(selectedCategories.filter(c => c !== name));
    } else {
      setSelectedCategories([...selectedCategories, name]);
    }
  };

  const handleSubmit = () => {
    // Navigate to homepage
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">Select Your Interests</h1>
        <p className="text-center text-muted-foreground mb-8">Choose what defines your ideal trekking experience.</p>

        {/* Categories */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.name);
            return (
              <div
                key={cat.name}
                className={`border rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-sm
                ${isSelected
                  // Active state: Much darker green background (25% opacity)
                  ? "bg-primary/25 border-primary ring-1 ring-primary"
                  // Inactive state
                  : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                }`}
                onClick={() => toggleCategory(cat.name)}
              >
                <div className="flex items-center gap-3 mb-4">
                  {/* Icon container */}
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/40' : cat.color}`}>
                    {cat.icon}
                  </div>
                  <h2 className={`text-xl font-bold ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                    {cat.name}
                  </h2>
                </div>

                {/* Subtags - Static, visual only */}
                <div className="flex flex-wrap gap-2">
                  {cat.subtags.map((sub) => (
                    <span
                      key={sub}
                      className={`px-3 py-1 rounded-full text-xs font-medium border
                        ${isSelected
                          // When box is selected: White semi-transparent tags
                          ? "bg-white/50 text-foreground border-white/20"
                          // When box is NOT selected: Standard muted tags
                          : "bg-muted text-muted-foreground border-transparent"
                        }`}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          className="mt-8 w-full bg-primary text-primary-foreground py-4 rounded-xl text-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
export default PreferencesPage;