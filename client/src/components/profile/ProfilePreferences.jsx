import { Award, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePreferences = ({ user, isOwnProfile }) => {
    const navigate = useNavigate();

    // Check if any preference fields exist on the user object (flattened from userProfile)
    const hasPreferences = user.interests?.length > 0 || user.experienceLevel || user.availability || user.budgetLevel;

    return (
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border h-full flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Award className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Preferences</h2>
                </div>
            </div>

            <div className="space-y-6 flex-grow z-10">
                {hasPreferences ? (
                    <>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Experience Level</p>
                            <p className="text-lg font-semibold text-foreground capitalize">{user.experienceLevel || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Availability</p>
                            <p className="text-lg font-semibold text-foreground">{user.availability || "N/A"}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Budget Level</p>
                            <p className="text-lg font-semibold text-foreground">{user.budgetLevel || "N/A"}</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Interests</p>
                            <div className="flex flex-wrap gap-2">
                                {user.interests?.map((interest) => (
                                    <span key={interest} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold border border-primary/20">
                                        {interest}
                                    </span>
                                ))}
                                {!user.interests?.length && <span className="text-muted-foreground text-sm">No interests selected</span>}
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-muted-foreground text-sm">No preferences set.</p>
                )}
            </div>

            {/* Edit Preferences Button */}
            {isOwnProfile && (
                <div className="pt-6 mt-6 border-t border-border">
                    <button
                        onClick={() => navigate('/preferences')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold bg-background text-foreground hover:bg-muted border border-border hover:shadow-sm"
                    >
                        <span>{hasPreferences ? 'Edit Preferences' : 'Set Preferences'}</span>
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
export default ProfilePreferences;
