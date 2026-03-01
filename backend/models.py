from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime, timezone
import re

class DocumentSchema(BaseModel):
    doc_type: str
    issue_date: Optional[str] = None
    expiry_date: str
    image_path: Optional[str] = None
    original_filename: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator('expiry_date', 'issue_date')
    def validate_date_format(cls, v):
        if v and not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('Date must be in YYYY-MM-DD format')
        return v

class VehicleBase(BaseModel):
    nickname: str
    reg_number: str
    vehicle_type: str
    brand: str
    model: str
    year: int
    fuel_type: str
    odometer: int
    
    @field_validator('reg_number')
    def validate_reg_number(cls, v):
        if not re.match(r'^[A-Z0-9\-\s]+$', v.upper()):
            raise ValueError('Invalid registration number format')
        return v.upper()
    
    @field_validator('year')
    def validate_year(cls, v):
        current_year = datetime.now().year
        if v < 1900 or v > current_year + 1:
            raise ValueError(f'Year must be between 1900 and {current_year + 1}')
        return v

class VehicleCreate(VehicleBase):
    documents: List[DocumentSchema] = []

class Vehicle(VehicleBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    documents: List[DocumentSchema] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VehicleUpdate(BaseModel):
    nickname: Optional[str] = None
    reg_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    fuel_type: Optional[str] = None
    odometer: Optional[int] = None
    documents: Optional[List[DocumentSchema]] = None

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    
    @field_validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v.lower()
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class DashboardStats(BaseModel):
    total_vehicles: int
    expired_documents: int
    expiring_soon: int
    valid_documents: int
