import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Mountain } from 'lucide-react';
import ImageWithFallback from '../components/ImageWithFallBack';
import TrailCard from '../components/TrailCard';
import ProfileCard from '../components/ProfileCard';
import { mockTrails, mockUsers } from '../data/mockData';
import Footer from '../components/Footer';

const HomePage = ({ userName = "Traveler" }) => {
  const navigate = useNavigate();
  const friendScrollRef = useRef(null);
  const popularScrollRef = useRef(null);

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 280;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const recommendedTrails = mockTrails.slice(0, 13);
  const popularTrails = mockTrails.slice(5);
  const recommendedFriends = mockUsers;

  return (
    <div className="pt-0">
      {/* Hero Section */}
      <div className="relative h-[250px] sm:h-[320px] lg:h-[380px] overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1542815965-ea7e5ad4269c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXBhbCUyMHByYXllciUyMGZsYWdzfGVufDF8fHx8MTc2NTAwMDg2M3ww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Nepal Mountains"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
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