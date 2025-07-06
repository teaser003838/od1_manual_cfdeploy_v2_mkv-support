// EnhancedVideoPlayer.js - Enhanced Video Component for OneDrive app
import React, { useState, useEffect, useCallback } from 'react';
import UniversalMKVPlayer from './UniversalMKVPlayer';
import './EnhancedVideoPlayer.css';

const EnhancedVideoPlayer = ({ 
  file, 
  onClose, 
  onNext, 
  onPrevious, 
  playlist = [],
  currentIndex = 0,
  backendUrl,
  accessToken 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [streamingStats, setStreamingStats] = useState(null);
  const [watchTime, setWatchTime] = useState(0);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);

  // Enhanced OneDrive file URL processing
  const processOneDriveUrl = useCallback(async (file) => {
    try {
      // Build streaming URL with authentication
      const streamingUrl = `${backendUrl}/api/stream/${file.id}?token=${accessToken}`;
      return streamingUrl;
    } catch (error) {
      console.error('Failed to process OneDrive URL:', error);
      throw error;
    }
  }, [backendUrl, accessToken]);

  // Get video streaming URL
  const getStreamingUrl = useCallback(async (file) => {
    try {
      const directUrl = await processOneDriveUrl(file);
      return directUrl;
    } catch (error) {
      console.error('Failed to get streaming URL:', error);
      throw error;
    }
  }, [processOneDriveUrl]);

  // Probe video information
  const probeVideoInfo = useCallback(async (streamingUrl) => {
    try {
      // Call the backend video probing API
      const probeResponse = await fetch(`${backendUrl}/api/video/probe?source=${encodeURIComponent(streamingUrl)}`);
      if (!probeResponse.ok) {
        throw new Error(`Probing failed: ${probeResponse.status}`);
      }
      
      const probeData = await probeResponse.json();
      
      const videoInfo = {
        streamingUrl,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModifiedDateTime,
        format: probeData.format || file.name.split('.').pop().toLowerCase(),
        container: probeData.container,
        isMKV: file.name.toLowerCase().endsWith('.mkv'),
        duration: null, // Will be set by the player
        resolution: null, // Will be detected by the player
        streamingMethod: probeData.streaming_method || 'direct',
        browserCompatibility: probeData.browser_compatibility,
        codecSupport: probeData.codec_support,
        hasAudio: probeData.has_audio,
        hasVideo: probeData.has_video,
        audioTracks: probeData.audio_tracks || 1,
        videoTracks: probeData.video_tracks || 1,
        subtitleTracks: probeData.subtitle_tracks || 0
      };
      
      return videoInfo;
    } catch (error) {
      console.error('Failed to probe video info:', error);
      // Fallback to basic info
      return {
        streamingUrl,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModifiedDateTime,
        format: file.name.split('.').pop().toLowerCase(),
        isMKV: file.name.toLowerCase().endsWith('.mkv'),
        duration: null,
        resolution: null,
        streamingMethod: file.name.toLowerCase().endsWith('.mkv') ? 'mkv-native' : 'direct',
        hasAudio: true,
        hasVideo: true,
        audioTracks: 1,
        videoTracks: 1,
        subtitleTracks: 0
      };
    }
  }, [file, backendUrl]);

  // Load video information
  useEffect(() => {
    if (!file) return;

    const loadVideoInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const streamingUrl = await getStreamingUrl(file);
        const info = await probeVideoInfo(streamingUrl);
        
        setVideoInfo(info);
        setVideoUrl(streamingUrl);
      } catch (error) {
        console.error('Failed to load video info:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadVideoInfo();
  }, [file, getStreamingUrl, probeVideoInfo]);

  // Track watch time
  const handleProgress = useCallback((progress) => {
    if (videoInfo?.duration) {
      const currentTime = (progress / 100) * videoInfo.duration;
      setWatchTime(currentTime);
    }
  }, [videoInfo?.duration]);

  // Handle time updates from player
  const handleTimeUpdate = useCallback((currentTime) => {
    setWatchTime(currentTime);
  }, []);

  // Handle duration change from player
  const handleDurationChange = useCallback((duration) => {
    setVideoInfo(prev => prev ? { ...prev, duration } : null);
  }, []);

  // Save watch history
  const saveWatchHistory = useCallback(async () => {
    if (!file || watchTime < 10) return; // Only save if watched for at least 10 seconds

    try {
      await fetch(`${backendUrl}/api/watch-history`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          watchTime: watchTime,
          totalDuration: videoInfo?.duration || 0,
          timestamp: new Date().toISOString(),
          streamingMethod: streamingStats?.method || videoInfo?.streamingMethod || 'unknown'
        })
      });
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  }, [file, watchTime, videoInfo?.duration, streamingStats?.method, videoInfo?.streamingMethod, backendUrl, accessToken]);

  // Handle player events
  const handleLoadStart = useCallback(() => {
    setLoading(true);
    const startTime = Date.now();
    
    setStreamingStats(prev => ({
      ...prev,
      loadStartTime: startTime,
      method: videoInfo?.streamingMethod || 'unknown'
    }));
  }, [videoInfo?.streamingMethod]);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    const endTime = Date.now();
    
    setStreamingStats(prev => ({
      ...prev,
      loadEndTime: endTime,
      loadDuration: endTime - (prev?.loadStartTime || endTime)
    }));
  }, []);

  const handleError = useCallback((error) => {
    setError(error.message);
    setLoading(false);
    console.error('Video player error:', error);
  }, []);

  // Handle playlist navigation
  const handleNext = useCallback(() => {
    saveWatchHistory();
    onNext?.();
  }, [saveWatchHistory, onNext]);

  const handlePrevious = useCallback(() => {
    saveWatchHistory();
    onPrevious?.();
  }, [saveWatchHistory, onPrevious]);

  const handleClose = useCallback(() => {
    saveWatchHistory();
    onClose?.();
  }, [saveWatchHistory, onClose]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          if (playlist.length > 1) {
            handlePrevious();
          }
          break;
        case 'ArrowRight':
          if (playlist.length > 1) {
            handleNext();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleNext, handlePrevious, playlist.length]);

  // Auto-save watch history on unmount
  useEffect(() => {
    return () => {
      saveWatchHistory();
    };
  }, [saveWatchHistory]);

  if (!file) {
    return null;
  }

  return (
    <div className="enhanced-video-player-overlay">
      <div className="enhanced-video-player-container">
        {/* Header */}
        <div className="enhanced-video-header">
          <div className="video-title">
            <h2>{file.name}</h2>
            {videoInfo && (
              <div className="video-meta">
                <span>Size: {formatFileSize(file.size)}</span>
                <span>Format: {videoInfo.format?.toUpperCase()}</span>
                {videoInfo.resolution && (
                  <span>Resolution: {videoInfo.resolution}</span>
                )}
                {videoInfo.isMKV && (
                  <span className="mkv-indicator">MKV</span>
                )}
                {streamingStats?.method && (
                  <span>Method: {streamingStats.method}</span>
                )}
              </div>
            )}
          </div>
          
          <div className="video-controls">
            {playlist.length > 1 && (
              <>
                <button 
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="nav-button"
                >
                  ⏮ Previous
                </button>
                <span className="playlist-counter">
                  {currentIndex + 1} / {playlist.length}
                </span>
                <button 
                  onClick={handleNext}
                  disabled={currentIndex === playlist.length - 1}
                  className="nav-button"
                >
                  Next ⏭
                </button>
              </>
            )}
            <button onClick={handleClose} className="close-button">
              ✕ Close
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="enhanced-video-content">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner">⟳</div>
              <p>Loading video...</p>
              {videoInfo?.isMKV && (
                <p className="mkv-loading-info">
                  Loading MKV file - this may take a moment...
                </p>
              )}
              {streamingStats?.loadStartTime && (
                <p className="loading-time">
                  {Math.round((Date.now() - streamingStats.loadStartTime) / 1000)}s
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Playback Error</h3>
              <p>{error}</p>
              {videoInfo?.isMKV && (
                <div className="mkv-error-info">
                  <h4>MKV Playback Issues:</h4>
                  <ul>
                    <li>Try using Chrome, Firefox, or Edge browser</li>
                    <li>Some MKV files may need conversion to MP4</li>
                    <li>Check if the video contains supported codecs</li>
                  </ul>
                </div>
              )}
              <div className="error-actions">
                <button onClick={() => window.location.reload()}>
                  Retry
                </button>
                <button onClick={handleClose}>
                  Close
                </button>
              </div>
            </div>
          )}

          {videoUrl && videoInfo && !loading && !error && (
            <UniversalMKVPlayer
              videoUrl={videoUrl}
              onError={handleError}
              onProgress={handleProgress}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              autoPlay={true}
              controls={true}
              width="100%"
              height="100%"
              className="main-universal-player"
            />
          )}
        </div>

        {/* Footer with stats */}
        {videoInfo && (
          <div className="enhanced-video-footer">
            <div className="playback-stats">
              {streamingStats?.loadDuration && (
                <span>Load time: {streamingStats.loadDuration}ms</span>
              )}
              {watchTime > 0 && (
                <span>Watch time: {formatTime(watchTime)}</span>
              )}
              {videoInfo.streamingMethod && (
                <span>Streaming: {videoInfo.streamingMethod}</span>
              )}
              {videoInfo.isMKV && (
                <span className="mkv-status">MKV Native Playback</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds) => {
  if (!isFinite(seconds)) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default EnhancedVideoPlayer;