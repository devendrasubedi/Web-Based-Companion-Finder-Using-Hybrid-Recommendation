import { useState } from 'react';
import { X, MapPin, Calendar, Users, AlertCircle } from 'lucide-react';

export default function CreateGroupModal({ onClose, preselectedTrail = '', availableTrails = [] }) {
  const [formData, setFormData] = useState({
    trailName: preselectedTrail,
    groupName: '',
    description: '',
    trekDate: '',
    maxMembers: '15',
    difficulty: 'Moderate',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.trailName.trim()) {
      newErrors.trailName = 'Please select a trail';
    }

    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Group name is required';
    } else if (formData.groupName.length < 3) {
      newErrors.groupName = 'Group name must be at least 3 characters';
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

    // Simulate API call
    setTimeout(() => {
      console.log('Creating group:', formData);
      // Here you would make an API call to create the group
      alert(`Group "${formData.groupName}" created successfully for ${formData.trailName}!`);
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between border-b">
          <h2 className="text-2xl font-bold text-white">Create a New Group</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trail Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              Select Trail *
            </label>
            {preselectedTrail ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 font-medium">
                {preselectedTrail}
              </div>
            ) : (
              <select
                name="trailName"
                value={formData.trailName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.trailName ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Choose a trail...</option>
                {availableTrails.map(trail => (
                  <option key={trail} value={trail}>
                    {trail}
                  </option>
                ))}
              </select>
            )}
            {errors.trailName && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.trailName}
              </p>
            )}
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              name="groupName"
              value={formData.groupName}
              onChange={handleChange}
              placeholder="e.g., ABC Spring Adventure 2024"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.groupName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.groupName && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.groupName}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Make it catchy and descriptive</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Group Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your trek plans, pace, focus areas, etc..."
              rows="4"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.description}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Trek Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Calendar size={18} className="text-green-600" />
                Trek Date *
              </label>
              <input
                type="date"
                name="trekDate"
                value={formData.trekDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.trekDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.trekDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={16} />
                  {errors.trekDate}
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Difficulty Level
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Easy">Easy</option>
                <option value="Easy to Moderate">Easy to Moderate</option>
                <option value="Moderate">Moderate</option>
                <option value="Challenging">Challenging</option>
                <option value="Difficult">Difficult</option>
                <option value="Very Difficult">Very Difficult</option>
              </select>
            </div>
          </div>

          {/* Max Members */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              Maximum Members *
            </label>
            <input
              type="number"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              min="2"
              max="100"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.maxMembers ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maxMembers && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.maxMembers}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Between 2 and 100 members</p>
          </div>

          {/* Terms */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Once created, you'll be the group leader. You can invite members, set group rules, and manage the trek.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
