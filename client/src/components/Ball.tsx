 import React from 'react';

interface BallProps {
  x: number;
  y: number;
  radius: number;
  color?: string;
}

const Ball: React.FC<BallProps> = ({ x, y, radius, color = 'white' }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x - radius}px`, // Adjust for center
        top: `${y - radius}px`,  // Adjust for center
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        backgroundColor: color,
        borderRadius: '50%',
      }}
    />
  );
};

export default Ball;