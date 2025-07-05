from fastapi import FastAPI, Request, HTTPException, Header, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from msal import ConfidentialClientApplication
import httpx
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
import json
import asyncio
import logging
import hashlib
import secrets
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OneDrive File Explorer API", version="1.0.0")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash the password (66244?BOy.)
HASHED_PASSWORD = "$2b$12$LNnXJFl19a.qtaWBXYhJXuupU4HlTV75khDbooDKZZsjHXtIgB5D2"  # 66244?BOy.

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
REDIRECT_URI = os.getenv("REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

# MSAL Configuration
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = ["Files.ReadWrite.All", "User.Read", "offline_access"]

msal_app = ConfidentialClientApplication(
    client_id=CLIENT_ID,
    client_credential=CLIENT_SECRET,
    authority=AUTHORITY
)

# Models
class WatchHistory(BaseModel):
    item_id: str
    name: str
    timestamp: Optional[datetime] = None

class UserPreferences(BaseModel):
    theme: str = "dark"
    quality: str = "auto"

class PasswordAuth(BaseModel):
    password: str

class FileItem(BaseModel):
    id: str
    name: str
    type: str  # 'file' or 'folder'
    size: Optional[int] = None
    modified: Optional[datetime] = None
    created: Optional[datetime] = None
    mime_type: Optional[str] = None
    parent_path: Optional[str] = None
    full_path: str
    is_media: bool = False
    media_type: Optional[str] = None  # 'video', 'photo', 'other'
    thumbnail_url: Optional[str] = None
    download_url: Optional[str] = None

class FolderContents(BaseModel):
    current_folder: str
    parent_folder: Optional[str] = None
    breadcrumbs: List[Dict[str, str]] = []
    folders: List[FileItem] = []
    files: List[FileItem] = []
    total_size: int = 0
    folder_count: int = 0
    file_count: int = 0
    media_count: int = 0

# Database connection
@app.on_event("startup")
async def startup_event():
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.mongodb = app.mongodb_client["onedrive_netflix"]
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app, 'mongodb_client'):
        app.mongodb_client.close()

# Authentication endpoints
@app.post("/api/auth/password")
async def authenticate_password(auth: PasswordAuth):
    """Simple password authentication"""
    if pwd_context.verify(auth.password, HASHED_PASSWORD):
        # Generate a simple session token
        session_token = secrets.token_urlsafe(32)
        return {"authenticated": True, "session_token": session_token}
    else:
        raise HTTPException(status_code=401, detail="Invalid password")

@app.get("/api/auth/login")
async def login():
    try:
        # Use minimal scopes to avoid the frozenset issue
        scopes_list = ["Files.ReadWrite.All", "User.Read"]
        logger.info(f"Using scopes: {scopes_list}")
        logger.info(f"Using redirect URI: {REDIRECT_URI}")
        logger.info(f"Using authority: {AUTHORITY}")
        
        auth_url = msal_app.get_authorization_request_url(
            scopes=scopes_list,
            redirect_uri=REDIRECT_URI
        )
        
        logger.info(f"Generated auth URL: {auth_url}")
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.get("/api/auth/callback")
async def auth_callback(code: str, state: Optional[str] = None):
    try:
        result = msal_app.acquire_token_by_authorization_code(
            code=code,
            scopes=["Files.ReadWrite.All", "User.Read"],
            redirect_uri=REDIRECT_URI
        )
        
        if "access_token" not in result:
            logger.error(f"Token acquisition failed: {result}")
            # Redirect to frontend with error
            return RedirectResponse(url=f"{FRONTEND_URL}?error=authentication_failed")
        
        # Store user info in database
        user_info = await get_user_info(result["access_token"])
        user_id = user_info.get("id")
        
        if user_id:
            # Store in MongoDB
            await app.mongodb.users.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "name": user_info.get("displayName"),
                        "email": user_info.get("mail", user_info.get("userPrincipalName")),
                        "last_login": datetime.utcnow()
                    }
                },
                upsert=True
            )
        
        # Redirect to frontend with access token
        return RedirectResponse(url=f"{FRONTEND_URL}?access_token={result['access_token']}")
        
    except Exception as e:
        logger.error(f"Callback error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}?error=callback_failed")

async def get_user_info(access_token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code == 200:
            return response.json()
        return {}

async def get_folder_stats(client: httpx.AsyncClient, access_token: str, folder_id: str) -> dict:
    """Get folder statistics including total size and item counts"""
    try:
        # Get folder contents
        url = f"https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}/children"
        response = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
        
        if response.status_code != 200:
            return {"total_size": 0}
        
        data = response.json()
        items = data.get("value", [])
        total_size = 0
        
        for item in items:
            item_size = item.get("size", 0)
            total_size += item_size
        
        return {"total_size": total_size}
    except Exception as e:
        logger.error(f"Error getting folder stats: {str(e)}")
        return {"total_size": 0}

# File explorer endpoints
@app.get("/api/explorer/browse")
async def browse_folder(folder_id: str = "root", authorization: str = Header(...)):
    """Browse OneDrive folder with file explorer interface"""
    try:
        access_token = authorization.replace("Bearer ", "")
        
        async with httpx.AsyncClient() as client:
            # Get folder contents
            if folder_id == "root":
                url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
            else:
                url = f"https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}/children"
            
            response = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to browse folder")
            
            data = response.json()
            items = data.get("value", [])
            
            # Get folder information for breadcrumbs
            current_folder_info = {}
            if folder_id != "root":
                folder_response = await client.get(
                    f"https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if folder_response.status_code == 200:
                    current_folder_info = folder_response.json()
            
            # Build breadcrumbs
            breadcrumbs = await build_breadcrumbs(client, access_token, current_folder_info)
            
            # Process items
            folders = []
            files = []
            total_size = 0
            folder_count = 0
            file_count = 0
            media_count = 0
            
            # Define supported media types
            video_extensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv']
            photo_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg']
            audio_extensions = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma', '.opus', '.aiff', '.alac']
            video_mime_types = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 
                              'video/webm', 'video/x-matroska', 'video/x-flv', 'video/3gpp', 'video/ogg']
            photo_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 
                              'image/tiff', 'image/svg+xml']
            audio_mime_types = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/ogg', 
                              'audio/aac', 'audio/x-ms-wma', 'audio/opus', 'audio/aiff', 'audio/alac']
            
            for item in items:
                item_name = item.get("name", "").lower()
                item_size = item.get("size", 0)
                total_size += item_size
                
                # Build full path
                current_path = current_folder_info.get("name", "Root") if folder_id != "root" else "Root"
                full_path = f"{current_path}/{item['name']}" if current_path != "Root" else item['name']
                
                if item.get("folder"):
                    # It's a folder
                    folder_count += 1
                    # Get folder statistics
                    folder_stats = await get_folder_stats(client, access_token, item["id"])
                    
                    folders.append(FileItem(
                        id=item["id"],
                        name=item["name"],
                        type="folder",
                        size=folder_stats["total_size"],
                        modified=item.get("lastModifiedDateTime"),
                        created=item.get("createdDateTime"),
                        full_path=full_path,
                        is_media=False
                    ))
                else:
                    # It's a file
                    mime_type = item.get("file", {}).get("mimeType", "")
                    is_video = any(item_name.endswith(ext) for ext in video_extensions) or mime_type in video_mime_types
                    is_photo = any(item_name.endswith(ext) for ext in photo_extensions) or mime_type in photo_mime_types
                    is_audio = any(item_name.endswith(ext) for ext in audio_extensions) or mime_type in audio_mime_types
                    
                    media_type = None
                    if is_video:
                        media_type = "video"
                    elif is_photo:
                        media_type = "photo"
                    elif is_audio:
                        media_type = "audio"
                    else:
                        media_type = "other"
                    
                    files.append(FileItem(
                        id=item["id"],
                        name=item["name"],
                        type="file",
                        size=item_size,
                        modified=item.get("lastModifiedDateTime"),
                        created=item.get("createdDateTime"),
                        mime_type=mime_type,
                        full_path=full_path,
                        is_media=is_video or is_photo or is_audio,
                        media_type=media_type,
                        thumbnail_url=get_thumbnail_url(item),
                        download_url=item.get("@microsoft.graph.downloadUrl")
                    ))
            
            # Sort folders and files by name
            folders.sort(key=lambda x: x.name.lower())
            files.sort(key=lambda x: x.name.lower())
            
            return FolderContents(
                current_folder=current_folder_info.get("name", "Root"),
                parent_folder=current_folder_info.get("parentReference", {}).get("id"),
                breadcrumbs=breadcrumbs,
                folders=folders,
                files=files,
                total_size=total_size
            )
            
    except Exception as e:
        logger.error(f"Browse folder error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to browse folder")

async def build_breadcrumbs(client: httpx.AsyncClient, access_token: str, folder_info: dict) -> List[Dict[str, str]]:
    """Build breadcrumb navigation"""
    breadcrumbs = [{"name": "Root", "id": "root"}]
    
    if not folder_info:
        return breadcrumbs
    
    # Get parent chain
    current = folder_info
    path_items = []
    
    while current and current.get("parentReference"):
        path_items.append({"name": current["name"], "id": current["id"]})
        parent_id = current["parentReference"].get("id")
        
        if parent_id and parent_id != "root":
            try:
                parent_response = await client.get(
                    f"https://graph.microsoft.com/v1.0/me/drive/items/{parent_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if parent_response.status_code == 200:
                    current = parent_response.json()
                else:
                    break
            except:
                break
        else:
            break
    
    # Reverse to get correct order
    path_items.reverse()
    breadcrumbs.extend(path_items)
    
    return breadcrumbs

def get_thumbnail_url(item: dict) -> Optional[str]:
    """Extract thumbnail URL from OneDrive item"""
    thumbnails = item.get("thumbnails", [])
    if thumbnails and len(thumbnails) > 0:
        thumbnail = thumbnails[0]
        if "large" in thumbnail:
            return thumbnail["large"]["url"]
        elif "medium" in thumbnail:
            return thumbnail["medium"]["url"]
        elif "small" in thumbnail:
            return thumbnail["small"]["url"]
    return None

# Streaming endpoint
@app.get("/api/stream/{item_id}")
async def stream_media(item_id: str, request: Request, authorization: str = Header(None), token: str = None, quality: str = None):
    """Stream video or audio files with proper format compatibility and range request support"""
    try:
        # Try to get access token from header first, then from query parameter
        access_token = None
        if authorization:
            access_token = authorization.replace("Bearer ", "")
        elif token:
            access_token = token
        else:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        async with httpx.AsyncClient() as client:
            # Get download URL
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch file info: {response.status_code}")
                raise HTTPException(status_code=404, detail="File not found")
            
            file_info = response.json()
            download_url = file_info.get("@microsoft.graph.downloadUrl")
            
            if not download_url:
                logger.error("No download URL available for file")
                raise HTTPException(status_code=404, detail="Download URL not available")
            
            # Get file size and detect format
            file_size = file_info.get("size", 0)
            file_name = file_info.get("name", "").lower()
            mime_type = file_info.get("file", {}).get("mimeType", "application/octet-stream")
            
            # Enhanced MIME type detection and browser compatibility
            def get_compatible_mime_type(filename, original_mime):
                """Get browser-compatible MIME type with proper MKV handling"""
                if filename.endswith('.mp4'):
                    return "video/mp4"
                elif filename.endswith('.webm'):
                    return "video/webm"
                elif filename.endswith('.mkv'):
                    return "video/x-matroska"
                elif filename.endswith('.avi'):
                    return "video/x-msvideo"
                elif filename.endswith('.mov'):
                    return "video/quicktime"
                elif filename.endswith('.wmv'):
                    return "video/x-ms-wmv"
                elif filename.endswith('.flv'):
                    return "video/x-flv"
                elif filename.endswith('.m4v'):
                    return "video/mp4"
                elif filename.endswith('.3gp'):
                    return "video/3gpp"
                elif filename.endswith('.ogv'):
                    return "video/ogg"
                elif filename.endswith('.mp3'):
                    return "audio/mpeg"
                elif filename.endswith('.wav'):
                    return "audio/wav"
                elif filename.endswith('.flac'):
                    return "audio/flac"
                elif filename.endswith('.m4a'):
                    return "audio/mp4"
                elif filename.endswith('.ogg'):
                    return "audio/ogg"
                elif filename.endswith('.aac'):
                    return "audio/aac"
                elif filename.endswith('.wma'):
                    return "audio/x-ms-wma"
                elif filename.endswith('.opus'):
                    return "audio/opus"
                elif filename.endswith('.aiff'):
                    return "audio/aiff"
                elif filename.endswith('.alac'):
                    return "audio/alac"
                else:
                    return original_mime or "application/octet-stream"
            
            # Get compatible MIME type
            compatible_mime = get_compatible_mime_type(file_name, mime_type)
            
            # Handle range requests for seeking
            range_header = request.headers.get("Range")
            if range_header:
                # Parse range header
                try:
                    range_match = range_header.replace("bytes=", "").split("-")
                    start = int(range_match[0]) if range_match[0] else 0
                    end = int(range_match[1]) if range_match[1] else file_size - 1
                    
                    # Ensure valid range
                    if start >= file_size:
                        start = 0
                    if end >= file_size:
                        end = file_size - 1
                    
                    logger.info(f"Range request: bytes={start}-{end}/{file_size}")
                    
                    # Stream with range
                    async def generate_range():
                        try:
                            async with httpx.AsyncClient(timeout=60.0) as stream_client:
                                range_headers = {"Range": f"bytes={start}-{end}"}
                                async with stream_client.stream("GET", download_url, headers=range_headers) as media_response:
                                    if media_response.status_code not in [200, 206]:
                                        logger.error(f"Range request failed: {media_response.status_code}")
                                        return
                                    
                                    async for chunk in media_response.aiter_bytes(chunk_size=8192):
                                        yield chunk
                        except Exception as e:
                            logger.error(f"Error in range streaming: {str(e)}")
                            return
                    
                    # Enhanced headers for better compatibility
                    response_headers = {
                        "Accept-Ranges": "bytes",
                        "Content-Range": f"bytes {start}-{end}/{file_size}",
                        "Content-Length": str(end - start + 1),
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Range, Content-Type",
                        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
                        "Cache-Control": "public, max-age=3600",
                    }
                    
                    return StreamingResponse(
                        generate_range(),
                        status_code=206,  # Partial Content
                        media_type=compatible_mime,
                        headers=response_headers
                    )
                except (ValueError, IndexError) as e:
                    logger.error(f"Invalid range header: {range_header}, error: {e}")
                    # Fall back to full file streaming
            
            # Stream entire file if no range requested
            async def generate_full():
                try:
                    async with httpx.AsyncClient(timeout=120.0) as stream_client:
                        async with stream_client.stream("GET", download_url) as media_response:
                            if media_response.status_code != 200:
                                logger.error(f"Full file streaming failed: {media_response.status_code}")
                                return
                                
                            async for chunk in media_response.aiter_bytes(chunk_size=8192):
                                yield chunk
                except Exception as e:
                    logger.error(f"Error in full file streaming: {str(e)}")
                    return
            
            # Enhanced headers for full file streaming
            response_headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Range, Content-Type",
                "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
                "Cache-Control": "public, max-age=3600",
            }
            
            return StreamingResponse(
                generate_full(),
                media_type=compatible_mime,
                headers=response_headers
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stream media error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to stream media: {str(e)}")

# User data endpoints
@app.post("/api/watch-history")
async def add_watch_history(
    history: WatchHistory,
    authorization: str = Header(...)
):
    try:
        access_token = authorization.replace("Bearer ", "")
        user_info = await get_user_info(access_token)
        user_id = user_info.get("id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Store in MongoDB
        await app.mongodb.watch_history.insert_one({
            "user_id": user_id,
            "item_id": history.item_id,
            "name": history.name,
            "timestamp": datetime.utcnow()
        })
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Watch history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update watch history")

@app.get("/api/watch-history")
async def get_watch_history(authorization: str = Header(...)):
    try:
        access_token = authorization.replace("Bearer ", "")
        user_info = await get_user_info(access_token)
        user_id = user_info.get("id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get from MongoDB
        cursor = app.mongodb.watch_history.find({"user_id": user_id}).sort("timestamp", -1)
        watch_history = []
        async for doc in cursor:
            watch_history.append({
                "item_id": doc["item_id"],
                "name": doc["name"],
                "timestamp": doc["timestamp"]
            })
        
        return {"watch_history": watch_history}
    except Exception as e:
        logger.error(f"Get watch history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get watch history")

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "OneDrive File Explorer API"}

# Export the app for Vercel
app = app