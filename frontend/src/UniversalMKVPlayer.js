// UniversalMKVPlayer.js - Advanced MKV Player Component for OneDrive streaming
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './UniversalMKVPlayer.css';

const UniversalMKVPlayer = ({ 
  videoUrl, 
  onError, 
  onProgress, 
  onLoadStart, 
  onLoadEnd,
  autoPlay = false,
  controls = true,
  width = "100%",
  height = "100%",
  className = "",
  onTimeUpdate,
  onDurationChange,
  onVolumeChange,
  onPlayStateChange
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bufferedPercentage, setBufferedPercentage] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [streamingMethod, setStreamingMethod] = useState('native');
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0);
  const [videoTracks, setVideoTracks] = useState([]);
  const [subtitleTracks, setSubtitleTracks] = useState([]);

  // Control visibility timer
  const hideControlsTimer = useRef(null);
  const progressUpdateTimer = useRef(null);

  // Initialize player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set up event listeners
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
      onLoadStart?.();
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      onLoadEnd?.();
      onDurationChange?.(video.duration);
      
      // Detect available tracks
      detectTracks();
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      // Check if we have audio
      if (video.audioTracks && video.audioTracks.length === 0) {
        console.warn('No audio tracks detected in MKV file');
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    const handleTimeUpdate = () => {
      const currentProgress = (video.currentTime / video.duration) * 100;
      setCurrentTime(video.currentTime);
      onProgress?.(currentProgress);
      onTimeUpdate?.(video.currentTime);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
      onVolumeChange?.(video.volume, video.muted);
    };

    const handleError = (e) => {
      console.error('MKV Player Error:', e);
      setIsLoading(false);
      
      const errorMessage = getMKVErrorMessage(e);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1);
        const percentage = (buffered / video.duration) * 100;
        setBufferedPercentage(percentage);
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [videoUrl, onError, onProgress, onLoadStart, onLoadEnd, onTimeUpdate, onDurationChange, onVolumeChange, onPlayStateChange]);

  // Detect available tracks
  const detectTracks = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // Audio tracks
      if (video.audioTracks) {
        const tracks = Array.from(video.audioTracks).map((track, index) => ({
          id: index,
          label: track.label || `Audio Track ${index + 1}`,
          language: track.language || 'unknown',
          enabled: track.enabled
        }));
        setAudioTracks(tracks);
      }

      // Video tracks
      if (video.videoTracks) {
        const tracks = Array.from(video.videoTracks).map((track, index) => ({
          id: index,
          label: track.label || `Video Track ${index + 1}`,
          selected: track.selected
        }));
        setVideoTracks(tracks);
      }

      // Text tracks (subtitles)
      if (video.textTracks) {
        const tracks = Array.from(video.textTracks).map((track, index) => ({
          id: index,
          label: track.label || `Subtitle Track ${index + 1}`,
          language: track.language || 'unknown',
          kind: track.kind
        }));
        setSubtitleTracks(tracks);
      }
    } catch (error) {
      console.error('Error detecting tracks:', error);
    }
  }, []);

  // Get appropriate error message for MKV files
  const getMKVErrorMessage = (error) => {
    const video = videoRef.current;
    if (!video) return 'Unknown playback error';

    const errorCode = error.target?.error?.code || error.code;
    
    switch (errorCode) {
      case 1: // MEDIA_ERR_ABORTED
        return 'Media playback aborted. Please try again.';
      case 2: // MEDIA_ERR_NETWORK
        return 'Network error while loading MKV file. Check your connection.';
      case 3: // MEDIA_ERR_DECODE
        return 'MKV file contains unsupported video/audio codecs. Try converting to MP4.';
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        return 'MKV format not supported in this browser. Try Chrome, Firefox, or Edge.';
      default:
        return 'MKV playback error. This format may not be fully supported in your browser.';
    }
  };

  // Enhanced play/pause with audio track validation
  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        await video.pause();
      } else {
        // Check for audio tracks before playing
        if (video.audioTracks && video.audioTracks.length === 0) {
          console.warn('No audio tracks detected - playing video only');
        }
        await video.play();
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setError('Failed to play MKV file. Check browser compatibility.');
    }
  }, [isPlaying]);

  // Seek to specific time
  const seekTo = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.currentTime = Math.max(0, Math.min(time, duration));
    } catch (error) {
      console.error('Seek error:', error);
    }
  }, [duration]);

  // Change volume
  const changeVolume = useCallback((newVolume) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, newVolume));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  }, []);

  // Change playback rate
  const changePlaybackRate = useCallback((rate) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.() || 
      container.webkitRequestFullscreen?.() || 
      container.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || 
      document.webkitExitFullscreen?.() || 
      document.msExitFullscreen?.();
    }
  }, []);

  // Switch audio track
  const switchAudioTrack = useCallback((trackIndex) => {
    const video = videoRef.current;
    if (!video || !video.audioTracks) return;

    try {
      // Disable all audio tracks
      for (let i = 0; i < video.audioTracks.length; i++) {
        video.audioTracks[i].enabled = false;
      }
      
      // Enable selected track
      if (trackIndex >= 0 && trackIndex < video.audioTracks.length) {
        video.audioTracks[trackIndex].enabled = true;
        setCurrentAudioTrack(trackIndex);
      }
    } catch (error) {
      console.error('Error switching audio track:', error);
    }
  }, []);

  // Control visibility management
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    
    if (isFullscreen) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isFullscreen]);

  // Handle container click
  const handleContainerClick = useCallback(() => {
    if (controls) {
      togglePlayPause();
    }
    showControlsTemporarily();
  }, [controls, togglePlayPause, showControlsTemporarily]);

  // Handle mouse movement
  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Format time display
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

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (error) {
    return (
      <div className={`universal-mkv-player error-state ${className}`}>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>MKV Playback Error</h3>
          <p>{error}</p>
          <div className="error-suggestions">
            <h4>Troubleshooting Tips:</h4>
            <ul>
              <li>Try using Chrome, Firefox, or Edge browser</li>
              <li>Check if the video file is corrupted</li>
              <li>Some MKV files may need conversion to MP4</li>
              <li>Ensure your browser supports the video/audio codecs</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`universal-mkv-player ${className} ${isFullscreen ? 'fullscreen' : ''}`}
      style={{ width, height }}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay={autoPlay}
        muted={autoPlay} // Autoplay requires muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="mkv-video-element"
      />
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⟳</div>
          <p>Loading MKV video...</p>
        </div>
      )}

      {controls && showControls && (
        <div className="mkv-controls">
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-buffer" 
                style={{ width: `${bufferedPercentage}%` }}
              />
              <div 
                className="progress-current" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="progress-slider"
              />
            </div>
          </div>
          
          <div className="controls-section">
            <div className="left-controls">
              <button 
                onClick={togglePlayPause}
                className="control-btn play-pause"
              >
                {isPlaying ? '⏸' : '▶️'}
              </button>
              
              <div className="volume-controls">
                <button 
                  onClick={toggleMute}
                  className="control-btn volume-btn"
                >
                  {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>
              
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            <div className="right-controls">
              {audioTracks.length > 1 && (
                <div className="audio-track-selector">
                  <select
                    value={currentAudioTrack}
                    onChange={(e) => switchAudioTrack(parseInt(e.target.value))}
                    className="control-select"
                  >
                    {audioTracks.map((track, index) => (
                      <option key={index} value={index}>
                        {track.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="playback-rate-selector">
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="control-select"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
              
              <button 
                onClick={toggleFullscreen}
                className="control-btn fullscreen-btn"
              >
                {isFullscreen ? '⤓' : '⤢'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Streaming method indicator */}
      <div className="streaming-info">
        <span>Method: {streamingMethod}</span>
        {audioTracks.length > 0 && (
          <span>Audio: {audioTracks.length} track(s)</span>
        )}
      </div>
    </div>
  );
};

export default UniversalMKVPlayer;