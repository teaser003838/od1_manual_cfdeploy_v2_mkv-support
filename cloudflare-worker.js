/**
 * Cloudflare Worker for OneDrive Media Streaming API
 * Converted from FastAPI to Workers format
 */

// Environment variables will be configured in Cloudflare dashboard
// AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, DB

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for all requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Route handling
      if (path === '/') {
        return handleRootPage(request, corsHeaders);
      }
      
      if (path === '/api/health') {
        return handleHealthCheck(corsHeaders);
      }
      
      if (path === '/api/auth/login') {
        return handleAuthLogin(env, corsHeaders);
      }
      
      if (path === '/api/auth/callback') {
        return handleAuthCallback(request, env, corsHeaders);
      }
      
      if (path === '/api/explorer/browse') {
        return handleBrowseFolder(request, env, corsHeaders);
      }
      
      if (path === '/api/explorer/search') {
        return handleSearchFiles(request, env, corsHeaders);
      }
      
      if (path === '/api/files') {
        return handleListFiles(request, env, corsHeaders);
      }
      
      if (path === '/api/files/all') {
        return handleListAllFiles(request, env, corsHeaders);
      }
      
      if (path === '/api/files/search') {
        return handleLegacySearchFiles(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/stream/')) {
        return handleStreamMedia(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/thumbnail/')) {
        return handleGetThumbnail(request, env, corsHeaders);
      }
      
      if (path === '/api/watch-history') {
        if (method === 'POST') {
          return handleAddWatchHistory(request, env, corsHeaders);
        } else {
          return handleGetWatchHistory(request, env, corsHeaders);
        }
      }
      
      if (path.startsWith('/api/subtitles/')) {
        return handleGetSubtitles(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/subtitle-content/')) {
        return handleGetSubtitleContent(request, env, corsHeaders);
      }

      // Default 404 response
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// Helper functions
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function getAuthToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Root page handler for worker direct access
function handleRootPage(request, corsHeaders) {
  const url = new URL(request.url);
  const workerUrl = `${url.protocol}//${url.host}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>OneDrive Media Streaming API</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .status { color: green; font-weight: bold; }
            .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
            .note { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>🚀 OneDrive Media Streaming API</h1>
        <p class="status">✅ Worker is running successfully!</p>
        
        <div class="note">
            <h3>📌 Important Note:</h3>
            <p>This is the <strong>API backend</strong>. To access the main application, visit your <strong>Cloudflare Pages URL</strong> instead.</p>
            <p>Example: <code>https://your-app.pages.dev</code></p>
        </div>
        
        <h2>📋 Available API Endpoints:</h2>
        <div class="endpoint"><strong>GET</strong> /api/health - Health check</div>
        <div class="endpoint"><strong>GET</strong> /api/auth/login - Start OAuth login</div>
        <div class="endpoint"><strong>GET</strong> /api/auth/callback - OAuth callback</div>
        <div class="endpoint"><strong>GET</strong> /api/explorer/browse - Browse OneDrive folders</div>
        <div class="endpoint"><strong>GET</strong> /api/explorer/search - Search files</div>
        <div class="endpoint"><strong>GET</strong> /api/stream/{file_id} - Stream media files</div>
        <div class="endpoint"><strong>POST/GET</strong> /api/watch-history - Manage watch history</div>
        
        <h2>🔧 Configuration:</h2>
        <p>Make sure your Cloudflare Pages environment variable points to this Worker:</p>
        <p><code>REACT_APP_BACKEND_URL=${workerUrl}</code></p>
        
        <h2>🧪 Quick Test:</h2>
        <p><a href="/api/health" target="_blank">Test Health Endpoint</a></p>
    </body>
    </html>
  `;
  
  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
    },
  });
}

// Health check endpoint
function handleHealthCheck(corsHeaders) {
  return jsonResponse(
    { status: 'healthy', service: 'OneDrive File Explorer API' },
    200,
    corsHeaders
  );
}

// Authentication login endpoint
async function handleAuthLogin(env, corsHeaders) {
  try {
    const authority = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}`;
    const scopes = ['Files.ReadWrite.All', 'User.Read'];
    const redirectUri = env.REDIRECT_URI || `https://onedrive-media-api.hul1hu.workers.dev/api/auth/callback`;
    
    const authUrl = `${authority}/oauth2/v2.0/authorize?` +
      `client_id=${env.AZURE_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_mode=query&` +
      `scope=${encodeURIComponent(scopes.join(' '))}`;
    
    return jsonResponse({ auth_url: authUrl }, 200, corsHeaders);
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: 'Authentication failed' }, 500, corsHeaders);
  }
}

// Authentication callback endpoint
async function handleAuthCallback(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return Response.redirect(`${env.FRONTEND_URL}?error=authentication_failed`, 302);
    }
    
    // Exchange code for token
    const tokenUrl = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const redirectUri = `${env.FRONTEND_URL}/api/auth/callback`;
    
    const tokenData = new URLSearchParams({
      client_id: env.AZURE_CLIENT_ID,
      client_secret: env.AZURE_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData,
    });
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return Response.redirect(`${env.FRONTEND_URL}?error=token_exchange_failed`, 302);
    }
    
    const tokenResult = await tokenResponse.json();
    
    if (!tokenResult.access_token) {
      return Response.redirect(`${env.FRONTEND_URL}?error=no_access_token`, 302);
    }
    
    // Get user info and store in database
    const userInfo = await getUserInfo(tokenResult.access_token);
    const userId = userInfo.id;
    
    if (userId) {
      // Store user in D1 database
      await storeUser(env.DB, userId, userInfo);
    }
    
    // Redirect to frontend with access token
    return Response.redirect(`${env.FRONTEND_URL}?access_token=${tokenResult.access_token}`, 302);
  } catch (error) {
    console.error('Callback error:', error);
    return Response.redirect(`${env.FRONTEND_URL}?error=callback_failed`, 302);
  }
}

// Get user info from Microsoft Graph
async function getUserInfo(accessToken) {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
    return {};
  } catch (error) {
    console.error('Error getting user info:', error);
    return {};
  }
}

// Store user in D1 database
async function storeUser(db, userId, userInfo) {
  try {
    await db.prepare(`
      INSERT OR REPLACE INTO users (user_id, name, email, last_login)
      VALUES (?, ?, ?, ?)
    `).bind(
      userId,
      userInfo.displayName || '',
      userInfo.mail || userInfo.userPrincipalName || '',
      new Date().toISOString()
    ).run();
  } catch (error) {
    console.error('Error storing user:', error);
  }
}

// File explorer browse endpoint
async function handleBrowseFolder(request, env, corsHeaders) {
  try {
    const accessToken = getAuthToken(request);
    if (!accessToken) {
      return jsonResponse({ error: 'Authorization required' }, 401, corsHeaders);
    }
    
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folder_id') || 'root';
    
    // Get folder contents from Microsoft Graph
    const graphUrl = folderId === 'root' 
      ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
      : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
    
    const response = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      return jsonResponse({ error: 'Failed to browse folder' }, 400, corsHeaders);
    }
    
    const data = await response.json();
    const items = data.value || [];
    
    // Process items for file explorer
    const processedItems = await processFileItems(items, accessToken);
    
    return jsonResponse(processedItems, 200, corsHeaders);
  } catch (error) {
    console.error('Browse folder error:', error);
    return jsonResponse({ error: 'Failed to browse folder' }, 500, corsHeaders);
  }
}

// Process file items for consistent format
async function processFileItems(items, accessToken) {
  const folders = [];
  const files = [];
  
  // Define supported media types
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv'];
  const photoExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];
  const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma', '.opus', '.aiff', '.alac'];
  
  for (const item of items) {
    const itemName = item.name.toLowerCase();
    
    if (item.folder) {
      // It's a folder
      folders.push({
        id: item.id,
        name: item.name,
        type: 'folder',
        size: item.size || 0,
        modified: item.lastModifiedDateTime,
        created: item.createdDateTime,
        full_path: item.name,
        is_media: false,
      });
    } else {
      // It's a file
      const mimeType = item.file?.mimeType || '';
      const isVideo = videoExtensions.some(ext => itemName.endsWith(ext)) || mimeType.startsWith('video/');
      const isPhoto = photoExtensions.some(ext => itemName.endsWith(ext)) || mimeType.startsWith('image/');
      const isAudio = audioExtensions.some(ext => itemName.endsWith(ext)) || mimeType.startsWith('audio/');
      
      let mediaType = 'other';
      if (isVideo) mediaType = 'video';
      else if (isPhoto) mediaType = 'photo';
      else if (isAudio) mediaType = 'audio';
      
      files.push({
        id: item.id,
        name: item.name,
        type: 'file',
        size: item.size || 0,
        modified: item.lastModifiedDateTime,
        created: item.createdDateTime,
        mime_type: mimeType,
        full_path: item.name,
        is_media: isVideo || isPhoto || isAudio,
        media_type: mediaType,
        thumbnail_url: getThumbnailUrl(item),
        download_url: item['@microsoft.graph.downloadUrl'],
      });
    }
  }
  
  return {
    current_folder: 'Root',
    folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
    total_size: folders.reduce((sum, f) => sum + f.size, 0) + files.reduce((sum, f) => sum + f.size, 0),
    folder_count: folders.length,
    file_count: files.length,
    media_count: files.filter(f => f.is_media).length,
  };
}

// Get thumbnail URL from item
function getThumbnailUrl(item) {
  const thumbnails = item.thumbnails || [];
  if (thumbnails.length > 0) {
    const thumbnail = thumbnails[0];
    if (thumbnail.large) return thumbnail.large.url;
    if (thumbnail.medium) return thumbnail.medium.url;
    if (thumbnail.small) return thumbnail.small.url;
  }
  return null;
}

// Search files endpoint
async function handleSearchFiles(request, env, corsHeaders) {
  try {
    const accessToken = getAuthToken(request);
    if (!accessToken) {
      return jsonResponse({ error: 'Authorization required' }, 401, corsHeaders);
    }
    
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
      return jsonResponse({ error: 'Search query required' }, 400, corsHeaders);
    }
    
    const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query)}')`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      return jsonResponse({ error: 'Search failed' }, 400, corsHeaders);
    }
    
    const data = await response.json();
    const items = data.value || [];
    
    // Process search results
    const processedItems = await processFileItems(items, accessToken);
    
    return jsonResponse({
      results: [...processedItems.folders, ...processedItems.files],
      total: processedItems.folders.length + processedItems.files.length,
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Search error:', error);
    return jsonResponse({ error: 'Search failed' }, 500, corsHeaders);
  }
}

// Legacy endpoints for backward compatibility
async function handleListFiles(request, env, corsHeaders) {
  try {
    const accessToken = getAuthToken(request);
    if (!accessToken) {
      return jsonResponse({ error: 'Authorization required' }, 401, corsHeaders);
    }
    
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      return jsonResponse({ error: 'Failed to fetch files' }, 400, corsHeaders);
    }
    
    const data = await response.json();
    const items = data.value || [];
    
    // Filter for media files
    const mediaFiles = items.filter(item => !item.folder && isMediaFile(item.name))
      .map(item => ({
        id: item.id,
        name: item.name,
        size: item.size || 0,
        mimeType: item.file?.mimeType || 'application/octet-stream',
        downloadUrl: item['@microsoft.graph.downloadUrl'],
        webUrl: item.webUrl,
        thumbnails: item.thumbnails || [],
        media_type: getMediaType(item.name),
      }));
    
    return jsonResponse({ videos: mediaFiles }, 200, corsHeaders);
  } catch (error) {
    console.error('List files error:', error);
    return jsonResponse({ error: 'Failed to list files' }, 500, corsHeaders);
  }
}

// Handle streaming media
async function handleStreamMedia(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const itemId = url.pathname.split('/').pop();
    const accessToken = getAuthToken(request) || url.searchParams.get('token');
    
    if (!accessToken) {
      return jsonResponse({ error: 'Authorization required' }, 401, corsHeaders);
    }
    
    // Get file info
    const fileResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!fileResponse.ok) {
      return jsonResponse({ error: 'File not found' }, 404, corsHeaders);
    }
    
    const fileInfo = await fileResponse.json();
    const downloadUrl = fileInfo['@microsoft.graph.downloadUrl'];
    
    if (!downloadUrl) {
      return jsonResponse({ error: 'Download URL not available' }, 404, corsHeaders);
    }
    
    // Handle range requests
    const rangeHeader = request.headers.get('Range');
    const fileSize = fileInfo.size || 0;
    
    if (rangeHeader) {
      // Parse range
      const range = rangeHeader.replace('bytes=', '').split('-');
      const start = parseInt(range[0]) || 0;
      const end = parseInt(range[1]) || fileSize - 1;
      
      // Fetch range from OneDrive
      const rangeResponse = await fetch(downloadUrl, {
        headers: {
          'Range': `bytes=${start}-${end}`,
        },
      });
      
      if (rangeResponse.ok) {
        const headers = {
          ...corsHeaders,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': (end - start + 1).toString(),
          'Content-Type': getCompatibleMimeType(fileInfo.name, fileInfo.file?.mimeType),
        };
        
        return new Response(rangeResponse.body, {
          status: 206,
          headers,
        });
      }
    }
    
    // Stream full file
    const streamResponse = await fetch(downloadUrl);
    
    if (!streamResponse.ok) {
      return jsonResponse({ error: 'Failed to stream file' }, 500, corsHeaders);
    }
    
    const headers = {
      ...corsHeaders,
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'Content-Type': getCompatibleMimeType(fileInfo.name, fileInfo.file?.mimeType),
    };
    
    return new Response(streamResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Stream error:', error);
    return jsonResponse({ error: 'Failed to stream media' }, 500, corsHeaders);
  }
}

// Get compatible MIME type
function getCompatibleMimeType(filename, originalMime) {
  const name = filename.toLowerCase();
  
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mkv')) return 'video/x-matroska';
  if (name.endsWith('.avi')) return 'video/x-msvideo';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.wmv')) return 'video/x-ms-wmv';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.flac')) return 'audio/flac';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.ogg')) return 'audio/ogg';
  if (name.endsWith('.aac')) return 'audio/aac';
  
  return originalMime || 'application/octet-stream';
}

// Watch history endpoints
async function handleAddWatchHistory(request, env, corsHeaders) {
  try {
    const accessToken = getAuthToken(request);
    if (!accessToken) {
      return jsonResponse({ error: 'Authorization required' }, 401, corsHeaders);
    }
    
    const userInfo = await getUserInfo(accessToken);
    const userId = userInfo.id;
    
    if (!userId) {
      return jsonResponse({ error: 'User not authenticated' }, 401, corsHeaders);
    }
    
    const historyData = await request.json();
    const timestamp = new Date().toISOString();
    
    // Store in D1 database
    await env.DB.prepare(`
      INSERT INTO watch_history (user_id, item_id, name, timestamp)
      VALUES (?, ?, ?, ?)
    `).bind(userId, historyData.item_id, historyData.name, timestamp).run();
    
    return jsonResponse({ status: 'success' }, 200, corsHeaders);
  } catch (error) {
    console.error('Watch history error:', error);
    return jsonResponse({ error: 'Failed to update watch history' }, 500, corsHeaders);
  }
}

async function handleGetWatchHistory(request, env, corsHeaders) {
  try {
    const accessToken = getAuthToken(request);
    if (!accessToken) {
      return jsonResponse({ error: 'Authorization required' }, 401, corsHeaders);
    }
    
    const userInfo = await getUserInfo(accessToken);
    const userId = userInfo.id;
    
    if (!userId) {
      return jsonResponse({ error: 'User not authenticated' }, 401, corsHeaders);
    }
    
    // Get from D1 database
    const { results } = await env.DB.prepare(`
      SELECT item_id, name, timestamp FROM watch_history 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `).bind(userId).all();
    
    return jsonResponse({ watch_history: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get watch history error:', error);
    return jsonResponse({ error: 'Failed to get watch history' }, 500, corsHeaders);
  }
}

// Additional helper functions
function isMediaFile(filename) {
  const name = filename.toLowerCase();
  const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv'];
  const audioExts = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma', '.opus', '.aiff', '.alac'];
  
  return videoExts.some(ext => name.endsWith(ext)) || audioExts.some(ext => name.endsWith(ext));
}

function getMediaType(filename) {
  const name = filename.toLowerCase();
  const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv'];
  const audioExts = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma', '.opus', '.aiff', '.alac'];
  
  if (videoExts.some(ext => name.endsWith(ext))) return 'video';
  if (audioExts.some(ext => name.endsWith(ext))) return 'audio';
  return 'other';
}

// Thumbnail and subtitle handlers (simplified for space)
async function handleGetThumbnail(request, env, corsHeaders) {
  // Implementation similar to streaming but for thumbnails
  return jsonResponse({ error: 'Thumbnail not implemented yet' }, 501, corsHeaders);
}

async function handleGetSubtitles(request, env, corsHeaders) {
  // Implementation for subtitle discovery
  return jsonResponse({ subtitles: [] }, 200, corsHeaders);
}

async function handleGetSubtitleContent(request, env, corsHeaders) {
  // Implementation for subtitle content
  return jsonResponse({ error: 'Subtitle content not implemented yet' }, 501, corsHeaders);
}

// Legacy search endpoint
async function handleLegacySearchFiles(request, env, corsHeaders) {
  return handleSearchFiles(request, env, corsHeaders);
}

// List all files recursively
async function handleListAllFiles(request, env, corsHeaders) {
  // For now, return same as list files to avoid complexity
  return handleListFiles(request, env, corsHeaders);
}