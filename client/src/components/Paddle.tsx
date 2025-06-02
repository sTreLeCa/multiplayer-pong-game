 import React from 'react';

interface PaddleProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

const Paddle: React.FC<PaddleProps> = ({ x, y, width, height, color = 'white' }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: color,
      }}
    />
  );
};

export default Paddle;
