import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Mountain } from 'lucide-react';
import ImageWithFallback from '../components/ImageWithFallBack';
import TrailCard from '../components/TrailCard';
import ProfileCard from '../components/ProfileCard';
import Footer from '../components/Footer';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const HomePage = ({ userName = "Traveler" }) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const friendScrollRef = useRef(null);
  const popularScrollRef = useRef(null);

  const [trails, setTrails] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friendStatuses, setFriendStatuses] = useState({});

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 280;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const recommendedTrails = trails.slice(0, 13);
  const popularTrails = trails.slice(5);
  
  const recommendedFriends = users.filter(user => {
    // Exclude own profile
    if (authUser && user._id === authUser._id) return false;
    
    // Exclude users who are already friends
    if (authUser && authUser.friends) {
      const isFriend = authUser.friends.some(friend => friend.userId === user._id);
      if (isFriend) return false;
    }
    
    return true;
  });

  const handleAddFriend = async (userId, userName) => {
    try {
      const response = await axios.post('/api/friends/request', {
        receiverId: userId,
        receiverName: userName
      });

      if (response.data.success) {
        // Update friend status to request_sent
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'request_sent'
        }));
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
      alert(error.response?.data?.message || "Failed to send friend request");
    }
  };

  const handleAcceptRequest = async (userId, userName) => {
    try {
      const response = await axios.post('/api/friends/accept', {
        senderId: userId,
        senderName: userName
      });

      if (response.data.success) {
        // Update friend status to friends
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'friends'
        }));
      }
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Standard Pattern: Fetch dependent data in parallel
        // We use Promise.allSettled to ensure one failure doesn't block the other content
        const [trailsResult, usersResult] = await Promise.allSettled([
          axios.get('/api/trails'),
          axios.get('/api/users')
        ]);

        // Process Trails
        if (trailsResult.status === 'fulfilled') {
          const initialTrails = (trailsResult.value.data || []).map(t => {
            // INSTANT LOAD from LocalStorage
            try {
              const cachedImages = JSON.parse(localStorage.getItem('trail_images_cache') || '{}');
              if (cachedImages[t.id]) {
                return { ...t, image: cachedImages[t.id] };
              }
            } catch (e) {/* ignore */ }
            return t;
          });
          setTrails(initialTrails);

          // Lazy Load Images in Background
          if (initialTrails.length > 0) {
            const trailIds = initialTrails.map(t => t.id);
            // Non-blocking call
            axios.post('/api/trails/batch-images', { ids: trailIds })
              .then(imgResp => {
                const imagesMap = imgResp.data;
                try {
                  const currentCache = JSON.parse(localStorage.getItem('trail_images_cache') || '{}');
                  localStorage.setItem('trail_images_cache', JSON.stringify({ ...currentCache, ...imagesMap }));
                } catch (e) {/* ignore */ }

                setTrails(prevTrails => prevTrails.map(t => {
                  const newImage = imagesMap[String(t.id)];
                  return newImage ? { ...t, image: newImage } : t;
                }));
              })
              .catch(e => console.error("Background image fetch failed", e));
          }
        } else {
          console.error('Trails fetch failed:', trailsResult.reason);
          setError("Failed to load trails. Please try again.");
        }

        // Process Users
        if (usersResult.status === 'fulfilled') {
          setUsers((usersResult.value.data || []).map(u => ({
            id: u._id || u.id,
            name: u.name || 'Trekker',
            province: u.province || 'Nepal',
            district: u.district || 'Unknown'
          })));
        } else {
          console.error('Users fetch failed:', usersResult.reason);
          // We don't block the page if users fail, just log it
        }

      } catch (err) {
        console.error('Unexpected error in fetchData:', err);
        setError(err.message);
      } finally {
        // ALWAYS turn off loading, even if errors occurred
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading trails and trekkers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-semibold mb-2">Error loading data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Make sure the backend server is running on port 5000</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-0">
      {/* Hero Section */}
      <div className="relative h-[250px] sm:h-80 lg:h-[380px] overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1542815965-ea7e5ad4269c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXBhbCUyMHByYXllciUyMGZsYWdzfGVufDF8fHx8MTc2NTAwMDg2M3ww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Nepal Mountains"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/40 to-black/70" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full text-center flex flex-col items-center space-y-2 sm:space-y-4">

            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white shadow-2xl rounded-full mb-1 animate-bounce-slow">
              <Mountain className="w-7 h-7 sm:w-8 sm:h-8 text-primary drop-shadow-lg" />
            </div>

            <h1 className="text-white text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg">
              Namaste, {userName}!
            </h1>
            <p className="text-gray-200 text-xs sm:text-base font-medium max-w-lg mx-auto drop-shadow-md">
              Find your path and your people in the Himalayas.
            </p>

            {/* Search Bar */}
            <div className="max-w-md w-full mx-auto mt-2 sm:mt-4 transform hover:scale-105 transition-transform duration-300">
              <button
                onClick={() => navigate('/explore')}
                className="w-full bg-white text-left px-4 py-2.5 sm:px-5 sm:py-3 rounded-full shadow-xl flex items-center gap-3 group"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-muted-foreground text-xs sm:text-sm md:text-base group-hover:text-foreground transition-colors">
                  Search trails, locations...
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Recommended Hikes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Recommended for You</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Curated trails based on your interests</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommendedTrails.map((trail) => (
              <div key={trail.id} className="h-full">
                <TrailCard
                  trail={trail}
                  onClick={() => navigate(`/trail/${trail.id}`)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Connect with Trekkers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Find Trekking Partners</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Don't trek alone, meet new friends</p>
            </div>

            <div className="hidden md:flex gap-2">
              <button onClick={() => scroll(friendScrollRef, 'left')} className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-all shadow-sm">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={() => scroll(friendScrollRef, 'right')} className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-all shadow-sm">
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          <div
            ref={friendScrollRef}
            className="flex overflow-x-auto gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x snap-mandatory"
          >
            {recommendedFriends.map((user) => (
              <div key={user.id} className="w-[260px] md:w-[300px] shrink-0 snap-start">
                <ProfileCard
                  user={user}
                  onClick={() => navigate(`/profile/${user.id}`)}
                  friendStatus={friendStatuses[user.id] || 'none'}
                  onAddFriend={handleAddFriend}
                  onAcceptRequest={handleAcceptRequest}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Popular Trails Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">Popular Trails</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Explore {popularTrails.length} more destinations</p>
            </div>

            <div className="hidden md:flex gap-2">
              <button onClick={() => scroll(popularScrollRef, 'left')} className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-all shadow-sm">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={() => scroll(popularScrollRef, 'right')} className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-all shadow-sm">
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          <div
            ref={popularScrollRef}
            className="flex overflow-x-auto gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x snap-mandatory"
          >
            {popularTrails.map((trail) => (
              <div key={trail.id} className="w-[280px] sm:w-[320px] shrink-0 snap-center h-full">
                <TrailCard
                  trail={trail}
                  onClick={() => navigate(`/trail/${trail.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;