 import React from 'react';

interface BoardProps {
  width: number;
  height: number;
  children?: React.ReactNode; // To render paddles and ball inside
}

const Board: React.FC<BoardProps> = ({ width, height, children }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: 'black',
        border: '2px solid white',
        margin: '20px auto',
      }}
    >
      {children}
    </div>
  );
};

export default Board;