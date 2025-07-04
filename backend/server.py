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
REDIRECT_URI = os.getenv("REDIRECT_URI", "https://545d199c-7f62-4fb6-9975-68d5dab52b92.preview.emergentagent.com/api/auth/callback")

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
        # Ensure scopes is a list and create a new list to avoid any reference issues
        scopes_list = ["Files.ReadWrite.All", "User.Read", "offline_access"]
        logger.info(f"Using scopes: {scopes_list}")
        
        auth_url = msal_app.get_authorization_request_url(
            scopes=scopes_list,
            redirect_uri=REDIRECT_URI
        )
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.get("/api/auth/callback")
async def auth_callback(code: str, state: Optional[str] = None):
    try:
        result = msal_app.acquire_token_by_authorization_code(
            code=code,
            scopes=list(SCOPES),
            redirect_uri=REDIRECT_URI
        )
        
        if "access_token" not in result:
            logger.error(f"Token acquisition failed: {result}")
            # Redirect to frontend with error
            frontend_url = os.getenv("FRONTEND_URL", "https://545d199c-7f62-4fb6-9975-68d5dab52b92.preview.emergentagent.com")
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
        frontend_url = os.getenv("FRONTEND_URL", "https://545d199c-7f62-4fb6-9975-68d5dab52b92.preview.emergentagent.com")
        return RedirectResponse(url=f"{frontend_url}?access_token={result['access_token']}")
        
    except Exception as e:
        logger.error(f"Callback error: {str(e)}")
        frontend_url = os.getenv("FRONTEND_URL", "https://545d199c-7f62-4fb6-9975-68d5dab52b92.preview.emergentagent.com")
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
            
            # Filter for video files
            video_files = []
            for file in files.get("value", []):
                if file.get("file") and file.get("file", {}).get("mimeType"):
                    mime_type = file["file"]["mimeType"]
                    if mime_type.startswith("video/"):
                        video_files.append({
                            "id": file["id"],
                            "name": file["name"],
                            "size": file["size"],
                            "mimeType": mime_type,
                            "downloadUrl": file.get("@microsoft.graph.downloadUrl"),
                            "webUrl": file.get("webUrl"),
                            "thumbnails": file.get("thumbnails", [])
                        })
            
            return {"videos": video_files}
    except Exception as e:
        logger.error(f"List files error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list files")

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
            for file in files.get("value", []):
                if file.get("file") and file.get("file", {}).get("mimeType"):
                    mime_type = file["file"]["mimeType"]
                    if mime_type.startswith("video/"):
                        video_files.append({
                            "id": file["id"],
                            "name": file["name"],
                            "size": file["size"],
                            "mimeType": mime_type,
                            "downloadUrl": file.get("@microsoft.graph.downloadUrl"),
                            "webUrl": file.get("webUrl"),
                            "thumbnails": file.get("thumbnails", [])
                        })
            
            return {"videos": video_files}
    except Exception as e:
        logger.error(f"Search files error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search files")

@app.get("/api/stream/{item_id}")
async def stream_video(item_id: str, authorization: str = Header(...)):
    try:
        access_token = authorization.replace("Bearer ", "")
        
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
            
            # Stream video directly
            async def generate():
                async with httpx.AsyncClient() as stream_client:
                    async with stream_client.stream("GET", download_url) as video_response:
                        async for chunk in video_response.aiter_bytes():
                            yield chunk
            
            return StreamingResponse(
                generate(),
                media_type=file_info.get("file", {}).get("mimeType", "video/mp4"),
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(file_info.get("size", 0))
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

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "OneDrive Netflix API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)