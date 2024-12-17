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
    
    // Add to game history
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

  // ... rest of the component remains the same
}