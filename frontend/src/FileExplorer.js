import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './FileExplorer.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8001');

// Virtual scrolling component for performance with 10000+ items
const VirtualizedList = ({ items, renderItem, itemHeight = 80, containerHeight = 600, overscan = 5 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);
  
  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight), items.length - 1);
  
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return (
    <div 
      ref={scrollElementRef}
      className="virtual-scroll-container"
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map((item, index) => 
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
};

const FileExplorer = ({ 
  accessToken, 
  currentFolder: parentCurrentFolder, 
  onFolderChange, 
  onPlayVideo, 
  onViewPhoto, 
  onPlayAudio,
  showSearch,
  onSearchToggle
}) => {
  const [currentFolder, setCurrentFolder] = useState(parentCurrentFolder || 'root');
  const [folderContents, setFolderContents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showControlsMenu, setShowControlsMenu] = useState(false); // For responsive menu
  
  // Performance optimization states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200); // Start with larger page size for performance
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  // Caching for performance
  const folderCache = useRef(new Map());
  const searchCache = useRef(new Map());
  
  // Debounced search
  const searchTimeoutRef = useRef(null);
  
  // Performance metrics
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (parentCurrentFolder && parentCurrentFolder !== currentFolder) {
      setCurrentFolder(parentCurrentFolder);
    }
  }, [parentCurrentFolder]);

  useEffect(() => {
    if (accessToken) {
      // Reset pagination when folder changes
      setCurrentPage(1);
      fetchFolderContents(currentFolder, 1, true);
    }
  }, [currentFolder, accessToken, sortBy, sortOrder, fileTypeFilter]);

  // Optimized folder fetching with caching
  const fetchFolderContents = async (folderId, page = 1, resetData = false) => {
    try {
      setLoading(page === 1);
      setLoadingMore(page > 1);
      setError('');
      
      if (resetData) {
        setSearchResults(null);
        setFolderContents(null);
      }

      // Check cache first (only for first page)
      const cacheKey = `${folderId}-${sortBy}-${sortOrder}-${fileTypeFilter}`;
      if (page === 1 && folderCache.current.has(cacheKey)) {
        const cachedData = folderCache.current.get(cacheKey);
        // Use cached data if it's less than 30 seconds old
        if (Date.now() - cachedData.timestamp < 30000) {
          setFolderContents(cachedData.data);
          setHasMore(cachedData.data.pagination?.has_next || false);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams({
        folder_id: folderId,
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        file_types: fileTypeFilter
      });

      const response = await fetch(`${BACKEND_URL}/api/explorer/browse?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (page === 1) {
          setFolderContents(data);
          // Cache the data
          folderCache.current.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        } else {
          // Append data for infinite scroll
          setFolderContents(prev => prev ? {
            ...data,
            folders: [...prev.folders, ...data.folders],
            files: [...prev.files, ...data.files]
          } : data);
        }
        
        setHasMore(data.pagination?.has_next || false);
        setCurrentPage(page);
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
      setLoadingMore(false);
    }
  };

  // Optimized search with debouncing and caching
  const performSearch = useCallback(async (query, page = 1) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(page === 1);
      setLoadingMore(page > 1);
      setError('');

      // Check cache first
      const cacheKey = `search-${query}-${fileTypeFilter}-${sortBy}-${sortOrder}`;
      if (page === 1 && searchCache.current.has(cacheKey)) {
        const cachedData = searchCache.current.get(cacheKey);
        if (Date.now() - cachedData.timestamp < 60000) { // 1 minute cache for search
          setSearchResults(cachedData.data);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        page_size: pageSize.toString(),
        file_types: fileTypeFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const response = await fetch(`${BACKEND_URL}/api/explorer/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (page === 1) {
          setSearchResults(data);
          // Cache search results
          searchCache.current.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        } else {
          // Append for infinite scroll
          setSearchResults(prev => prev ? {
            ...data,
            results: [...prev.results, ...data.results]
          } : data);
        }
        
        setHasMore(data.pagination?.has_next || false);
      } else {
        setError('Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError(`Search error: ${error.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [accessToken, pageSize, fileTypeFilter, sortBy, sortOrder]);

  // Debounced search handler
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        setCurrentPage(1);
        performSearch(query, 1);
      } else {
        setSearchResults(null);
      }
    }, 300); // 300ms debounce
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery.trim()) {
      setCurrentPage(1);
      await performSearch(searchQuery, 1);
    }
  };

  // Load more data for infinite scroll
  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      const nextPage = currentPage + 1;
      if (searchResults) {
        performSearch(searchQuery, nextPage);
      } else {
        fetchFolderContents(currentFolder, nextPage, false);
      }
    }
  }, [hasMore, loadingMore, currentPage, searchResults, searchQuery, currentFolder, performSearch]);

  // Infinite scroll handler
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // Load more when near bottom (within 200px)
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      loadMore();
    }
  }, [loadMore]);

  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
    if (onFolderChange) {
      onFolderChange(folderId);
    }
  };

  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolder(folderId);
    if (onFolderChange) {
      onFolderChange(folderId);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (onSearchToggle) {
      onSearchToggle();
    }
  };

  // Performance optimized utilities
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  }, []);

  const getFileIcon = useCallback((item) => {
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
  }, []);

  const handleItemClick = useCallback((item) => {
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
  }, [navigateToFolder, onPlayVideo, onViewPhoto, onPlayAudio]);

  // Optimized render functions
  const renderBreadcrumbs = useMemo(() => {
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
  }, [folderContents?.breadcrumbs, handleBreadcrumbClick]);

  // Lazy loading thumbnail component
  const LazyThumbnail = React.memo(({ item }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    
    return (
      <div className="item-thumbnail">
        {item.thumbnail_url && item.media_type === 'photo' && !error ? (
          <img 
            src={item.thumbnail_url} 
            alt={item.name}
            className={`thumbnail-image ${loaded ? 'loaded' : 'loading'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
          />
        ) : (
          <div className="icon-placeholder">
            <span className="file-icon">{getFileIcon(item)}</span>
          </div>
        )}
        {item.is_media && (
          <div className="media-overlay">
            <div className="play-button">
              {item.media_type === 'video' ? '▶' : item.media_type === 'audio' ? '🎵' : '👁️'}
            </div>
          </div>
        )}
      </div>
    );
  });

  // Optimized item renderer for virtual scrolling
  const renderItem = useCallback((item, index) => (
    <div 
      key={`${item.id}-${index}`}
      className={`item-card ${item.type} ${viewMode}`}
      onClick={() => handleItemClick(item)}
      style={{ height: viewMode === 'list' ? '60px' : '200px' }}
    >
      <LazyThumbnail item={item} />
      
      <div className="item-info">
        <h3 className="item-name" title={item.name}>{item.name}</h3>
        {searchResults && (
          <p className="item-path">📍 {item.full_path}</p>
        )}
        <div className="item-details">
          {item.type === 'file' && (
            <span className="file-size">{formatFileSize(item.size)}</span>
          )}
          {item.modified && (
            <span className="modified-date">Modified: {formatDate(item.modified)}</span>
          )}
        </div>
      </div>
    </div>
  ), [viewMode, handleItemClick, searchResults, formatFileSize, formatDate]);

  // Memoized items list for performance
  const allItems = useMemo(() => {
    if (searchResults) {
      return searchResults.results || [];
    }
    return [...(folderContents?.folders || []), ...(folderContents?.files || [])];
  }, [searchResults, folderContents]);

  // Performance stats display
  const performanceStats = useMemo(() => {
    const displayData = searchResults || folderContents;
    if (!displayData) return null;
    
    const totalItems = searchResults ? 
      searchResults.pagination?.total_items : 
      (folderContents?.folders?.length || 0) + (folderContents?.files?.length || 0);
    
    return (
      <div className="performance-stats">
        <span>📊 {totalItems} items</span>
        {displayData.pagination && (
          <span>Page {displayData.pagination.current_page} of {displayData.pagination.total_pages}</span>
        )}
        {folderContents?.total_size > 0 && (
          <span>💾 {formatFileSize(folderContents.total_size)}</span>
        )}
      </div>
    );
  }, [searchResults, folderContents, formatFileSize]);

  return (
    <div className="file-explorer">
      {/* Mobile Search Bar - Only show when showSearch is true */}
      {showSearch && (
        <div className="mobile-search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search across OneDrive..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
              autoFocus
            />
            <button type="submit" className="search-button" disabled={loading}>
              🔍
            </button>
            <button type="button" onClick={clearSearch} className="clear-search-button">
              ✕
            </button>
          </form>
        </div>
      )}

      {/* Advanced Controls - Only show when not in mobile search mode */}
      {!showSearch && (
        <div className="controls-section">
          {/* Filter Controls */}
          <div className="filter-controls">
            <label>Filter:</label>
            <select 
              value={fileTypeFilter} 
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Files</option>
              <option value="folder">Folders</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="photo">Photos</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="sort-controls">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="modified">Modified</option>
              <option value="type">Type</option>
              {searchResults && <option value="relevance">Relevance</option>}
            </select>
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-button"
            >
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>

          {/* Page Size Control */}
          <div className="page-size-controls">
            <label>Items per page:</label>
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="page-size-select"
            >
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
          </div>
        </div>
      )}

      {/* Navigation and View Controls */}
      {!searchResults && !showSearch && (
        <div className="navigation-section">
          {renderBreadcrumbs}
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

      {/* Performance Stats */}
      {!showSearch && performanceStats}

      {/* Content Area with Virtual Scrolling */}
      <div className="content-area" onScroll={handleScroll}>
        {loading && currentPage === 1 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading {searchResults ? 'search results' : 'folder contents'}...</p>
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
        ) : allItems.length === 0 ? (
          <div className="empty-folder">
            <div className="empty-icon">📂</div>
            <h3>{searchResults ? 'No search results' : 'Empty folder'}</h3>
            <p>{searchResults ? 'Try a different search term.' : 'This folder doesn\'t contain any files or subfolders.'}</p>
          </div>
        ) : (
          <>
            {/* Use virtual scrolling for large lists */}
            {allItems.length > 100 && viewMode === 'list' ? (
              <VirtualizedList
                items={allItems}
                renderItem={renderItem}
                itemHeight={60}
                containerHeight={600}
                overscan={10}
              />
            ) : (
              <div className={`items-container ${viewMode}`}>
                {allItems.map((item, index) => renderItem(item, index))}
              </div>
            )}
            
            {/* Load More Button / Infinite Scroll Indicator */}
            {hasMore && (
              <div className="load-more-section">
                {loadingMore ? (
                  <div className="loading-more">
                    <div className="loading-spinner"></div>
                    <p>Loading more items...</p>
                  </div>
                ) : (
                  <button onClick={loadMore} className="load-more-button">
                    Load More Items
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;