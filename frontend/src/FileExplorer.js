import React, { useState, useEffect } from 'react';
import './FileExplorer.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const FileExplorer = ({ accessToken, onPlayVideo, onViewPhoto, onPlayAudio }) => {
  const [currentFolder, setCurrentFolder] = useState('root');
  const [folderContents, setFolderContents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (accessToken) {
      fetchFolderContents(currentFolder);
    }
  }, [currentFolder, accessToken]);

  const fetchFolderContents = async (folderId) => {
    try {
      setLoading(true);
      setError('');
      setSearchResults(null);

      const response = await fetch(`${BACKEND_URL}/api/explorer/browse?folder_id=${folderId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFolderContents(data);
      } else {
        const errorText = await response.text();
        setError(`Failed to load folder: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Failed to fetch folder contents:', error);
      setError(`Error loading folder: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${BACKEND_URL}/api/explorer/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setError('Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError(`Search error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
  };

  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolder(folderId);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (item) => {
    if (item.type === 'folder') {
      return '📁';
    } else if (item.media_type === 'video') {
      return '🎬';
    } else if (item.media_type === 'photo') {
      return '🖼️';
    } else if (item.media_type === 'audio') {
      return '🎵';
    } else {
      return '📄';
    }
  };

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else if (item.media_type === 'video') {
      onPlayVideo(item);
    } else if (item.media_type === 'photo') {
      onViewPhoto(item);
    } else if (item.media_type === 'audio') {
      onPlayAudio(item);
    } else {
      // Handle other file types (download, etc.)
      if (item.download_url) {
        window.open(item.download_url, '_blank');
      }
    }
  };

  const renderBreadcrumbs = () => {
    if (!folderContents?.breadcrumbs) return null;

    return (
      <div className="breadcrumbs">
        {folderContents.breadcrumbs.map((crumb, index) => (
          <span key={crumb.id}>
            <button 
              className="breadcrumb-item"
              onClick={() => handleBreadcrumbClick(crumb.id)}
            >
              {crumb.name}
            </button>
            {index < folderContents.breadcrumbs.length - 1 && (
              <span className="breadcrumb-separator"> / </span>
            )}
          </span>
        ))}
      </div>
    );
  };

  const renderItems = (items) => {
    if (!items || items.length === 0) {
      return (
        <div className="empty-folder">
          <div className="empty-icon">📂</div>
          <h3>Empty folder</h3>
          <p>This folder doesn't contain any files or subfolders.</p>
        </div>
      );
    }

    return (
      <div className={`items-container ${viewMode}`}>
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`item-card ${item.type}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="item-thumbnail">
              {item.thumbnail_url && item.media_type === 'photo' ? (
                <img 
                  src={item.thumbnail_url} 
                  alt={item.name}
                  className="thumbnail-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="icon-placeholder" 
                style={{ display: (item.thumbnail_url && item.media_type === 'photo') ? 'none' : 'flex' }}
              >
                <span className="file-icon">{getFileIcon(item)}</span>
              </div>
              {item.is_media && (
                <div className="media-overlay">
                  <div className="play-button">
                    {item.media_type === 'video' ? '▶' : item.media_type === 'audio' ? '🎵' : '👁️'}
                  </div>
                </div>
              )}
            </div>
            
            <div className="item-info">
              <h3 className="item-name" title={item.name}>{item.name}</h3>
              {searchResults && (
                <p className="item-path">📍 {item.full_path}</p>
              )}
              <div className="item-details">
                {item.type === 'file' && (
                  <span className="file-size">{formatFileSize(item.size)}</span>
                )}
                {item.type === 'folder' && item.folder_stats && (
                  <div className="folder-stats">
                    <span className="folder-stat">
                      📁 {item.folder_stats.folder_count} folders
                    </span>
                    <span className="folder-stat">
                      📄 {item.folder_stats.file_count} files
                    </span>
                    {item.folder_stats.total_size > 0 && (
                      <span className="folder-stat">
                        💾 {formatFileSize(item.folder_stats.total_size)}
                      </span>
                    )}
                  </div>
                )}
                {item.modified && (
                  <span className="modified-date">Modified: {formatDate(item.modified)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const displayData = searchResults || folderContents;
  const allItems = searchResults ? 
    searchResults.results : 
    [...(folderContents?.folders || []), ...(folderContents?.files || [])];

  return (
    <div className="file-explorer">
      {/* Search Bar */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search across OneDrive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            🔍 Search
          </button>
          {searchResults && (
            <button type="button" onClick={clearSearch} className="clear-search-button">
              ✕ Clear
            </button>
          )}
        </form>
      </div>

      {/* Navigation and Controls */}
      {!searchResults && (
        <div className="navigation-section">
          {renderBreadcrumbs()}
          <div className="view-controls">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞ Grid
            </button>
            <button 
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰ List
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="content-area">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchFolderContents(currentFolder)} className="retry-button">
              Try Again
            </button>
          </div>
        ) : searchResults ? (
          <div className="search-results">
            <h2>Search Results ({searchResults.total} found)</h2>
            {renderItems(searchResults.results)}
          </div>
        ) : (
          <div className="folder-contents">
            {folderContents && (
              <div className="folder-info">
                <h2>📁 {folderContents.current_folder}</h2>
                {folderContents.total_size > 0 && (
                  <p className="folder-size">Total size: {formatFileSize(folderContents.total_size)}</p>
                )}
              </div>
            )}
            {renderItems(allItems)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;