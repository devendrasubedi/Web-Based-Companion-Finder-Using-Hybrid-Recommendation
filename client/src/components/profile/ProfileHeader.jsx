import { MapPin, Camera, User, Edit2, LogOut, X, Check } from 'lucide-react';

const ProfileHeader = ({
    user,
    isOwnProfile,
    isEditing,
    onEditToggle,
    onSave,
    onCancel,
    onLogout,
    editedUser,
    setEditedUser
}) => {
    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start relative z-10">

                {/* Avatar Section */}
                <div className="flex-shrink-0 relative group/avatar">
                    <div className="w-28 h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full border-4 border-card shadow-lg overflow-hidden bg-muted flex items-center justify-center">
                        {user.profileImage ? (
                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground" />
                        )}
                    </div>
                    {/* Camera Icon Overlay */}
                    {isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    )}
                </div>

                {/* User Details */}
                <div className="flex-grow w-full space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">

                        {/* Name and Basic Info */}
                        <div className="space-y-2 w-full md:w-2/3">
                            {isEditing ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1 block">Full Name</label>
                                        <input
                                            type="text"
                                            value={editedUser.name || ''}
                                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                                            className="w-full text-xl md:text-2xl font-bold bg-background border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground text-foreground"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                    {/* Location inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1 block">Province</label>
                                            <input
                                                type="text"
                                                value={editedUser.province || ''}
                                                onChange={(e) => setEditedUser({ ...editedUser, province: e.target.value })}
                                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none text-foreground"
                                                placeholder="Province"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1 block">District</label>
                                            <input
                                                type="text"
                                                value={editedUser.district || ''}
                                                onChange={(e) => setEditedUser({ ...editedUser, district: e.target.value })}
                                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none text-foreground"
                                                placeholder="District"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">{user.name}</h1>
                                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm font-medium">
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
                                            {user.age ? `${user.age} years` : 'Age N/A'} • {user.gender || 'Gender N/A'}
                                        </span>
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                            {user.district || 'District N/A'}, {user.province || 'Province N/A'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {isOwnProfile && (
                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={onCancel}
                                            className="p-2.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all"
                                            title="Cancel"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={onSave}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20"
                                        >
                                            <Check className="w-4 h-4" />
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={onEditToggle}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background border border-foreground rounded-full hover:bg-foreground/80 transition-all font-medium shadow-md"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={onLogout}
                                            className="p-2.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all"
                                            title="Logout"
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
