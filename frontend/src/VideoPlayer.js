// File: /app/frontend/src/VideoPlayer.js
import React, { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ video, backendUrl, accessToken, onBack }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(null);
  const [volumeIndicator, setVolumeIndicator] = useState(null);
  const [error, setError] = useState('');
  const [isControlsLocked, setIsControlsLocked] = useState(false);

  const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const qualityOptions = ['Auto', '1080p', '720p', '480p'];
  
  let hideControlsTimeout = useRef(null);
  let touchStartTime = useRef(null);
  let touchStartX = useRef(null);
  let touchStartY = useRef(null);
  let lastTap = useRef(null);
  let seekIndicatorTimeout = useRef(null);
  let volumeIndicatorTimeout = useRef(null);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
                            ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      // Show controls initially when video loads, then hide
      setShowControls(true);
      showControlsTemporarily();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      // Hide controls when playing starts
      showControlsTemporarily();
    };

    const handlePause = () => {
      setIsPlaying(false);
      // Show controls when paused
      setShowControls(true);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Show controls when video ends
      setShowControls(true);
    };

    const handleError = (e) => {
      console.error('Video error:', e);
      setIsPlaying(false);
      setIsBuffering(false);
      
      // Check if it's an MKV file and provide specific error message
      const videoSrc = videoElement.src;
      const isMkvFile = videoSrc.includes('.mkv') || video.name.toLowerCase().endsWith('.mkv');
      
      if (isMkvFile) {
        setError('MKV file format may not be supported in this browser. Please try a different browser or convert the file to MP4.');
      } else {
        setError('Video playback error. Please try again or use a different browser.');
      }
      
      // Auto-hide error after 10 seconds for MKV files (longer than usual)
      setTimeout(() => setError(''), isMkvFile ? 10000 : 5000);
    };

    const handleLoadError = () => {
      setIsBuffering(false);
      const isMkvFile = video.name.toLowerCase().endsWith('.mkv');
      
      if (isMkvFile) {
        setError('Unable to load MKV file. This format may not be supported in your browser. Try Chrome, Firefox, or Edge for better MKV support.');
      } else {
        setError('Failed to load video. Please check your connection and try again.');
      }
      
      setTimeout(() => setError(''), isMkvFile ? 10000 : 5000);
    };

    const handleFullscreenChange = () => {
      const isFullscreenNow = !!document.fullscreenElement;
      setIsFullscreen(isFullscreenNow);
      
      // Always show controls when entering/exiting fullscreen
      setShowControls(true);
      
      // If entering fullscreen and video is playing, start the auto-hide timer
      if (isFullscreenNow && isPlaying) {
        showControlsTemporarily();
      }
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadstart', () => setIsBuffering(true));
    videoElement.addEventListener('loadeddata', () => setIsBuffering(false));
    videoElement.addEventListener('stalled', handleLoadError);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadstart', () => setIsBuffering(true));
      videoElement.removeEventListener('loadeddata', () => setIsBuffering(false));
      videoElement.removeEventListener('stalled', handleLoadError);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [video.id, backendUrl, accessToken]);

  const togglePlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          await videoRef.current.play();
        }
      } catch (error) {
        console.error('Video play error:', error);
        // Show user-friendly error message
        setError(`Failed to play video: ${error.message}`);
        // Auto-hide error after 5 seconds
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration) {
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        
        // Ensure the new time is within bounds
        const clampedTime = Math.max(0, Math.min(duration, newTime));
        
        videoRef.current.currentTime = clampedTime;
        
        // Show controls when seeking
        showControlsTemporarily();
        setError(''); // Clear any previous errors
        
        // Use requestAnimationFrame for more accurate time updates
        const updateTime = () => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        };
        requestAnimationFrame(updateTime);
      } catch (error) {
        console.error('Seeking error:', error);
        setError('Failed to seek video');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      showControlsTemporarily();
    }
  };

  const changeQuality = (quality) => {
    if (videoRef.current && quality !== currentQuality) {
      const wasPlaying = !videoRef.current.paused;
      const currentTimeStamp = videoRef.current.currentTime;
      
      setCurrentQuality(quality);
      setShowQualityMenu(false);
      setIsBuffering(true);
      
      // In a real implementation, you would change the video source here
      // For now, we'll simulate quality change
      const newSrc = getQualityUrl(video.id, quality);
      
      videoRef.current.src = newSrc;
      videoRef.current.currentTime = currentTimeStamp;
      
      if (wasPlaying) {
        videoRef.current.play().then(() => {
          setIsBuffering(false);
        }).catch((error) => {
          console.error('Error resuming playback after quality change:', error);
          setIsBuffering(false);
        });
      } else {
        setIsBuffering(false);
      }
      
      showControlsTemporarily();
    }
  };

  const getQualityUrl = (videoId, quality) => {
    // Add quality parameter to the streaming URL
    const baseUrl = `${backendUrl}/api/stream/${videoId}?token=${accessToken}`;
    if (quality === 'Auto') {
      return baseUrl;
    }
    return `${baseUrl}&quality=${quality.toLowerCase()}`;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    
    // Only hide controls in fullscreen mode after 5 seconds
    hideControlsTimeout.current = setTimeout(() => {
      if (isFullscreen && isPlaying && !isControlsLocked) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }
    }, 5000);
  };

  const handleMouseMove = () => {
    if (!isMobile) {
      showControlsTemporarily();
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowControls(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && !isControlsLocked && isPlaying) {
      showControlsTemporarily();
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      
      // Show seek indicator
      setSeekIndicator(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
      if (seekIndicatorTimeout.current) {
        clearTimeout(seekIndicatorTimeout.current);
      }
      seekIndicatorTimeout.current = setTimeout(() => {
        setSeekIndicator(null);
      }, 1000);
    }
  };

  const adjustVolume = (delta) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
    
    // Show volume indicator
    setVolumeIndicator(Math.round(newVolume * 100));
    if (volumeIndicatorTimeout.current) {
      clearTimeout(volumeIndicatorTimeout.current);
    }
    volumeIndicatorTimeout.current = setTimeout(() => {
      setVolumeIndicator(null);
    }, 1000);
  };

  // Touch event handlers for mobile gestures
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    touchStartTime.current = Date.now();
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    
    setShowControls(true);
    showControlsTemporarily();
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    e.preventDefault(); // Prevent scrolling
  };

  const handleTouchEnd = (e) => {
    if (!isMobile) return;
    
    const touch = e.changedTouches[0];
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime.current;
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const screenWidth = rect.width;
    const screenHeight = rect.height;
    
    // Check for swipe gestures
    if (touchDuration < 500 && (absDeltaX > 50 || absDeltaY > 50)) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe - seeking
        const seekAmount = deltaX > 0 ? 10 : -10;
        skipTime(seekAmount);
      } else {
        // Vertical swipe - volume
        const volumeChange = deltaY > 0 ? -0.1 : 0.1;
        adjustVolume(volumeChange);
      }
      return;
    }
    
    // Check for tap gestures
    if (touchDuration < 300 && absDeltaX < 10 && absDeltaY < 10) {
      const tapX = touchEndX - rect.left;
      const tapY = touchEndY - rect.top;
      
      // Check for double tap
      const now = Date.now();
      if (lastTap.current && now - lastTap.current < 300) {
        // Double tap detected
        if (tapX < screenWidth / 3) {
          // Left side double tap - seek backward
          skipTime(-10);
        } else if (tapX > (screenWidth * 2) / 3) {
          // Right side double tap - seek forward
          skipTime(10);
        } else {
          // Center double tap - toggle fullscreen
          toggleFullscreen();
        }
        lastTap.current = null;
        return;
      }
      
      lastTap.current = now;
      
      // For center tap (play/pause), execute immediately without delay
      if (tapX >= screenWidth / 3 && tapX <= (screenWidth * 2) / 3) {
        // Center tap - toggle play/pause immediately
        setTimeout(() => {
          if (lastTap.current === now) {
            togglePlay();
            lastTap.current = null;
          }
        }, 50); // Very short delay to allow double tap detection
      } else {
        // Side taps have longer delay for better UX
        setTimeout(() => {
          if (lastTap.current === now) {
            // Single tap based on screen zones
            if (tapX < screenWidth / 3) {
              // Left side tap - seek backward
              skipTime(-10);
            } else if (tapX > (screenWidth * 2) / 3) {
              // Right side tap - seek forward
              skipTime(10);
            }
            lastTap.current = null;
          }
        }, 300);
      }
    }
  };

  const handleVideoClick = (e) => {
    if (isMobile) return; // Handle touch events separately for mobile
    
    // Always show controls when clicking on video
    setShowControls(true);
    showControlsTemporarily();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;
    
    // Screen-based seeking for PC (no seeking icons)
    if (clickX < screenWidth / 3) {
      // Left side click - seek backward
      skipTime(-10);
    } else if (clickX > (screenWidth * 2) / 3) {
      // Right side click - seek forward
      skipTime(10);
    } else {
      // Center click - toggle play/pause
      togglePlay();
    }
  };

  const handleVideoDoubleClick = (e) => {
    if (isMobile) return; // Handle touch events separately for mobile
    toggleFullscreen();
  };
  const handleKeyPress = (e) => {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skipTime(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skipTime(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        adjustVolume(0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        adjustVolume(-0.1);
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'KeyM':
        e.preventDefault();
        toggleMute();
        break;
      case 'KeyJ':
        e.preventDefault();
        skipTime(-10);
        break;
      case 'KeyL':
        e.preventDefault();
        skipTime(10);
        break;
      case 'KeyK':
        e.preventDefault();
        togglePlay();
        break;
      case 'Digit1':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.1;
        }
        break;
      case 'Digit2':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.2;
        }
        break;
      case 'Digit3':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.3;
        }
        break;
      case 'Digit4':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.4;
        }
        break;
      case 'Digit5':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.5;
        }
        break;
      case 'Digit6':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.6;
        }
        break;
      case 'Digit7':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.7;
        }
        break;
      case 'Digit8':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.8;
        }
        break;
      case 'Digit9':
        e.preventDefault();
        if (videoRef.current && duration) {
          videoRef.current.currentTime = duration * 0.9;
        }
        break;
      case 'Digit0':
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [volume, isPlaying, duration]);

  return (
    <div 
      className={`youtube-player-container ${showControls ? 'controls-visible' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={0}
      ref={containerRef}
    >
      <div className="player-header">
        <button onClick={onBack} className="back-button">
          ← Back to Browse
        </button>
        <h2 className="video-title">{video.name}</h2>
      </div>
      
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          src={getQualityUrl(video.id, currentQuality)}
          onClick={handleVideoClick}
          onDoubleClick={handleVideoDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          preload="metadata"
          crossOrigin="anonymous"
          playsInline
        />
        
        {/* Touch indicators for mobile */}
        {isMobile && (
          <>
            <div className="touch-zone touch-zone-left">
              <div className="touch-hint">⏪ 10s</div>
            </div>
            <div className="touch-zone touch-zone-center">
              <div className="touch-hint">⏯️</div>
            </div>
            <div className="touch-zone touch-zone-right">
              <div className="touch-hint">⏩ 10s</div>
            </div>
          </>
        )}
        
        {/* Error indicator */}
        {error && (
          <div className="error-indicator">
            ⚠️ {error}
          </div>
        )}
        
        {/* Seek indicator */}
        {seekIndicator && (
          <div className="seek-indicator">
            {seekIndicator}
          </div>
        )}
        
        {/* Volume indicator */}
        {volumeIndicator !== null && (
          <div className="volume-indicator">
            🔊 {volumeIndicator}%
          </div>
        )}
        
        {isBuffering && (
          <div className="buffering-overlay">
            <div className="buffering-spinner"></div>
          </div>
        )}

        {showControls && (
          <div className={`video-controls ${showControls ? 'show' : ''}`}>
            <div className="progress-container" onClick={handleSeek}>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                ></div>
                <div 
                  className="progress-handle"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="controls-row">
              <div className="left-controls">
                <button onClick={togglePlay} className="control-button">
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                
                {/* Remove seeking buttons for screen-inbuilt seeking */}
                
                <div className="volume-control">
                  <button onClick={toggleMute} className="control-button">
                    {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                  </button>
                  {!isMobile && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                    />
                  )}
                </div>
                
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="right-controls">
                {!isFullscreen && (
                  <>
                    <div className="settings-menu">
                      <button 
                        onClick={() => {
                          setShowQualityMenu(!showQualityMenu);
                          setShowSpeedMenu(false);
                          setIsControlsLocked(showQualityMenu ? false : true);
                        }} 
                        className="control-button"
                      >
                        ⚙️ {currentQuality}
                      </button>
                      {showQualityMenu && (
                        <div className="quality-menu">
                          <div className="menu-header">Quality</div>
                          {qualityOptions.map(quality => (
                            <div 
                              key={quality}
                              className={`menu-item ${currentQuality === quality ? 'active' : ''}`}
                              onClick={() => changeQuality(quality)}
                            >
                              {quality}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="settings-menu">
                      <button 
                        onClick={() => {
                          setShowSpeedMenu(!showSpeedMenu);
                          setShowQualityMenu(false);
                          setIsControlsLocked(showSpeedMenu ? false : true);
                        }} 
                        className="control-button"
                      >
                        🚀 {playbackRate}x
                      </button>
                      {showSpeedMenu && (
                        <div className="speed-menu">
                          <div className="menu-header">Speed</div>
                          {playbackSpeeds.map(speed => (
                            <div 
                              key={speed}
                              className={`menu-item ${playbackRate === speed ? 'active' : ''}`}
                              onClick={() => changePlaybackRate(speed)}
                            >
                              {speed}x {speed === 1 ? '(Normal)' : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <button onClick={toggleFullscreen} className="control-button">
                  {isFullscreen ? '🗗' : '⛶'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="video-info">
        <h3>{video.name}</h3>
        {video.folder_path && (
          <p className="folder-path">📁 {video.folder_path}</p>
        )}
        <div className="video-details">
          <span>Size: {formatFileSize(video.size)}</span>
          <span>Type: {video.mimeType}</span>
        </div>
        {!isMobile && (
          <div className="keyboard-shortcuts">
            <p><strong>Keyboard Shortcuts:</strong></p>
            <div className="shortcuts-grid">
              <span>Space/K - Play/Pause</span>
              <span>J/← - Seek backward 10s</span>
              <span>L/→ - Seek forward 10s</span>
              <span>↑/↓ - Volume</span>
              <span>F - Fullscreen</span>
              <span>M - Mute</span>
              <span>0-9 - Jump to %</span>
            </div>
          </div>
        )}
        {isMobile && (
          <div className="touch-instructions">
            <p><strong>Touch Controls:</strong></p>
            <div className="touch-help">
              <span>Tap left/right sides to seek</span>
              <span>Tap center to play/pause</span>
              <span>Double tap center for fullscreen</span>
              <span>Swipe left/right to seek</span>
              <span>Swipe up/down to adjust volume</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default VideoPlayer;