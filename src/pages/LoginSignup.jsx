import { useState } from 'react';
import { Mountain, Mail, Lock } from 'lucide-react';

const provinces = [
  'Province 1',
  'Madhesh Province',
  'Bagmati Province',
  'Gandaki Province',
  'Lumbini Province',
  'Karnali Province',
  'Sudurpashchim Province'
];

const districtsByProvince = {
  'Province 1': ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Morang', 'Sunsari'],
  'Madhesh Province': ['Dhanusha', 'Mahottari', 'Saptari', 'Siraha', 'Sarlahi'],
  'Bagmati Province': ['Bhaktapur', 'Chitwan', 'Dhading', 'Kathmandu', 'Lalitpur', 'Nuwakot', 'Rasuwa'],
  'Gandaki Province': ['Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Parbat', 'Syangja', 'Tanahun'],
  'Lumbini Province': ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Gulmi', 'Kapilvastu', 'Palpa', 'Rupandehi'],
  'Karnali Province': ['Dailekh', 'Dolpa', 'Humla', 'Jumla', 'Kalikot', 'Mugu', 'Surkhet'],
  'Sudurpashchim Province': ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur']
};

const languages = [
  'Nepali', 'English', 'Hindi', 'Newari',
  'Maithili', 'Bhojpuri', 'Tamang', 'Gurung'
];

const LoginSignup = ({ onLogin, onSignup }) => {
  const [isSignup, setIsSignup] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup state
  const [signupData, setSignupData] = useState({
    name: '',
    age: 18,
    gender: 'Male',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    languages: ['Nepali'],
    phone: '',
    email: '',
    password: ''
  });

  const [selectedLanguages, setSelectedLanguages] = useState(['Nepali']);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email);
    }
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    onSignup({ ...signupData, languages: selectedLanguages });
  };

  const toggleLanguage = (lang) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const availableDistricts = districtsByProvince[signupData.province] || [];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-linear-to-br from-[#556B2F] via-[#C2B280] to-[#87CEEB]">

      {/* Decorative blurred circles */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/40 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px]" />
      </div>

      <div className={`relative w-full transition-all duration-300 ${isSignup ? 'max-w-3xl' : 'max-w-md'}`}>
        
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white shadow-2xl rounded-full mb-4">
            <Mountain className="w-10 h-10 text-green-800 drop-shadow-lg" />
          </div>
          <h1 className="text-white text-3xl drop-shadow-lg font-semibold">TrekMate</h1>
          <p className="text-white/90 drop-shadow-md">Find your perfect hiking companion</p>
        </div>

        {/* Glass card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/30">

          {/* LOGIN */}
          {!isSignup && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-gray-800">Welcome Back</h2>
                <p className="text-gray-500">Login to continue your adventure</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                
                <div>
                  <label className="block mb-2 text-gray-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#3E5E2A] text-white py-3 px-4 rounded-xl shadow-xl hover:bg-[#344D23] transition-all"
                >
                  Login
                </button>

                <div className="text-center pt-4 border-t border-gray-300">
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignup(true)}
                      className="text-green-800 font-medium hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>

              </form>
            </>
          )}

          {/* SIGNUP */}
          {isSignup && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Create Account</h2>
                <p className="text-gray-500">Join and find your trekking buddies</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                
                {/* Grid fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block mb-2 text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">Age</label>
                    <input
                      type="number"
                      value={signupData.age}
                      onChange={(e) => setSignupData({ ...signupData, age: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                      min="15"
                      max="100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">Gender</label>
                    <select
                      value={signupData.gender}
                      onChange={(e) => setSignupData({ ...signupData, gender: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">Province</label>
                    <select
                      value={signupData.province}
                      onChange={(e) => {
                        const newProvince = e.target.value;
                        const districts = districtsByProvince[newProvince];
                        setSignupData({
                          ...signupData,
                          province: newProvince,
                          district: districts[0]
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      {provinces.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">District</label>
                    <select
                      value={signupData.district}
                      onChange={(e) => setSignupData({ ...signupData, district: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                      placeholder="+977-98XXXXXXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">Email</label>
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700">Password</label>
                    <input
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="block mb-2 text-gray-700">Languages Known</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-2 rounded-lg border transition-all ${
                          selectedLanguages.includes(lang)
                            ? 'border-green-600 bg-green-100 text-green-700'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#3E5E2A] text-white py-3 px-4 rounded-xl shadow-xl hover:bg-[#344D23] transition-all"
                >
                  Sign Up
                </button>

                <div className="text-center pt-4 border-t border-gray-300">
                  <p className="text-gray-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignup(false)}
                      className="text-green-800 font-medium hover:underline"
                    >
                      Login
                    </button>
                  </p>
                </div>

              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
