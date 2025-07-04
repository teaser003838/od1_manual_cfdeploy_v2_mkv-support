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
HASHED_PASSWORD = "$2b$12$wr9kpJmFNI/K3fGfz.zMlOuAqEVYs3AkLh5jj1gDC6SVFT4eEaBAy"  # 66244?BOy.

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "37fb551b-33c1-4dd0-8c16-5ead6f0f2b45")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET", "_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5")
TENANT_ID = os.getenv("AZURE_TENANT_ID", "f2c9e08f-779f-4dd6-9f7b-da627fd90983")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
REDIRECT_URI = os.getenv("REDIRECT_URI", "https://e3f8ff6a-82df-4fcd-a9d6-99a9b22af20f.preview.emergentagent.com/api/auth/callback")

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

# Database connection
@app.on_event("startup")
async def startup_event():
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.mongodb = app.mongodb_client["onedrive_netflix"]
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_event():
    app.mongodb_client.close()

# Authentication endpoints
@app.post("/api/auth/password")
async def authenticate_password(auth: PasswordAuth):
    """Simple password authentication"""
    if pwd_context.verify(auth.password, HASHED_PASSWORD):
        # Generate a simple session token
        session_token = secrets.token_urlsafe(32)
        # In production, store this in a database or cache
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
            frontend_url = os.getenv("FRONTEND_URL", "https://e3f8ff6a-82df-4fcd-a9d6-99a9b22af20f.preview.emergentagent.com")
            return RedirectResponse(url=f"{frontend_url}?error=authentication_failed")
        
        # Store user info in database
        user_info = await get_user_info(result["access_token"])
        user_id = user_info.get("id")
        
        if user_id:
            await app.mongodb["users"].update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "name": user_info.get("displayName"),
                        "email": user_info.get("mail", user_info.get("userPrincipalName")),
                        "last_login": datetime.utcnow()
                    }
                },
                upsert=True
            )
        
        # Redirect to frontend with access token
        frontend_url = os.getenv("FRONTEND_URL", "https://e3f8ff6a-82df-4fcd-a9d6-99a9b22af20f.preview.emergentagent.com")
        return RedirectResponse(url=f"{frontend_url}?access_token={result['access_token']}")
        
    except Exception as e:
        logger.error(f"Callback error: {str(e)}")
        frontend_url = os.getenv("FRONTEND_URL", "https://e3f8ff6a-82df-4fcd-a9d6-99a9b22af20f.preview.emergentagent.com")
        return RedirectResponse(url=f"{frontend_url}?error=callback_failed")

async def get_user_info(access_token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code == 200:
            return response.json()
        return {}

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
                    folders.append(FileItem(
                        id=item["id"],
                        name=item["name"],
                        type="folder",
                        size=item_size,
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
                        is_media=is_video or is_photo,
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
@app.get("/api/explorer/search")
async def search_files(q: str, authorization: str = Header(...)):
    """Search files across entire OneDrive with full path results"""
    try:
        access_token = authorization.replace("Bearer ", "")
        
        async with httpx.AsyncClient() as client:
            # Use Microsoft Graph search
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/root/search(q='{q}')",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Search failed")
            
            data = response.json()
            items = data.get("value", [])
            
            # Process search results
            results = []
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
                
                # Get full path
                full_path = await get_full_path(client, access_token, item)
                
                if item.get("folder"):
                    # It's a folder
                    results.append(FileItem(
                        id=item["id"],
                        name=item["name"],
                        type="folder",
                        size=item.get("size", 0),
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
                    
                    media_type = None
                    if is_video:
                        media_type = "video"
                    elif is_photo:
                        media_type = "photo"
                    else:
                        media_type = "other"
                    
                    results.append(FileItem(
                        id=item["id"],
                        name=item["name"],
                        type="file",
                        size=item.get("size", 0),
                        modified=item.get("lastModifiedDateTime"),
                        created=item.get("createdDateTime"),
                        mime_type=mime_type,
                        full_path=full_path,
                        is_media=is_video or is_photo,
                        media_type=media_type,
                        thumbnail_url=get_thumbnail_url(item),
                        download_url=item.get("@microsoft.graph.downloadUrl")
                    ))
            
            # Sort by name
            results.sort(key=lambda x: x.name.lower())
            
            return {"results": results, "total": len(results)}
            
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Search failed")

async def get_full_path(client: httpx.AsyncClient, access_token: str, item: dict) -> str:
    """Get full path for an item"""
    try:
        path_parts = [item["name"]]
        current = item
        
        while current.get("parentReference") and current["parentReference"].get("id") != "root":
            parent_id = current["parentReference"]["id"]
            parent_response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{parent_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if parent_response.status_code == 200:
                parent = parent_response.json()
                path_parts.append(parent["name"])
                current = parent
            else:
                break
        
        path_parts.reverse()
        return "/".join(path_parts)
    except:
        return item["name"]

# Legacy endpoints for compatibility
@app.get("/api/files")
async def list_files(authorization: str = Header(...)):
    try:
        access_token = authorization.replace("Bearer ", "")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me/drive/root/children",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch files: {response.status_code}")
                raise HTTPException(status_code=400, detail="Failed to fetch files")
            
            files = response.json()
            logger.info(f"Retrieved {len(files.get('value', []))} files from OneDrive")
            
            # Filter for video files
            video_files = []
            video_extensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv']
            video_mime_types = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 
                              'video/webm', 'video/x-matroska', 'video/x-flv', 'video/3gpp', 'video/ogg']
            
            for file in files.get("value", []):
                is_video = False
                file_name = file.get("name", "").lower()
                
                # Check by file extension
                if any(file_name.endswith(ext) for ext in video_extensions):
                    is_video = True
                    logger.info(f"Found video by extension: {file_name}")
                
                # Check by MIME type if available
                if file.get("file") and file.get("file", {}).get("mimeType"):
                    mime_type = file["file"]["mimeType"]
                    if mime_type in video_mime_types or mime_type.startswith("video/"):
                        is_video = True
                        logger.info(f"Found video by MIME type: {file_name} ({mime_type})")
                
                if is_video:
                    video_files.append({
                        "id": file["id"],
                        "name": file["name"],
                        "size": file.get("size", 0),
                        "mimeType": file.get("file", {}).get("mimeType", "video/mp4"),
                        "downloadUrl": file.get("@microsoft.graph.downloadUrl"),
                        "webUrl": file.get("webUrl"),
                        "thumbnails": file.get("thumbnails", [])
                    })
                else:
                    # Log non-video files for debugging
                    logger.info(f"Non-video file: {file_name} (MIME: {file.get('file', {}).get('mimeType', 'N/A')})")
            
            logger.info(f"Found {len(video_files)} video files")
            return {"videos": video_files}
            
    except Exception as e:
        logger.error(f"List files error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list files")

@app.get("/api/files/all")
async def list_all_files(authorization: str = Header(...)):
    """List all video files recursively from all folders"""
    try:
        access_token = authorization.replace("Bearer ", "")
        
        async def get_files_recursive(client, folder_id="root", folder_path="", max_depth=5, current_depth=0):
            """Recursively get all files from a folder and its subfolders with depth limit"""
            all_files = []
            
            # Prevent infinite recursion
            if current_depth > max_depth:
                logger.warning(f"Max depth reached for folder: {folder_path}")
                return all_files
            
            # Get files from current folder
            if folder_id == "root":
                url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
            else:
                url = f"https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}/children"
            
            response = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch files from {folder_path}: {response.status_code}")
                return all_files
            
            files = response.json()
            
            for file in files.get("value", []):
                file_path = f"{folder_path}/{file['name']}" if folder_path else file['name']
                
                if file.get("folder"):
                    # It's a folder, recurse into it
                    logger.info(f"Exploring folder: {file_path} (depth: {current_depth + 1})")
                    subfolder_files = await get_files_recursive(client, file["id"], file_path, max_depth, current_depth + 1)
                    all_files.extend(subfolder_files)
                else:
                    # It's a file, add folder path info
                    file["folder_path"] = folder_path
                    all_files.append(file)
            
            return all_files
        
        async with httpx.AsyncClient(timeout=30.0) as client:  # Add timeout
            all_files = await get_files_recursive(client)
            
            logger.info(f"Retrieved {len(all_files)} total files from OneDrive (including subfolders)")
            
            # Filter for video files
            video_files = []
            video_extensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv']
            video_mime_types = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 
                              'video/webm', 'video/x-matroska', 'video/x-flv', 'video/3gpp', 'video/ogg']
            
            for file in all_files:
                is_video = False
                file_name = file.get("name", "").lower()
                folder_path = file.get("folder_path", "")
                full_path = f"{folder_path}/{file_name}" if folder_path else file_name
                
                # Check by file extension
                if any(file_name.endswith(ext) for ext in video_extensions):
                    is_video = True
                    logger.info(f"Found video by extension: {full_path}")
                
                # Check by MIME type if available
                if file.get("file") and file.get("file", {}).get("mimeType"):
                    mime_type = file["file"]["mimeType"]
                    if mime_type in video_mime_types or mime_type.startswith("video/"):
                        is_video = True
                        logger.info(f"Found video by MIME type: {full_path} ({mime_type})")
                
                if is_video:
                    video_files.append({
                        "id": file["id"],
                        "name": file["name"],
                        "folder_path": folder_path,
                        "full_path": full_path,
                        "size": file.get("size", 0),
                        "mimeType": file.get("file", {}).get("mimeType", "video/mp4"),
                        "downloadUrl": file.get("@microsoft.graph.downloadUrl"),
                        "webUrl": file.get("webUrl"),
                        "thumbnails": file.get("thumbnails", [])
                    })
            
            logger.info(f"Found {len(video_files)} video files total")
            return {"videos": video_files}
            
    except asyncio.TimeoutError:
        logger.error("Timeout while fetching files from OneDrive")
        raise HTTPException(status_code=504, detail="Request timeout - OneDrive has too many files to process")
    except Exception as e:
        logger.error(f"List all files error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list all files")

@app.get("/api/files/search")
async def search_files(q: str, authorization: str = Header(...)):
    try:
        access_token = authorization.replace("Bearer ", "")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/root/search(q='{q}')",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Search failed")
            
            files = response.json()
            
            # Filter for video files
            video_files = []
            video_extensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv']
            video_mime_types = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 
                              'video/webm', 'video/x-matroska', 'video/x-flv', 'video/3gpp', 'video/ogg']
            
            for file in files.get("value", []):
                is_video = False
                file_name = file.get("name", "").lower()
                
                # Check by file extension
                if any(file_name.endswith(ext) for ext in video_extensions):
                    is_video = True
                
                # Check by MIME type if available
                if file.get("file") and file.get("file", {}).get("mimeType"):
                    mime_type = file["file"]["mimeType"]
                    if mime_type in video_mime_types or mime_type.startswith("video/"):
                        is_video = True
                
                if is_video:
                    video_files.append({
                        "id": file["id"],
                        "name": file["name"],
                        "size": file.get("size", 0),
                        "mimeType": file.get("file", {}).get("mimeType", "video/mp4"),
                        "downloadUrl": file.get("@microsoft.graph.downloadUrl"),
                        "webUrl": file.get("webUrl"),
                        "thumbnails": file.get("thumbnails", [])
                    })
            
            return {"videos": video_files}
    except Exception as e:
        logger.error(f"Search files error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search files")

@app.get("/api/stream/{item_id}")
async def stream_video(item_id: str, request: Request, authorization: str = Header(None), token: str = None):
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
                raise HTTPException(status_code=404, detail="File not found")
            
            file_info = response.json()
            download_url = file_info.get("@microsoft.graph.downloadUrl")
            
            if not download_url:
                raise HTTPException(status_code=404, detail="Download URL not available")
            
            # Get file size
            file_size = file_info.get("size", 0)
            
            # Handle range requests for video seeking
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
                    
                    # Stream video with range
                    async def generate_range():
                        async with httpx.AsyncClient() as stream_client:
                            range_headers = {"Range": f"bytes={start}-{end}"}
                            async with stream_client.stream("GET", download_url, headers=range_headers) as video_response:
                                async for chunk in video_response.aiter_bytes():
                                    yield chunk
                    
                    return StreamingResponse(
                        generate_range(),
                        status_code=206,  # Partial Content
                        media_type=file_info.get("file", {}).get("mimeType", "video/mp4"),
                        headers={
                            "Accept-Ranges": "bytes",
                            "Content-Range": f"bytes {start}-{end}/{file_size}",
                            "Content-Length": str(end - start + 1),
                            "Cache-Control": "no-cache"
                        }
                    )
                except (ValueError, IndexError) as e:
                    logger.error(f"Invalid range header: {range_header}, error: {e}")
                    # Fall back to full file streaming
            
            # Stream entire video if no range requested
            async def generate_full():
                async with httpx.AsyncClient() as stream_client:
                    async with stream_client.stream("GET", download_url) as video_response:
                        async for chunk in video_response.aiter_bytes():
                            yield chunk
            
            return StreamingResponse(
                generate_full(),
                media_type=file_info.get("file", {}).get("mimeType", "video/mp4"),
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(file_size),
                    "Cache-Control": "no-cache"
                }
            )
    except Exception as e:
        logger.error(f"Stream video error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to stream video")

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
        
        history.timestamp = datetime.utcnow()
        
        await app.mongodb["users"].update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "watch_history": {
                        "item_id": history.item_id,
                        "name": history.name,
                        "timestamp": history.timestamp
                    }
                }
            },
            upsert=True
        )
        
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
        
        user_data = await app.mongodb["users"].find_one({"user_id": user_id})
        
        if not user_data:
            return {"watch_history": []}
        
        return {"watch_history": user_data.get("watch_history", [])}
    except Exception as e:
        logger.error(f"Get watch history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get watch history")

@app.get("/api/thumbnail/{item_id}")
async def get_video_thumbnail(item_id: str, authorization: str = Header(None), token: str = None):
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
            # Get file info to check for thumbnails
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}?expand=thumbnails",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="File not found")
            
            file_info = response.json()
            
            # Check if thumbnails exist
            thumbnails = file_info.get("thumbnails", [])
            if thumbnails and len(thumbnails) > 0:
                # Return the largest available thumbnail
                thumbnail_sizes = thumbnails[0]
                if "large" in thumbnail_sizes:
                    thumbnail_url = thumbnail_sizes["large"]["url"]
                elif "medium" in thumbnail_sizes:
                    thumbnail_url = thumbnail_sizes["medium"]["url"]
                elif "small" in thumbnail_sizes:
                    thumbnail_url = thumbnail_sizes["small"]["url"]
                else:
                    raise HTTPException(status_code=404, detail="No thumbnail available")
                
                # Fetch and return the thumbnail
                thumb_response = await client.get(thumbnail_url)
                if thumb_response.status_code == 200:
                    return StreamingResponse(
                        iter([thumb_response.content]),
                        media_type="image/jpeg",
                        headers={"Cache-Control": "public, max-age=3600"}
                    )
            
            raise HTTPException(status_code=404, detail="No thumbnail available")
            
    except Exception as e:
        logger.error(f"Get thumbnail error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get thumbnail")

@app.get("/api/subtitles/{item_id}")
async def get_subtitles(item_id: str, authorization: str = Header(None), token: str = None):
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
            # Get file info to find potential subtitle files
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="File not found")
            
            file_info = response.json()
            parent_id = file_info.get("parentReference", {}).get("id")
            
            if not parent_id:
                raise HTTPException(status_code=404, detail="No subtitles found")
            
            # Search for subtitle files in the same directory
            folder_response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{parent_id}/children",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if folder_response.status_code != 200:
                raise HTTPException(status_code=404, detail="No subtitles found")
            
            files = folder_response.json()
            video_name = file_info.get("name", "").lower()
            video_base_name = video_name.rsplit('.', 1)[0] if '.' in video_name else video_name
            
            subtitle_extensions = ['.srt', '.vtt', '.ass', '.ssa', '.sub']
            subtitle_files = []
            
            for file in files.get("value", []):
                file_name = file.get("name", "").lower()
                
                # Check if it's a subtitle file for this video
                if any(file_name.endswith(ext) for ext in subtitle_extensions):
                    file_base_name = file_name.rsplit('.', 1)[0] if '.' in file_name else file_name
                    
                    # Check if subtitle belongs to this video
                    if video_base_name in file_base_name or file_base_name in video_base_name:
                        subtitle_files.append({
                            "id": file["id"],
                            "name": file["name"],
                            "language": extract_language_from_filename(file["name"]),
                            "downloadUrl": file.get("@microsoft.graph.downloadUrl")
                        })
            
            return {"subtitles": subtitle_files}
            
    except Exception as e:
        logger.error(f"Get subtitles error: {str(e)}")
        raise HTTPException(status_code=404, detail="No subtitles found")

def extract_language_from_filename(filename):
    """Extract language code from subtitle filename"""
    filename_lower = filename.lower()
    
    # Common language patterns
    language_patterns = {
        'en': ['english', 'eng', '.en.'],
        'es': ['spanish', 'esp', '.es.'],
        'fr': ['french', 'fra', '.fr.'],
        'de': ['german', 'ger', '.de.'],
        'it': ['italian', 'ita', '.it.'],
        'pt': ['portuguese', 'por', '.pt.'],
        'ru': ['russian', 'rus', '.ru.'],
        'ja': ['japanese', 'jpn', '.ja.'],
        'ko': ['korean', 'kor', '.ko.'],
        'zh': ['chinese', 'chi', '.zh.'],
        'ar': ['arabic', 'ara', '.ar.'],
        'hi': ['hindi', 'hin', '.hi.'],
    }
    
    for lang_code, patterns in language_patterns.items():
        for pattern in patterns:
            if pattern in filename_lower:
                return lang_code
    
    return 'unknown'

@app.get("/api/subtitle-content/{item_id}")
async def get_subtitle_content(item_id: str, authorization: str = Header(None), token: str = None):
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
            # Get subtitle file info
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Subtitle file not found")
            
            file_info = response.json()
            download_url = file_info.get("@microsoft.graph.downloadUrl")
            
            if not download_url:
                raise HTTPException(status_code=404, detail="Download URL not available")
            
            # Download subtitle content
            subtitle_response = await client.get(download_url)
            
            if subtitle_response.status_code == 200:
                content = subtitle_response.text
                
                # Convert SRT to VTT if needed
                if file_info.get("name", "").lower().endswith('.srt'):
                    content = convert_srt_to_vtt(content)
                
                return Response(
                    content=content,
                    media_type="text/vtt",
                    headers={"Cache-Control": "public, max-age=3600"}
                )
            
            raise HTTPException(status_code=404, detail="Subtitle content not available")
            
    except Exception as e:
        logger.error(f"Get subtitle content error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subtitle content")

def convert_srt_to_vtt(srt_content):
    """Convert SRT subtitle format to VTT format"""
    lines = srt_content.strip().split('\n')
    vtt_lines = ['WEBVTT\n']
    
    for line in lines:
        line = line.strip()
        if '-->' in line:
            # Convert timestamp format from SRT to VTT
            line = line.replace(',', '.')
        vtt_lines.append(line)
    
    return '\n'.join(vtt_lines)

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "OneDrive File Explorer API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)