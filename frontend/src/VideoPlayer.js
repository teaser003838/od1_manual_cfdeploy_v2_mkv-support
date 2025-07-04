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
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoQualities] = useState(['Auto', '1080p', '720p', '480p', '360p']);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(null);
  const [volumeIndicator, setVolumeIndicator] = useState(null);

  const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  
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

  const loadSubtitles = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/subtitles/${video.id}?token=${accessToken}`);
      if (response.ok) {
        const data = await response.json();
        setSubtitles(data.subtitles || []);
      }
    } catch (error) {
      console.error('Failed to load subtitles:', error);
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      // Load subtitles when video metadata is loaded
      loadSubtitles();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
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
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [video.id, backendUrl, accessToken]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
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
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
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
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
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
        setVolume(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'KeyM':
        e.preventDefault();
        toggleMute();
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
  }, [volume, isPlaying]);

  return (
    <div className="youtube-player-container" onMouseMove={handleMouseMove} tabIndex={0}>
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
          src={`${backendUrl}/api/stream/${video.id}?token=${accessToken}`}
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        />
        
        {isBuffering && (
          <div className="buffering-overlay">
            <div className="buffering-spinner"></div>
          </div>
        )}

        {showControls && (
          <div className="video-controls">
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
                
                <button onClick={() => skipTime(-10)} className="control-button">
                  ⏪
                </button>
                
                <button onClick={() => skipTime(10)} className="control-button">
                  ⏩
                </button>
                
                <div className="volume-control">
                  <button onClick={toggleMute} className="control-button">
                    {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                </div>
                
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="right-controls">
                <div className="settings-menu">
                  <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                    className="control-button"
                  >
                    ⚙️ {playbackRate}x
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

                <div className="settings-menu">
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)} 
                    className="control-button"
                  >
                    📺 {selectedQuality}
                  </button>
                  {showQualityMenu && (
                    <div className="quality-menu">
                      <div className="menu-header">Quality</div>
                      {videoQualities.map(quality => (
                        <div 
                          key={quality}
                          className={`menu-item ${selectedQuality === quality ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedQuality(quality);
                            setShowQualityMenu(false);
                          }}
                        >
                          {quality}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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