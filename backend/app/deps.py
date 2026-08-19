from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_access_token
from app.db.mongodb import get_db
from app.models.user import Role, UserPublic

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserPublic:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception

    return UserPublic(username=user["username"], full_name=user["full_name"], role=user["role"])


async def require_ta(user: UserPublic = Depends(get_current_user)) -> UserPublic:
    if user.role != Role.ta:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="TA access required")
    return user


async def require_student(user: UserPublic = Depends(get_current_user)) -> UserPublic:
    if user.role != Role.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return user
