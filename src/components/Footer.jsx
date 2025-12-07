function FooterCard() {
  return (
    <footer className="bg-white border-t border-primary/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-muted-foreground">
          <button className="hover:text-primary transition-colors">
            About
          </button>
          <button className="hover:text-primary transition-colors">
            Contact
          </button>
          <button className="hover:text-primary transition-colors">
            Terms
          </button>
          <button className="hover:text-primary transition-colors">
            Privacy
          </button>
        </div>
        <div className="text-center mt-4 text-muted-foreground">
          <p>&copy; 2024 Nepal Trekking Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default FooterCard;