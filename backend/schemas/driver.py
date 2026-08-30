from pydantic import BaseModel, EmailStr
from typing import Optional


class DriverCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    truck_id: Optional[int] = None
    status: str = "AVAILABLE"
    user_id: Optional[int] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    truck_id: Optional[int] = None
    status: Optional[str] = None
    user_id: Optional[int] = None


class DriverResponse(BaseModel):
    driver_id: int
    name: str
    phone: Optional[str]
    truck_id: Optional[int]
    status: str
    user_id: Optional[int]

    class Config:
        from_attributes = True


class DriverLinkUserRequest(BaseModel):
    email: EmailStr