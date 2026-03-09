import { useState } from 'react';
import { X, MapPin, Calendar, Users, AlertCircle, Zap, FileText, CheckCircle, Info } from 'lucide-react';

export default function CreateGroupModal({ onClose, preselectedTrail = '', availableTrails = [], onSubmit }) {
  const [formData, setFormData] = useState({
    trailName: typeof preselectedTrail === 'string' ? preselectedTrail : (preselectedTrail?.name || ''),
    name: '',
    description: '',
    trekDate: '',
    maxMembers: '15',
    difficulty: 'Moderate',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.trailName.trim()) {
      newErrors.trailName = 'Please select a trail';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Group description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.trekDate) {
      newErrors.trekDate = 'Trek date is required';
    } else {
      const selectedDate = new Date(formData.trekDate);
      const today = new Date();
      if (selectedDate < today) {
        newErrors.trekDate = 'Trek date must be in the future';
      }
    }

    const maxMembers = parseInt(formData.maxMembers);
    if (!formData.maxMembers || maxMembers < 2 || maxMembers > 100) {
      newErrors.maxMembers = 'Max members must be between 2 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        trailName: formData.trailName,
        trekDate: formData.trekDate,
        difficulty: formData.difficulty,
        maxMembers: parseInt(formData.maxMembers)
      });
      
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-8 py-8 flex items-center justify-between border-b-4 border-green-700 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-xl">
              <Zap size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Create a Group</h2>
              <p className="text-green-100 text-sm mt-1">Find trekking partners & organize your adventure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-xl transition duration-200 hover:scale-110"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-0">
          {/* Progress Indicator */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Step Progress</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center">
                <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                <p className="text-xs text-gray-600 ml-2 whitespace-nowrap">2/5 Complete</p>
              </div>
            </div>
          </div>

          {/* Section 1: Trail Selection */}
          <div className="space-y-6 mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Choose Your Trail</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" />
                    Select Trail <span className="text-red-500">*</span>
                  </label>
                  {preselectedTrail ? (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-4 text-blue-900 font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={18} className="text-blue-600" />
                        {preselectedTrail}
                      </div>
                    </div>
                  ) : (
                    <select
                      name="trailName"
                      value={formData.trailName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition bg-white font-medium ${
                        errors.trailName && touched.trailName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-blue-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Choose a trail...</option>
                      {availableTrails.map(trail => {
                        const trailName = trail.name || trail.id;
                        return (
                          <option key={trail._id || trail.id} value={trailName}>
                            {trailName}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {errors.trailName && touched.trailName && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{errors.trailName}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Group Details */}
          <div className="space-y-6 mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Group Information</h3>
                
                {/* Group Name */}
                <div className="space-y-2 mb-6">
                  <label className="block text-sm font-semibold text-gray-800">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., ABC Spring Adventure 2024"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition bg-white font-medium ${
                      errors.name && touched.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-purple-300 focus:ring-purple-500'
                    }`}
                  />
                  {errors.name && touched.name && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{errors.name}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">Make it catchy • Min 3 characters</p>
                    <p className={`text-xs font-medium ${formData.name.length > 40 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {formData.name.length}/50
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FileText size={18} className="text-purple-600" />
                    Group Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Describe your trek plans, pace, focus areas, experience level, etc..."
                    rows="4"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition resize-none bg-white font-medium ${
                      errors.description && touched.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-purple-300 focus:ring-purple-500'
                    }`}
                  />
                  {errors.description && touched.description && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{errors.description}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">Min 10 characters • Be descriptive</p>
                    <p className={`text-xs font-medium ${formData.description.length > 450 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {formData.description.length}/500
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Trek Details */}
          <div className="space-y-6 mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Trek Schedule & Difficulty</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trek Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Calendar size={18} className="text-green-600" />
                      Trek Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="trekDate"
                      value={formData.trekDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition bg-white font-medium ${
                        errors.trekDate && touched.trekDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-green-300 focus:ring-green-500'
                      }`}
                    />
                    {errors.trekDate && touched.trekDate && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{errors.trekDate}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Must be in the future</p>
                  </div>

                  {/* Difficulty Level */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Difficulty Level
                    </label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 hover:border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white font-medium"
                    >
                      <option value="Easy">✓ Easy</option>
                      <option value="Easy to Moderate">↑ Easy to Moderate</option>
                      <option value="Moderate">↑↑ Moderate</option>
                      <option value="Challenging">↑↑↑ Challenging</option>
                      <option value="Difficult">↑↑↑↑ Difficult</option>
                      <option value="Very Difficult">↑↑↑↑↑ Very Difficult</option>
                    </select>
                    <p className="text-xs text-gray-500">Helps match with appropriate group members</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Group Size */}
          <div className="space-y-6 mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">4</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Group Size</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Users size={18} className="text-orange-600" />
                    Maximum Members <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      name="maxMembers"
                      value={formData.maxMembers}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min="2"
                      max="100"
                      className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition bg-white font-medium ${
                        errors.maxMembers && touched.maxMembers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-orange-300 focus:ring-orange-500'
                      }`}
                    />
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl px-4 py-3 font-bold text-orange-700 whitespace-nowrap">
                      {parseInt(formData.maxMembers) || 0}
                    </div>
                  </div>
                  {errors.maxMembers && touched.maxMembers && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{errors.maxMembers}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Between 2 and 100 members recommended</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Box */}
          <div className="mb-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 rounded-xl p-5">
            <div className="flex gap-3">
              <Info className="text-green-700 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-green-900 mb-1">👑 Group Leader Perks</p>
                <p className="text-xs text-green-800 leading-relaxed">
                  As the group leader, you'll manage members, set group rules, share updates, and coordinate all trek logistics for an amazing adventure!
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl font-bold text-gray-700 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Create Group
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            ✓ By creating a group, you agree to our community guidelines
          </p>
        </form>
      </div>
    </div>
  );
}
