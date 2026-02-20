import React from 'react';

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="creator-orb w-96 h-96 -top-48 -left-48 animate-pulse-glow" />
      <div className="creator-orb w-80 h-80 top-1/3 -right-40 animate-pulse-glow" style={{ animationDelay: '2s' }} />
      <div className="creator-orb w-64 h-64 bottom-1/4 left-1/4 animate-pulse-glow" style={{ animationDelay: '4s' }} />
      
      {/* Floating particles */}
      <div className="floating-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-background/80" />
    </div>
  );
};