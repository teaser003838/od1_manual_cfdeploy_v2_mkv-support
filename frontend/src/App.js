import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import FileExplorer from './FileExplorer';
import PhotoSlideshow from './PhotoSlideshow';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8001');

function App() {
  const [isOneDriveAuthenticated, setIsOneDriveAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [currentView, setCurrentView] = useState('explorer'); // 'explorer', 'video', 'audio', 'photo'
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('root'); // Track current folder for navigation
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for existing OneDrive access token
    const savedAccessToken = localStorage.getItem('access_token');
    
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

  const handleOneDriveLogin = async () => {
    try {
      console.log('Attempting to login with backend URL:', BACKEND_URL);
      const response = await fetch(`${BACKEND_URL}/api/auth/login`);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', response.status, errorText);
        setError(`Login failed with status ${response.status}: ${errorText}`);
        return;
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Response is not JSON:', responseText);
        setError('Server returned non-JSON response. Please try again.');
        return;
      }
      
      const data = await response.json();
      console.log('Login response data:', data);
      
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setError('No auth URL received from server.');
      }
    } catch (error) {
      console.error('OneDrive login failed:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      setError(`OneDrive login failed: ${error.message}`);
    }
  };

  const handlePlayVideo = (video) => {
    setSelectedItem(video);
    setCurrentView('video');
  };

  const handlePlayAudio = (audio) => {
    setSelectedItem(audio);
    setCurrentView('audio');
  };

  const handleViewPhoto = async (photo) => {
    setSelectedItem(photo);
    
    // Get all photos from the current folder for slideshow
    // This is a simplified version - in a real app, you'd get this from the file explorer
    setAllPhotos([photo]); // For now, just the single photo
    
    setCurrentView('photo');
  };

  const handleFolderChange = (folderId) => {
    setCurrentFolder(folderId);
  };

  const handleBackToExplorer = () => {
    setCurrentView('explorer');
    setSelectedItem(null);
    setAllPhotos([]);
    // Note: We keep currentFolder unchanged so user returns to the same directory
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsOneDriveAuthenticated(false);
    setAccessToken(null);
    setSelectedItem(null);
    setCurrentView('explorer');
    setError('');
  };

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

  // Audio Player View
  if (currentView === 'audio' && selectedItem) {
    return (
      <AudioPlayer 
        audio={selectedItem}
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
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          onPlayVideo={handlePlayVideo}
          onPlayAudio={handlePlayAudio}
          onViewPhoto={handleViewPhoto}
        />
      </main>
    </div>
  );
}

export default App;