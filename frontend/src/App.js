import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchHistory, setWatchHistory] = useState([]);
  const [currentView, setCurrentView] = useState('browse'); // 'browse', 'player', 'history'

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
      fetchVideos(token);
      fetchWatchHistory(token);
    }
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`);
      const data = await response.json();
      
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const fetchVideos = async (token) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchHistory = async (token) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/watch-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWatchHistory(data.watch_history || []);
      }
    } catch (error) {
      console.error('Failed to fetch watch history:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchVideos(accessToken);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/files/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const playVideo = async (video) => {
    setSelectedVideo(video);
    setCurrentView('player');
    
    // Add to watch history
    try {
      await fetch(`${BACKEND_URL}/api/watch-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: video.id,
          name: video.name
        })
      });
      
      // Refresh watch history
      fetchWatchHistory(accessToken);
    } catch (error) {
      console.error('Failed to update watch history:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVideoThumbnail = (video) => {
    if (video.thumbnails && video.thumbnails.length > 0) {
      return video.thumbnails[0].large?.url || video.thumbnails[0].medium?.url || video.thumbnails[0].small?.url;
    }
    return null;
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !isAuthenticated) {
      handleCallback(code);
    }
  }, [isAuthenticated]);

  const handleCallback = async (code) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/callback?code=${code}`);
      const data = await response.json();
      
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        setAccessToken(data.access_token);
        setIsAuthenticated(true);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Fetch videos
        fetchVideos(data.access_token);
        fetchWatchHistory(data.access_token);
      }
    } catch (error) {
      console.error('Callback failed:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setIsAuthenticated(false);
    setVideos([]);
    setSelectedVideo(null);
    setWatchHistory([]);
    setCurrentView('browse');
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>OneDrive Netflix</h1>
          <p>Stream your OneDrive videos in Netflix style</p>
          <button onClick={handleLogin} className="login-button">
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  // Video Player View
  if (currentView === 'player' && selectedVideo) {
    return (
      <div className="player-container">
        <div className="player-header">
          <button onClick={() => setCurrentView('browse')} className="back-button">
            ← Back to Browse
          </button>
          <h2>{selectedVideo.name}</h2>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
        <div className="video-player">
          <video
            key={selectedVideo.id}
            controls
            autoPlay
            width="100%"
            height="auto"
            style={{ maxHeight: '70vh' }}
          >
            <source
              src={`${BACKEND_URL}/api/stream/${selectedVideo.id}`}
              type={selectedVideo.mimeType}
            />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className="video-info">
          <h3>{selectedVideo.name}</h3>
          <p>Size: {formatFileSize(selectedVideo.size)}</p>
          <p>Type: {selectedVideo.mimeType}</p>
        </div>
      </div>
    );
  }

  // Watch History View
  if (currentView === 'history') {
    return (
      <div className="history-container">
        <div className="header">
          <button onClick={() => setCurrentView('browse')} className="back-button">
            ← Back to Browse
          </button>
          <h1>Watch History</h1>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
        <div className="history-grid">
          {watchHistory.length === 0 ? (
            <div className="empty-state">
              <p>No watch history yet. Start watching some videos!</p>
            </div>
          ) : (
            watchHistory.slice().reverse().map((item, index) => (
              <div key={index} className="history-item">
                <h3>{item.name}</h3>
                <p>Watched: {new Date(item.timestamp).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Main Browse View
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>OneDrive Netflix</h1>
          <nav className="nav-menu">
            <button 
              className={currentView === 'browse' ? 'active' : ''}
              onClick={() => setCurrentView('browse')}
            >
              Browse
            </button>
            <button 
              className={currentView === 'history' ? 'active' : ''}
              onClick={() => setCurrentView('history')}
            >
              History ({watchHistory.length})
            </button>
          </nav>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
        <div className="search-container">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading videos...</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.length === 0 ? (
              <div className="empty-state">
                <p>No videos found. Upload some videos to your OneDrive!</p>
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="video-card" onClick={() => playVideo(video)}>
                  <div className="video-thumbnail">
                    {getVideoThumbnail(video) ? (
                      <img src={getVideoThumbnail(video)} alt={video.name} />
                    ) : (
                      <div className="placeholder-thumbnail">
                        <div className="play-icon">▶</div>
                      </div>
                    )}
                    <div className="video-overlay">
                      <div className="play-button">▶</div>
                    </div>
                  </div>
                  <div className="video-info">
                    <h3>{video.name}</h3>
                    <p>{formatFileSize(video.size)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;