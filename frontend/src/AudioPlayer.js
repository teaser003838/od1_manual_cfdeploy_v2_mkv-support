import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ audio, backendUrl, accessToken, onBack }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [repeat, setRepeat] = useState('none'); // 'none', 'one', 'all'
  const [shuffle, setShuffle] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
      setIsLoading(false);
      setError('');
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
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
      if (repeat === 'one') {
        audioElement.currentTime = 0;
        audioElement.play();
      }
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError('');
    };

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('waiting', handleWaiting);
    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);
    audioElement.addEventListener('loadstart', handleLoadStart);

    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('waiting', handleWaiting);
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audio.id, repeat]);

  const togglePlay = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
      } catch (error) {
        console.error('Audio play error:', error);
        setError(`Failed to play audio: ${error.message}`);
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current && duration) {
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setError('');
      } catch (error) {
        console.error('Seeking error:', error);
        setError('Failed to seek audio');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const skipTime = (seconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleRepeat = () => {
    setRepeat(prev => {
      if (prev === 'none') return 'one';
      if (prev === 'one') return 'all';
      return 'none';
    });
  };

  const toggleShuffle = () => {
    setShuffle(!shuffle);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRepeatIcon = () => {
    if (repeat === 'none') return '🔄';
    if (repeat === 'one') return '🔂';
    return '🔁';
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  // Keyboard shortcuts
  useEffect(() => {
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
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1) } });
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyR':
          e.preventDefault();
          toggleRepeat();
          break;
        case 'KeyS':
          e.preventDefault();
          toggleShuffle();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isPlaying, volume, repeat, shuffle]);

  return (
    <div className="audio-player-container">
      <div className="player-header">
        <button onClick={onBack} className="back-button">
          ← Back to Browse
        </button>
        <h2 className="audio-title">{audio.name}</h2>
      </div>

      <div className="audio-player">
        <audio
          ref={audioRef}
          src={`${backendUrl}/api/stream/${audio.id}?token=${accessToken}`}
          preload="metadata"
        />

        {/* Album Art / Visualization */}
        <div className="audio-artwork">
          <div className="audio-icon">
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : error ? (
              <div className="error-icon">⚠️</div>
            ) : (
              <div className="music-icon">🎵</div>
            )}
          </div>
          
          {/* Audio Info */}
          <div className="audio-info">
            <h3 className="song-title">{audio.name}</h3>
            {audio.folder_path && (
              <p className="folder-path">📁 {audio.folder_path}</p>
            )}
            <div className="audio-details">
              <span>Size: {formatFileSize(audio.size)}</span>
              <span>Type: {audio.mimeType}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="buffering-indicator">
            <div className="buffering-spinner"></div>
            <span>Buffering...</span>
          </div>
        )}

        {/* Progress Bar */}
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

        {/* Time Display */}
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Main Controls */}
        <div className="main-controls">
          <button 
            onClick={toggleShuffle} 
            className={`control-button ${shuffle ? 'active' : ''}`}
            title="Shuffle"
          >
            🔀
          </button>

          <button 
            onClick={() => skipTime(-10)} 
            className="control-button"
            title="Skip backward 10s"
          >
            ⏪
          </button>

          <button 
            onClick={togglePlay} 
            className="play-button"
            disabled={isLoading}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? '⏳' : (isPlaying ? '⏸️' : '▶️')}
          </button>

          <button 
            onClick={() => skipTime(10)} 
            className="control-button"
            title="Skip forward 10s"
          >
            ⏩
          </button>

          <button 
            onClick={toggleRepeat} 
            className={`control-button ${repeat !== 'none' ? 'active' : ''}`}
            title={`Repeat: ${repeat}`}
          >
            {getRepeatIcon()}
          </button>
        </div>

        {/* Secondary Controls */}
        <div className="secondary-controls">
          <div className="volume-control">
            <button onClick={toggleMute} className="control-button">
              {getVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span className="volume-value">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="keyboard-shortcuts">
          <p><strong>Keyboard Shortcuts:</strong></p>
          <div className="shortcuts-grid">
            <span>Space - Play/Pause</span>
            <span>←/→ - Skip 10s</span>
            <span>↑/↓ - Volume</span>
            <span>M - Mute</span>
            <span>R - Repeat</span>
            <span>S - Shuffle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;