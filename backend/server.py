from fastapi import FastAPI, Request, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from msal import ConfidentialClientApplication
import httpx
import os
from datetime import datetime
from typing import Optional, List
import json
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OneDrive Netflix API", version="1.0.0")

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
REDIRECT_URI = os.getenv("REDIRECT_URI", "https://f77fb3ea-2f06-4f88-b904-8e2a50ad0eb0.preview.emergentagent.com/api/auth/callback")

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
            frontend_url = os.getenv("FRONTEND_URL", "https://f77fb3ea-2f06-4f88-b904-8e2a50ad0eb0.preview.emergentagent.com")
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
        frontend_url = os.getenv("FRONTEND_URL", "https://f77fb3ea-2f06-4f88-b904-8e2a50ad0eb0.preview.emergentagent.com")
        return RedirectResponse(url=f"{frontend_url}?access_token={result['access_token']}")
        
    except Exception as e:
        logger.error(f"Callback error: {str(e)}")
        frontend_url = os.getenv("FRONTEND_URL", "https://f77fb3ea-2f06-4f88-b904-8e2a50ad0eb0.preview.emergentagent.com")
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

# OneDrive endpoints
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

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "OneDrive Netflix API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)