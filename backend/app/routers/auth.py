from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongodb import get_db
from app.deps import get_current_user
from app.models.user import TokenResponse, UserLogin, UserPublic, UserRegister

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"username": payload.username})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    doc = {
        "username": payload.username,
        "full_name": payload.full_name,
        "role": payload.role.value,
        "hashed_password": hash_password(payload.password),
    }
    await db.users.insert_one(doc)

    token = create_access_token(subject=payload.username, role=payload.role.value)
    user = UserPublic(username=payload.username, full_name=payload.full_name, role=payload.role)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"username": payload.username})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(subject=user["username"], role=user["role"])
    public_user = UserPublic(username=user["username"], full_name=user["full_name"], role=user["role"])
    return TokenResponse(access_token=token, user=public_user)


@router.get("/me", response_model=UserPublic)
async def me(current_user: UserPublic = Depends(get_current_user)):
    return current_user
