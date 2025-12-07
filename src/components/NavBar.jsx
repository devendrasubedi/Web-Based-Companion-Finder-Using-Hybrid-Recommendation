import React, { useState } from 'react';
import { Menu, X, Mountain, User, MessageCircle } from 'lucide-react';
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
            <Link to="/" className={`${isActive('/')} transition-colors text-sm font-medium`}>Home</Link>
            <Link to="/explore" className={`${isActive('/explore')} transition-colors text-sm font-medium`}>Explore</Link>
            <Link to="/groups" className={`${isActive('/groups')} transition-colors text-sm font-medium`}>Groups</Link>
            <Link to="/messages" className={`${isActive('/messages')} transition-colors text-sm font-medium flex items-center gap-1`}>
              Messages
            </Link>
            
            {/* Profile Icon */}
            <div className="border-l border-gray-200 pl-6 ml-2">
              <button className="p-2 rounded-full bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700 transition-all">
                <User className="w-5 h-5" />
              </button>
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
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link to="/" className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50">Home</Link>
            <Link to="/explore" className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50">Explore</Link>
            <Link to="/groups" className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50">Groups</Link>
            <Link to="/messages" className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </Link>
            <div className="border-t border-gray-100 my-2 pt-2">
              <Link to="/profile" className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50">
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