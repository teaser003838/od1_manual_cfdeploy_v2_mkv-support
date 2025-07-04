import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import FileExplorer from './FileExplorer';
import PhotoSlideshow from './PhotoSlideshow';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [isOneDriveAuthenticated, setIsOneDriveAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [currentView, setCurrentView] = useState('explorer'); // 'explorer', 'video', 'photo'
  const [selectedItem, setSelectedItem] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for existing sessions
    const savedPasswordAuth = localStorage.getItem('password_authenticated');
    const savedAccessToken = localStorage.getItem('access_token');
    
    if (savedPasswordAuth === 'true') {
      setIsPasswordAuthenticated(true);
    }
    
    if (savedAccessToken) {
      setAccessToken(savedAccessToken);
      setIsOneDriveAuthenticated(true);
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessTokenFromUrl = urlParams.get('access_token');
    const authError = urlParams.get('error');
    
    if (authError) {
      console.error('Authentication error:', authError);
      setError('OneDrive authentication failed. Please try again.');
      return;
    }
    
    if (accessTokenFromUrl && !isOneDriveAuthenticated) {
      localStorage.setItem('access_token', accessTokenFromUrl);
      setAccessToken(accessTokenFromUrl);
      setIsOneDriveAuthenticated(true);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isOneDriveAuthenticated]);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsPasswordAuthenticated(true);
        localStorage.setItem('password_authenticated', 'true');
        setPassword('');
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (error) {
      console.error('Password authentication failed:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOneDriveLogin = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`);
      const data = await response.json();
      
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('OneDrive login failed:', error);
      setError('OneDrive login failed. Please try again.');
    }
  };

  const handlePlayVideo = (video) => {
    setSelectedItem(video);
    setCurrentView('video');
  };

  const handleViewPhoto = async (photo) => {
    setSelectedItem(photo);
    
    // Get all photos from the current folder for slideshow
    // This is a simplified version - in a real app, you'd get this from the file explorer
    setAllPhotos([photo]); // For now, just the single photo
    
    setCurrentView('photo');
  };

  const handleBackToExplorer = () => {
    setCurrentView('explorer');
    setSelectedItem(null);
    setAllPhotos([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('password_authenticated');
    localStorage.removeItem('access_token');
    setIsPasswordAuthenticated(false);
    setIsOneDriveAuthenticated(false);
    setAccessToken(null);
    setSelectedItem(null);
    setCurrentView('explorer');
    setPassword('');
    setError('');
  };

  // Password Authentication Screen
  if (!isPasswordAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🗂️ OneDrive Explorer</h1>
          <p>Secure access to your OneDrive files</p>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          <form onSubmit={handlePasswordLogin} className="password-form">
            <input
              type="password"
              placeholder="Enter access password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
              required
            />
            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Access Explorer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // OneDrive Authentication Screen
  if (!isOneDriveAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🗂️ OneDrive Explorer</h1>
          <p>Connect to your OneDrive to explore files</p>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          <button onClick={handleOneDriveLogin} className="login-button">
            Sign in with Microsoft OneDrive
          </button>
          
          <button onClick={handleLogout} className="logout-link">
            ← Back to Password Login
          </button>
        </div>
      </div>
    );
  }

  // Video Player View
  if (currentView === 'video' && selectedItem) {
    return (
      <VideoPlayer 
        video={selectedItem}
        backendUrl={BACKEND_URL}
        accessToken={accessToken}
        onBack={handleBackToExplorer}
      />
    );
  }

  // Photo Slideshow View
  if (currentView === 'photo' && selectedItem) {
    return (
      <PhotoSlideshow 
        photo={selectedItem}
        accessToken={accessToken}
        onBack={handleBackToExplorer}
        allPhotos={allPhotos}
      />
    );
  }

  // Main File Explorer View
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🗂️ OneDrive Explorer</h1>
          <div className="header-info">
            <span className="user-info">📁 File Browser & Media Viewer</span>
            <button onClick={handleLogout} className="logout-button">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <FileExplorer
          accessToken={accessToken}
          onPlayVideo={handlePlayVideo}
          onViewPhoto={handleViewPhoto}
        />
      </main>
    </div>
  );
}

export default App;