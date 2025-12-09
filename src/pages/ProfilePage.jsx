import { useState } from 'react';
import { mockUsers } from '../data/mockData';
import { MapPin, Languages, Edit2, Mountain, Bookmark, Award } from 'lucide-react';

function ProfilePage({ userId, currentUserEmail }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Find the user or fallback to the first mock user
  const user = userId ? mockUsers.find(u => u.id === userId) : mockUsers[0];
  const isOwnProfile = !userId || user?.email === currentUserEmail;

  const [editedUser, setEditedUser] = useState(user || mockUsers[0]);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-foreground mb-2">User not found</h2>
          <p className="text-muted-foreground">The user you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // In a real app, this would save to backend
    setIsEditing(false);
  };

  return (
    // Main container with a subtle background color from theme
    <div className="min-h-screen pt-8 pb-12 bg-muted/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 1. Profile Header Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-5xl font-normal shadow-md">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            {/* User Details */}
            <div className="flex-grow w-full">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="space-y-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.name}
                        onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                        className="text-2xl font-semibold px-2 py-1 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    ) : (
                      <h1 className="text-2xl font-semibold text-foreground">{user.name}</h1>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
                      <span>{user.age} years • {user.gender}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {user.district}, {user.province}
                      </span>
                      <span className="flex items-center gap-1">
                        <Languages className="w-4 h-4" />
                        {user.languages.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className="pt-2 max-w-2xl">
                    {isEditing ? (
                      <textarea
                        value={editedUser.bio}
                        onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="text-muted-foreground text-base leading-relaxed">{user.bio}</p>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                {isOwnProfile && (
                  <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    {isEditing ? 'Save' : 'Edit Profile'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Preferences Card */}
        {user.preferences && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Trekking Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 mb-8">
              <div>
                <p className="text-muted-foreground text-sm mb-1.5 uppercase tracking-wide font-medium">Experience Level</p>
                <p className="text-foreground text-lg font-medium">{user.preferences.experienceLevel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1.5 uppercase tracking-wide font-medium">Availability</p>
                <p className="text-foreground text-lg font-medium">{user.preferences.availability}</p>
              </div>
            </div>

            {user.preferences.interests.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-3 uppercase tracking-wide font-medium">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {user.preferences.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Hiking Activity Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Hiking Activity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Completed Treks */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mountain className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-foreground">Completed Treks</h3>
              </div>
              {user.pastHikes && user.pastHikes.length > 0 ? (
                <ul className="space-y-3">
                  {user.pastHikes.map((hike, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-primary mt-1.5">•</span>
                      <span className="text-muted-foreground">{hike}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm italic">No completed treks yet</p>
              )}
            </div>
            
            {/* Saved Trails */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bookmark className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-foreground">Saved Trails</h3>
              </div>
              {user.savedHikes && user.savedHikes.length > 0 ? (
                <ul className="space-y-3">
                  {user.savedHikes.map((hike, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-primary mt-1.5">•</span>
                      <span className="text-muted-foreground">{hike}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm italic">No saved trails</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProfilePage;