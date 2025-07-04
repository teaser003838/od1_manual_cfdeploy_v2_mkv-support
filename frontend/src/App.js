import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
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
      setError('');
      setLoadingMessage('Connecting to OneDrive...');
      
      console.log('Starting to fetch videos...');
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 45000); // 45 second timeout
      });
      
      // First try to get all videos recursively from all folders with timeout
      let response;
      try {
        setLoadingMessage('Scanning all folders for videos...');
        response = await Promise.race([
          fetch(`${BACKEND_URL}/api/files/all`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          timeoutPromise
        ]);
      } catch (timeoutError) {
        console.log('Recursive search timed out, trying root directory only...');
        setLoadingMessage('Scanning root directory for videos...');
        response = await fetch(`${BACKEND_URL}/api/files`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (response.ok) {
        setLoadingMessage('Processing found videos...');
        const data = await response.json();
        console.log(`Found ${data.videos?.length || 0} videos`);
        console.log('First few videos:', data.videos?.slice(0, 3));
        setVideos(data.videos || []);
        
        if (data.videos?.length === 0) {
          setError('No videos found in your OneDrive. Upload some videos to start streaming!');
        }
      } else {
        console.error('Failed to fetch videos:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        
        if (response.status === 401 || response.status === 403) {
          setError('Authentication expired. Please log in again.');
          handleLogout();
        } else {
          setError(`Failed to fetch videos: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      setError(`Error fetching videos: ${error.message}`);
    } finally {
      setLoading(false);
      setLoadingMessage('');
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
    // First try OneDrive thumbnails
    if (video.thumbnails && video.thumbnails.length > 0) {
      const thumbnail = video.thumbnails[0];
      return thumbnail.large?.url || thumbnail.medium?.url || thumbnail.small?.url;
    }
    
    // Fallback to our thumbnail endpoint
    return `${BACKEND_URL}/api/thumbnail/${video.id}?token=${accessToken}`;
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessTokenFromUrl = urlParams.get('access_token');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed. Please try again.');
      return;
    }
    
    if (accessTokenFromUrl && !isAuthenticated) {
      localStorage.setItem('access_token', accessTokenFromUrl);
      setAccessToken(accessTokenFromUrl);
      setIsAuthenticated(true);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Fetch videos
      fetchVideos(accessTokenFromUrl);
      fetchWatchHistory(accessTokenFromUrl);
    }
  }, [isAuthenticated]);

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
      <VideoPlayer 
        video={selectedVideo}
        backendUrl={BACKEND_URL}
        accessToken={accessToken}
        onBack={() => setCurrentView('browse')}
      />
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
            <p>{loadingMessage || 'Loading videos...'}</p>
            <div className="loading-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <p style={{ marginTop: '10px', color: '#888', fontSize: '0.9rem' }}>
                This may take a while if you have many folders...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button onClick={() => fetchVideos(accessToken)} className="retry-button">
              Try Again
            </button>
          </div>
        ) : (
          <div className="video-grid">
            {videos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <h2>No videos found</h2>
                <p>Upload some videos to your OneDrive to start streaming!</p>
                <button onClick={() => fetchVideos(accessToken)} className="refresh-button">
                  Refresh
                </button>
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="video-card" onClick={() => playVideo(video)}>
                  <div className="video-thumbnail">
                    {getVideoThumbnail(video) ? (
                      <img 
                        src={getVideoThumbnail(video)} 
                        alt={video.name}
                        onError={(e) => {
                          // Hide broken thumbnail and show placeholder
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="placeholder-thumbnail" 
                      style={{ display: getVideoThumbnail(video) ? 'none' : 'flex' }}
                    >
                      <div className="play-icon">▶</div>
                    </div>
                    <div className="video-overlay">
                      <div className="play-button">▶</div>
                    </div>
                  </div>
                  <div className="video-info">
                    <h3>{video.name}</h3>
                    {video.folder_path && (
                      <p className="folder-path" style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>
                        📁 {video.folder_path}
                      </p>
                    )}
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