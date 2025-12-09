import React, { useState } from 'react';
import { Menu, X, Mountain, User, MessageCircle, Home, Compass, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Helper to check active state
  const isActive = (path) => location.pathname === path ? "text-green-700 font-semibold" : "text-gray-600 hover:text-green-600";

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <Mountain className="h-8 w-8 text-green-700" />
            <span className="font-bold text-xl tracking-tight text-gray-900">TrekMate</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/home" className={`${isActive('/home')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link to="/explore" className={`${isActive('/explore')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
              <Compass className="w-4 h-4" />
              Explore
            </Link>
            <Link to="/groups" className={`${isActive('/groups')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
              <Users className="w-4 h-4" />
              Groups
            </Link>
            <Link to="/messages" className={`${isActive('/messages')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
              <MessageCircle className="w-4 h-4" />
              Messages
            </Link>
            
            {/* Profile Icon */}
            <div className="border-l border-gray-200 pl-6 ml-2">
              <Link to="/profile">
                <button className={`p-2 rounded-full transition-all ${location.pathname.startsWith('/profile') ? 'bg-green-50 text-green-700' : 'bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700'}`}>
                  <User className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-green-700 hover:bg-gray-50 focus:outline-none transition-colors gap-2"
            >
              <span className="text-sm font-medium">Menu</span>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 z-50">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link 
              to="/home" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
            >
              <Home className="w-5 h-5" />
              Home
            </Link>
            <Link 
              to="/explore" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
            >
              <Compass className="w-5 h-5" />
              Explore
            </Link>
            <Link 
              to="/groups" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
            >
              <Users className="w-5 h-5" />
              Groups
            </Link>
            <Link 
              to="/messages" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
            >
              <MessageCircle className="w-5 h-5" />
              Messages
            </Link>
            <div className="border-t border-gray-100 my-2 pt-2">
              <Link 
                to="/profile" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
              >
                <User className="w-5 h-5" />
                My Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;