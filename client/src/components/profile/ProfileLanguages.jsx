import { Languages } from 'lucide-react';

const ProfileLanguages = ({
    user,
    isEditing,
    editedUser,
    setEditedUser
}) => {
    const handleLanguageChange = (e) => {
        const val = e.target.value;
        const langs = val.split(',').map(l => l.trim());
        setEditedUser({ ...editedUser, languagesKnown: langs });
    };

    return (
        <div className="flex items-start gap-3">
            <div className="mt-1 p-1.5 rounded-lg bg-primary/10 text-primary">
                <Languages className="w-4 h-4" />
            </div>
            <div className="flex-grow">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Languages</h3>
                {isEditing ? (
                    <input
                        type="text"
                        value={Array.isArray(editedUser.languagesKnown) ? editedUser.languagesKnown.join(', ') : (editedUser.languagesKnown || '')}
                        onChange={handleLanguageChange}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none text-foreground"
                        placeholder="English, Nepali, Hindi...(comma separated)"
                    />
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {(user.languagesKnown && user.languagesKnown.length > 0) ? (
                            user.languagesKnown.map((lang, i) => (
                                <span key={i} className="px-3 py-1 rounded-md bg-muted/50 border border-border text-sm text-foreground/80 font-medium">
                                    {lang}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground italic text-sm">Not specified</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileLanguages;
