import { Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center">
        <p className="text-muted-foreground text-sm font-medium">
          &copy; {new Date().getFullYear()} TrekMate. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;