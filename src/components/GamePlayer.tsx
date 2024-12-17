import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Check, X, RotateCw, Loader } from 'lucide-react';
import { SpotifyTrack } from '../types/spotify';
import { usePlayer } from '../hooks/usePlayer';
import { calculateSimilarity } from '../utils/similarity';
import { useGameHistory } from '../context/GameContext';
import { formatTime } from '../utils/formatters';

interface GamePlayerProps {
  track: SpotifyTrack;
  onGameComplete: (score: number) => void;
  onPlayAgain: () => void;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ track, onGameComplete, onPlayAgain }) => {
  const { isPlaying, error, isInitialized, playTrack, togglePlayback } = usePlayer();
  const { addGameResult } = useGameHistory();
  const [timer, setTimer] = useState(0);
  const [isGuessing, setIsGuessing] = useState(false);
  const [titleGuess, setTitleGuess] = useState('');
  const [artistGuess, setArtistGuess] = useState('');
  const [result, setResult] = useState<{ score: number; isCorrect: boolean } | null>(null);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (isInitialized) {
      playTrack(track).then(() => {
        setHasStartedPlaying(true);
      });
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [track, isInitialized]);

  useEffect(() => {
    if (isPlaying && hasStartedPlaying && !isGuessing && !result) {
      intervalRef.current = window.setInterval(() => {
        setTimer(prev => prev + 0.1);
      }, 100);
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, hasStartedPlaying, isGuessing, result]);

  const handlePauseAndGuess = async () => {
    await togglePlayback();
    setIsGuessing(true);
  };

  const calculateScore = () => {
    const titleSimilarity = calculateSimilarity(titleGuess, track.name);
    const artistSimilarity = calculateSimilarity(artistGuess, track.artists[0].name);
    const averageSimilarity = (titleSimilarity + artistSimilarity) / 2;
    const timeBonus = Math.max(0, 1 - (timer / 30)); // Bonus for guessing quickly
    const score = Math.round((averageSimilarity * 80 + timeBonus * 20) * 100);
    return {
      score,
      isCorrect: titleSimilarity > 0.8 && artistSimilarity > 0.8
    };
  };

  const handleSubmitGuess = () => {
    const result = calculateScore();
    setResult(result);
    onGameComplete(result.score);
    
    addGameResult({
      trackId: track.id,
      trackName: track.name,
      artistName: track.artists[0].name,
      albumImage: track.album.images[0]?.url || '',
      score: result.score,
      time: timer,
      timestamp: Date.now()
    });
  };

  const handlePlayAgain = () => {
    setTimer(0);
    setIsGuessing(false);
    setTitleGuess('');
    setArtistGuess('');
    setResult(null);
    setHasStartedPlaying(false);
    onPlayAgain();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        {error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : !isInitialized ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="animate-spin" size={32} />
            <span className="ml-2">Initializing player...</span>
          </div>
        ) : result ? (
          <div className="text-center">
            <div className="mb-6">
              <img
                src={track.album.images[0]?.url}
                alt={track.album.name}
                className="w-48 h-48 mx-auto rounded-lg shadow-md"
              />
            </div>
            <div className={`text-6xl mb-4 ${result.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {result.isCorrect ? <Check /> : <X />}
            </div>
            <div className="mb-4">
              <h3 className="text-xl font-bold">{track.name}</h3>
              <p className="text-gray-600">{track.artists[0].name}</p>
            </div>
            <div className="text-3xl font-bold mb-4">
              Score: {result.score}
            </div>
            <div className="text-gray-600 mb-6">
              Time: {formatTime(timer)}s
            </div>
            <button
              onClick={handlePlayAgain}
              className="flex items-center justify-center w-full gap-2 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors"
            >
              <RotateCw size={20} />
              Play Again
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl font-bold mb-2">{formatTime(timer)}</div>
              <div className="text-gray-600">seconds</div>
            </div>
            
            {isGuessing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Track Title
                  </label>
                  <input
                    type="text"
                    value={titleGuess}
                    onChange={(e) => setTitleGuess(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Enter track title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Artist
                  </label>
                  <input
                    type="text"
                    value={artistGuess}
                    onChange={(e) => setArtistGuess(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Enter artist name..."
                  />
                </div>
                <button
                  onClick={handleSubmitGuess}
                  className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Submit Guess
                </button>
              </div>
            ) : (
              <button
                onClick={handlePauseAndGuess}
                className="flex items-center justify-center w-full gap-2 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                {isPlaying ? 'Pause and Guess' : 'Play'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
