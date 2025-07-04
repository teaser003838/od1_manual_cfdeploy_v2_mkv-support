import React, { useState, useEffect, useCallback } from 'react';
import './PhotoSlideshow.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PhotoSlideshow = ({ photo, accessToken, onBack, allPhotos = [] }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoSlideshow, setAutoSlideshow] = useState(false);

  // Find current photo in the array
  useEffect(() => {
    if (allPhotos.length > 0) {
      const index = allPhotos.findIndex(p => p.id === photo.id);
      if (index !== -1) {
        setCurrentPhotoIndex(index);
      }
    }
  }, [photo.id, allPhotos]);

  // Auto slideshow
  useEffect(() => {
    if (autoSlideshow && allPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex(prev => (prev + 1) % allPhotos.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [autoSlideshow, allPhotos.length]);

  // Keyboard navigation
  const handleKeyPress = useCallback((e) => {
    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        previousPhoto();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextPhoto();
        break;
      case 'Escape':
        e.preventDefault();
        onBack();
        break;
      case 'Space':
        e.preventDefault();
        setAutoSlideshow(!autoSlideshow);
        break;
      default:
        break;
    }
  }, [autoSlideshow]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const currentPhoto = allPhotos.length > 0 ? allPhotos[currentPhotoIndex] : photo;

  const nextPhoto = () => {
    if (allPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
    }
  };

  const previousPhoto = () => {
    if (allPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
    }
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const getPhotoUrl = (photoItem) => {
    if (photoItem.download_url) {
      return photoItem.download_url;
    }
    return `${BACKEND_URL}/api/stream/${photoItem.id}?token=${accessToken}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      className="photo-slideshow-container" 
      onMouseMove={showControlsTemporarily}
      onClick={toggleZoom}
    >
      {/* Header */}
      {showControls && (
        <div className="slideshow-header">
          <button onClick={onBack} className="back-button">
            ← Back to Explorer
          </button>
          <h2 className="photo-title">{currentPhoto.name}</h2>
          <div className="slideshow-info">
            {allPhotos.length > 1 && (
              <span className="photo-counter">
                {currentPhotoIndex + 1} of {allPhotos.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Photo Display */}
      <div className="photo-display">
        <img 
          src={getPhotoUrl(currentPhoto)}
          alt={currentPhoto.name}
          className={`main-photo ${isZoomed ? 'zoomed' : ''}`}
          onLoad={() => setLoading(false)}
          onError={() => setError('Failed to load photo')}
        />
        
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <div className="error-message">⚠️ {error}</div>
          </div>
        )}

        {/* Navigation Arrows */}
        {showControls && allPhotos.length > 1 && (
          <>
            <button 
              className="nav-arrow prev-arrow"
              onClick={(e) => {
                e.stopPropagation();
                previousPhoto();
              }}
            >
              ‹
            </button>
            <button 
              className="nav-arrow next-arrow"
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="slideshow-controls">
          <div className="control-group">
            {allPhotos.length > 1 && (
              <>
                <button 
                  className="control-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    previousPhoto();
                  }}
                >
                  ⏮️ Previous
                </button>
                
                <button 
                  className="control-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAutoSlideshow(!autoSlideshow);
                  }}
                >
                  {autoSlideshow ? '⏸️ Pause' : '▶️ Play'}
                </button>
                
                <button 
                  className="control-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                >
                  ⏭️ Next
                </button>
              </>
            )}
            
            <button 
              className="control-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleZoom();
              }}
            >
              {isZoomed ? '🔍 Zoom Out' : '🔍 Zoom In'}
            </button>
            
            <button 
              className="control-button download-button"
              onClick={(e) => {
                e.stopPropagation();
                if (currentPhoto.download_url) {
                  window.open(currentPhoto.download_url, '_blank');
                }
              }}
            >
              💾 Download
            </button>
          </div>
        </div>
      )}

      {/* Photo Info */}
      {showControls && (
        <div className="photo-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{currentPhoto.name}</span>
            </div>
            {currentPhoto.full_path && (
              <div className="info-item">
                <span className="info-label">Path:</span>
                <span className="info-value">📍 {currentPhoto.full_path}</span>
              </div>
            )}
            {currentPhoto.size && (
              <div className="info-item">
                <span className="info-label">Size:</span>
                <span className="info-value">{formatFileSize(currentPhoto.size)}</span>
              </div>
            )}
            {currentPhoto.modified && (
              <div className="info-item">
                <span className="info-label">Modified:</span>
                <span className="info-value">{new Date(currentPhoto.modified).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail Strip */}
      {showControls && allPhotos.length > 1 && (
        <div className="thumbnail-strip">
          <div className="thumbnails-container">
            {allPhotos.map((photoItem, index) => (
              <div 
                key={photoItem.id}
                className={`thumbnail-item ${index === currentPhotoIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(index);
                }}
              >
                <img 
                  src={photoItem.thumbnail_url || getPhotoUrl(photoItem)}
                  alt={photoItem.name}
                  className="thumbnail-image"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {showControls && (
        <div className="help-text">
          <p>
            Use ← → arrow keys to navigate • Space to play/pause • Escape to exit • Click to zoom
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoSlideshow;