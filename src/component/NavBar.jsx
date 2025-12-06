import React, { useState } from "react";
import logo from "../assets/Logo.svg";
import searchIcon from "../assets/search.svg";

const NavBar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50 font-sans">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Trekmate Logo" className="h-10 w-10 sm:h-8 sm:w-8" />
          <span className="text-2xl font-extrabold tracking-tight text-green-600 hidden sm:block">
            Trekmate
          </span>
        </div>

        {/* Mobile Search Bar (left/center, with search icon) */}
        <div className="flex-1 mx-3 max-w-[240px] md:hidden">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-11 pr-3 py-3 rounded-full bg-gray-100 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ fontSize: "1.17em" }} // Slightly bigger for mobile, override if needed
            />
            <img src={searchIcon} alt="Search" className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        {/* Desktop Menu */}
        <ul className="hidden md:flex items-center space-x-8 text-gray-700 font-semibold text-lg">
          <li className="hover:text-green-600 cursor-pointer transition-colors">Home</li>
          <li className="hover:text-green-600 cursor-pointer transition-colors">Friends</li>
          <li className="hover:text-green-600 cursor-pointer transition-colors">Groups</li>
          <li className="hover:text-green-600 cursor-pointer transition-colors">Messages</li>
          <li className="hover:text-green-600 cursor-pointer transition-colors">Profile</li>
          {/* Desktop Search Input */}
          <li className="ml-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="border border-gray-300 rounded-full pl-11 pr-4 py-2 text-base focus:outline-none focus:border-green-600"
              />
              <img src={searchIcon} alt="Search" className="absolute left-3 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </li>
        </ul>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden focus:outline-none ml-2 shrink-0"
          onClick={() => setOpen(!open)}
        >
          <svg
            className="h-8 w-8 text-gray-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {open && (
        <div className="md:hidden bg-white shadow-lg px-5 pb-5 space-y-4 text-gray-700 border-t border-gray-100 text-lg font-semibold">
          <p className="hover:text-green-600 cursor-pointer pt-4">House</p>
          <p className="hover:text-green-600 cursor-pointer">Friends</p>
          <p className="hover:text-green-600 cursor-pointer">Groups</p>
          <p className="hover:text-green-600 cursor-pointer">Messages</p>
          <p className="hover:text-green-600 cursor-pointer">Profile</p>
        </div>
      )}
    </nav>
  );
};

export default NavBar;