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
    icon: <Mountain className="w-6 h-6 text-blue-600" />,
    color: "bg-blue-100",
    subtags: ["high-altitude", "challenging", "remote", "camping", "offbeat"]
  },
  {
    name: "Cultural",
    icon: <Landmark className="w-6 h-6 text-yellow-700" />,
    color: "bg-yellow-100",
    subtags: ["heritage", "pilgrimage", "cultural", "traditional-villages", "monasteries"]
  },
  {
    name: "Nature",
    icon: <Leaf className="w-6 h-6 text-green-600" />,
    color: "bg-green-100",
    subtags: ["scenic", "wildlife", "photography", "lakes", "waterfalls", "forests"]
  },
  {
    name: "Comfort",
    icon: <Coffee className="w-6 h-6 text-purple-600" />,
    color: "bg-purple-100",
    subtags: ["tea-house", "easy", "family-friendly", "short-trek"]
  },
  {
    name: "Spiritual",
    icon: <SunMoon className="w-6 h-6 text-orange-600" />,
    color: "bg-orange-100",
    subtags: ["pilgrimage", "meditation", "religious", "peace"]
  }
];

const Preferences = () => {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubtags, setSelectedSubtags] = useState([]);

  const toggleCategory = (name) => {
    if (selectedCategories.includes(name)) {
      setSelectedCategories(selectedCategories.filter(c => c !== name));
    } else {
      setSelectedCategories([...selectedCategories, name]);
    }
  };

  const toggleSubtag = (subtag) => {
    if (selectedSubtags.includes(subtag)) {
      setSelectedSubtags(selectedSubtags.filter(s => s !== subtag));
    } else {
      setSelectedSubtags([...selectedSubtags, subtag]);
    }
  };

  const handleSubmit = () => {
    const finalInterests = {
      categories: selectedCategories,
      subtags: selectedSubtags
    };

    // TODO: Save finalInterests to database or state management
    console.log("Saving preferences:", finalInterests);
    
    // Navigate to homepage
    navigate("/home");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Select Your Interests</h1>

      {/* Categories */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className={`border rounded-xl p-4 cursor-pointer transition 
            ${selectedCategories.includes(cat.name)
              ? "bg-blue-600 text-black border-blue-700"
              : "bg-white border-gray-300"
            }`}
            onClick={() => toggleCategory(cat.name)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`${cat.color} p-2 rounded-lg`}>
                {cat.icon}
              </div>
              <h2 className="text-xl font-semibold">{cat.name}</h2>
            </div>

            {/* Subtags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {cat.subtags.map((sub) => (
                <span
                  key={sub}
                  onClick={(e) => {
                    e.stopPropagation(); // avoid parent click
                    toggleSubtag(sub);
                  }}
                  className={`px-3 py-1 rounded-full text-sm border cursor-pointer 
                    transition 
                    ${selectedSubtags.includes(sub)
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-gray-100 border-gray-300"
                    }`}
                >
                  {sub}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
      >
        Save & Continue
      </button>
    </div>
  );
}
export default Preferences;