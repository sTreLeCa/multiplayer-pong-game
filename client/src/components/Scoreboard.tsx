 import React from 'react';

interface ScoreboardProps {
  score1: number;
  score2: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ score1, score2 }) => {
  return (
    <div style={{ color: 'white', fontSize: '2em', textAlign: 'center', marginBottom: '10px' }}>
      <span>Player 1: {score1}</span> - <span>Player 2: {score2}</span>
    </div>
  );
};

export default Scoreboard;
