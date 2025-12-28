const ProfileBio = ({
    user,
    isEditing,
    editedUser,
    setEditedUser
}) => {
    return (
        <div className="relative">
            {isEditing ? (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1 block">Bio</label>
                    <textarea
                        value={editedUser.bio || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                        className="w-full h-32 bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none placeholder:text-muted-foreground leading-relaxed"
                        placeholder="Tell the community about yourself..."
                    />
                </div>
            ) : (
                <p className="text-foreground/90 leading-relaxed text-base md:text-lg max-w-3xl font-medium">
                    {user.bio || "No bio added yet."}
                </p>
            )}
        </div>
    );
};

export default ProfileBio;
