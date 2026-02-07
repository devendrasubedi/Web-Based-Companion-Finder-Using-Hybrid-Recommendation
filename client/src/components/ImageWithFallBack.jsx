import React, { useState, useEffect } from 'react';
import { Image } from 'lucide-react';

const ImageWithFallback = ({ src, alt, className, fallbackSrc }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  // Default fallback is a simple gray div with an icon, or a provided url
  if (error) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} alt={alt} className={className} />;
    }
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <Image className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default ImageWithFallback;