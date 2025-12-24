import React from 'react';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-green-600 mb-4">TrekMate</h3>
            <p className="text-gray-500 text-sm">
              Find your perfect hiking companion and explore the great outdoors together.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-500 hover:text-green-600 text-sm">About Us</a></li>
              <li><a href="#" className="text-gray-500 hover:text-green-600 text-sm">Contact</a></li>
              <li><a href="#" className="text-gray-500 hover:text-green-600 text-sm">Terms of Service</a></li>
              <li><a href="#" className="text-gray-500 hover:text-green-600 text-sm">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-green-600">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-600">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-600">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-600">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 text-center">
          <p className="text-xs text-gray-400">&copy; 2024 TrekMate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;