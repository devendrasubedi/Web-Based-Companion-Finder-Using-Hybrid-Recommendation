import { useState, useRef, useEffect } from 'react';
import { X, MapPin, Calendar, Users, AlertCircle, Mountain, ChevronDown, Sparkles } from 'lucide-react';

export default function CreateGroupModal({ onClose, preselectedTrail = '', availableTrails = [], onSubmit }) {
  const [formData, setFormData] = useState({
    trailName: typeof preselectedTrail === 'string' ? preselectedTrail : (preselectedTrail?.name || ''),
    name: '',
    description: '',
    trekDate: '',
    maxMembers: '15',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const [trailSearch, setTrailSearch] = useState('');
  const [showTrailList, setShowTrailList] = useState(false);
  const trailRef = useRef(null);

  // Close trail dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (trailRef.current && !trailRef.current.contains(e.target)) setShowTrailList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.trailName.trim()) newErrors.trailName = 'Please select a trail';
    if (!formData.name.trim()) newErrors.name = 'Group name is required';
    else if (formData.name.length < 3) newErrors.name = 'Group name must be at least 3 characters';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    else if (formData.description.length < 10) newErrors.description = 'Description must be at least 10 characters';
    if (!formData.trekDate) newErrors.trekDate = 'Trek date is required';
    else if (new Date(formData.trekDate) < new Date()) newErrors.trekDate = 'Must be a future date';
    const max = parseInt(formData.maxMembers);
    if (!formData.maxMembers || max < 2 || max > 100) newErrors.maxMembers = 'Must be between 2 and 100';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        trailName: formData.trailName,
        trekDate: formData.trekDate,
        maxMembers: parseInt(formData.maxMembers)
      });
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  const filteredTrails = availableTrails.filter(t => {
    const name = t.name || t.id;
    return !trailSearch || name.toLowerCase().includes(trailSearch.toLowerCase());
  });

  const FieldError = ({ field }) => (
    errors[field] && touched[field] ? (
      <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
        <AlertCircle size={12} /> {errors[field]}
      </p>
    ) : null
  );

  const inputClass = (field, accent = 'green') =>
    `w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
      errors[field] && touched[field]
        ? 'border-red-400 focus:ring-red-200'
        : `border-gray-200 hover:border-${accent}-300 focus:ring-${accent}-200 focus:border-${accent}-400`
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Mountain size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Trek Group</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Organize your next adventure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">
          <div className="space-y-5">

            {/* Trail Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                Trail <span className="text-red-400">*</span>
              </label>
              {preselectedTrail ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-emerald-800 flex items-center gap-2">
                  <MapPin size={14} /> {preselectedTrail}
                </div>
              ) : (
                <div className="relative" ref={trailRef}>
                  <div
                    className={`flex items-center border rounded-lg cursor-pointer transition-all ${
                      errors.trailName && touched.trailName ? 'border-red-400' : 'border-gray-200 hover:border-emerald-300'
                    } ${showTrailList ? 'ring-2 ring-emerald-200 border-emerald-400' : ''}`}
                  >
                    <input
                      type="text"
                      value={formData.trailName || trailSearch}
                      onChange={(e) => {
                        setTrailSearch(e.target.value);
                        setFormData(prev => ({ ...prev, trailName: '' }));
                        setShowTrailList(true);
                        if (errors.trailName) setErrors(prev => ({ ...prev, trailName: '' }));
                      }}
                      onFocus={() => setShowTrailList(true)}
                      onBlur={() => setTouched(prev => ({ ...prev, trailName: true }))}
                      placeholder="Search and select a trail..."
                      className="flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTrailList(!showTrailList)}
                      className="px-2 text-gray-400"
                    >
                      <ChevronDown size={16} className={`transition-transform ${showTrailList ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {showTrailList && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {filteredTrails.length > 0 ? filteredTrails.map(trail => {
                        const name = trail.name || trail.id;
                        return (
                          <button
                            type="button"
                            key={trail._id || trail.id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, trailName: name }));
                              setTrailSearch('');
                              setShowTrailList(false);
                              setErrors(prev => ({ ...prev, trailName: '' }));
                            }}
                            className={`w-full text-left px-3.5 py-2 text-sm hover:bg-emerald-50 transition ${
                              formData.trailName === name ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      }) : (
                        <p className="px-3.5 py-2.5 text-sm text-gray-400">No trails found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <FieldError field="trailName" />
            </div>

            {/* Group Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Group Name <span className="text-red-400">*</span></span>
                <span className={`text-xs ${formData.name.length > 40 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {formData.name.length}/50
                </span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={50}
                placeholder="e.g., Sunrise Trek Spring 2026"
                className={inputClass('name')}
              />
              <FieldError field="name" />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Description <span className="text-red-400">*</span></span>
                <span className={`text-xs ${formData.description.length > 450 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {formData.description.length}/500
                </span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={500}
                placeholder="Describe your trek plans, pace, experience level..."
                rows="3"
                className={`${inputClass('description')} resize-none`}
              />
              <FieldError field="description" />
            </div>

            {/* Date & Difficulty Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Trek Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-600" />
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="trekDate"
                  value={formData.trekDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputClass('trekDate')}
                />
                <FieldError field="trekDate" />
              </div>

              {/* Max Members */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-600" />
                  Max Members <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="maxMembers"
                  value={formData.maxMembers}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min="2"
                  max="100"
                  className={inputClass('maxMembers')}
                />
                <FieldError field="maxMembers" />
              </div>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 flex-shrink-0 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-gray-600 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
