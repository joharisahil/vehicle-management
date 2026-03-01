from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Query
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import pandas as pd
from io import BytesIO

from models import (
    Vehicle, VehicleCreate, VehicleUpdate, 
    UserCreate, UserLogin, User, Token, DashboardStats,
    DocumentSchema, ForgotPassword, ResetPassword
)
from auth import hash_password, verify_password, create_access_token, get_current_user, security
from storage import init_storage, put_object, get_object
from utils import check_document_status, get_vehicle_status, check_and_send_reminders, generate_reset_code

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    logger.info("Application started - storage will init on first use")
    
    import asyncio
    asyncio.create_task(run_reminder_scheduler())

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token({"sub": user_id, "email": user_data.email})
    user = User(id=user_id, email=user_data.email, name=user_data.name, created_at=user_dict["created_at"])
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token({"sub": user["id"], "email": user["email"]})
    user_obj = User(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "If the email exists, a reset code has been sent"}
    
    reset_code = generate_reset_code()
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "email": data.email,
        "reset_code": reset_code,
        "expiry": expiry.isoformat(),
        "used": False
    })
    
    logger.info(f"[PASSWORD RESET] Email: {data.email}, Code: {reset_code}")
    print(f"\n=== PASSWORD RESET CODE ===")
    print(f"Email: {data.email}")
    print(f"Reset Code: {reset_code}")
    print(f"Valid for: 1 hour")
    print(f"=========================\n")
    
    return {"message": "If the email exists, a reset code has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    reset_record = await db.password_resets.find_one({
        "email": data.email,
        "reset_code": data.reset_code,
        "used": False
    }, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    expiry = datetime.fromisoformat(reset_record["expiry"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    await db.password_resets.update_one(
        {"email": data.email, "reset_code": data.reset_code},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        path = f"garage-pro/uploads/{current_user['id']}/{uuid.uuid4()}.{ext}"
        data = await file.read()
        
        result = put_object(path, data, file.content_type or "application/octet-stream")
        
        file_record = {
            "id": str(uuid.uuid4()),
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": result.get("size", len(data)),
            "user_id": current_user["id"],
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.files.insert_one(file_record)
        
        return {
            "path": result["path"],
            "original_filename": file.filename,
            "size": file_record["size"]
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.get("/files/{path:path}")
async def download_file(
    path: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth: str = Query(None)
):
    try:
        token = credentials.credentials if credentials else auth
        if not token:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        from auth import decode_token
        payload = decode_token(token)
        
        record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
        
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@api_router.get("/vehicles", response_model=list[Vehicle])
async def get_vehicles(current_user: dict = Depends(get_current_user)):
    vehicles = await db.vehicles.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    for vehicle in vehicles:
        vehicle["status"] = get_vehicle_status(vehicle.get("documents", []))
    
    vehicles.sort(key=lambda v: (v["status"] != "expired", v["status"] != "expiring", v.get("created_at", "")))
    
    return vehicles

@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user: dict = Depends(get_current_user)
):
    vehicle_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    vehicle_dict = vehicle_data.model_dump()
    vehicle_dict.update({
        "id": vehicle_id,
        "user_id": current_user["id"],
        "created_at": now,
        "updated_at": now
    })
    
    await db.vehicles.insert_one(vehicle_dict)
    
    return Vehicle(**vehicle_dict)

@api_router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user)
):
    vehicle = await db.vehicles.find_one(
        {"id": vehicle_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle["status"] = get_vehicle_status(vehicle.get("documents", []))
    return Vehicle(**vehicle)

@api_router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleUpdate,
    current_user: dict = Depends(get_current_user)
):
    vehicle = await db.vehicles.find_one(
        {"id": vehicle_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = vehicle_data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.vehicles.update_one(
            {"id": vehicle_id},
            {"$set": update_data}
        )
    
    updated_vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    updated_vehicle["status"] = get_vehicle_status(updated_vehicle.get("documents", []))
    return Vehicle(**updated_vehicle)

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.vehicles.delete_one(
        {"id": vehicle_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    return {"message": "Vehicle deleted successfully"}

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    vehicles = await db.vehicles.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    total_vehicles = len(vehicles)
    expired_count = 0
    expiring_count = 0
    valid_count = 0
    total_challans = 0
    unpaid_challans = 0
    upcoming_services = 0
    
    today = datetime.now().date()
    thirty_days_later = today + timedelta(days=30)
    
    for vehicle in vehicles:
        status = get_vehicle_status(vehicle.get("documents", []))
        if status == "expired":
            expired_count += 1
        elif status == "expiring":
            expiring_count += 1
        else:
            valid_count += 1
        
        challans = vehicle.get("challans", [])
        total_challans += len(challans)
        unpaid_challans += sum(1 for c in challans if c.get("status") == "unpaid")
        
        services = vehicle.get("services", [])
        for service in services:
            next_due = service.get("next_service_due")
            if next_due:
                try:
                    due_date = datetime.fromisoformat(next_due).date()
                    if today <= due_date <= thirty_days_later:
                        upcoming_services += 1
                except:
                    pass
    
    check_and_send_reminders(vehicles)
    
    return DashboardStats(
        total_vehicles=total_vehicles,
        expired_documents=expired_count,
        expiring_soon=expiring_count,
        valid_documents=valid_count,
        total_challans=total_challans,
        unpaid_challans=unpaid_challans,
        upcoming_services=upcoming_services
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

async def run_reminder_scheduler():
    """
    Background task that runs every 24 hours to check and send reminders
    for documents expiring in 30, 15, 7, 3, 2, 1 days or expired
    """
    import asyncio
    logger.info("Reminder scheduler started")
    
    while True:
        try:
            await asyncio.sleep(86400)
            
            logger.info("Running scheduled reminder check...")
            all_vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(10000)
            check_and_send_reminders(all_vehicles)
            logger.info(f"Reminder check completed for {len(all_vehicles)} vehicles")
        except Exception as e:
            logger.error(f"Error in reminder scheduler: {e}")
            await asyncio.sleep(3600)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
