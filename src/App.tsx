import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Callback } from './pages/Callback';
import { getStoredAccessToken } from './utils/auth';
import { getCurrentUser, getUserPlaylists, getPlaylistTracks } from './services/spotifyApi';
import { SpotifyPlaylist, SpotifyTrack, SpotifyUser } from './types/spotify';
import { validatePlaylist, validateTrack } from './utils/validators';
import { GameProvider } from './context/GameContext';

function App() {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playedTracks, setPlayedTracks] = useState<Set<string>>(new Set());

  const isAuthenticated = Boolean(getStoredAccessToken());

  useEffect(() => {
    const token = getStoredAccessToken();
    if (token) {
      getCurrentUser().then(setUser).catch(console.error);
      getUserPlaylists()
        .then(data => {
          const validPlaylists = data.items.filter(validatePlaylist);
          setPlaylists(validPlaylists);
        })
        .catch(error => {
          console.error('Failed to fetch playlists:', error);
          setError('Failed to load playlists. Please try again.');
        });
    }
  }, []);

  const handlePlaylistSelect = async (playlist: SpotifyPlaylist) => {
    try {
      setCurrentPlaylist(playlist);
      const response = await getPlaylistTracks(playlist.id);
      const validTracks = response.items
        .map(item => item.track)
        .filter(validateTrack)
        .filter(track => !playedTracks.has(track.id));

      if (validTracks.length === 0) {
        setError('No more unplayed tracks in this playlist!');
        return;
      }

      const randomTrack = validTracks[Math.floor(Math.random() * validTracks.length)];
      setCurrentTrack(randomTrack);
      setPlayedTracks(prev => new Set([...prev, randomTrack.id]));
      setError(null);
    } catch (error) {
      console.error('Failed to get playlist tracks:', error);
      setError('Failed to load tracks. Please try again.');
    }
  };

  const handlePlayAgain = async () => {
    if (currentPlaylist) {
      await handlePlaylistSelect(currentPlaylist);
    }
  };

  const handleResetPlaylist = () => {
    setCurrentPlaylist(null);
    setCurrentTrack(null);
    setPlayedTracks(new Set());
    setError(null);
  };

  return (
    <GameProvider>
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route path="/callback" element={<Callback />} />
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Home
                    user={user}
                    playlists={playlists}
                    currentTrack={currentTrack}
                    error={error}
                    onPlaylistSelect={handlePlaylistSelect}
                    onPlayAgain={handlePlayAgain}
                    onResetPlaylist={handleResetPlaylist}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/" replace /> : <Login />
              }
            />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  );
}

export default App;
