from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RefreshTokenResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access_token, refresh_token = await auth_service.register(
            db, body.email, body.password, body.name
        )
    except ValueError as e:
        if "already registered" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=422, detail=str(e))

    return TokenResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
        ),
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access_token, refresh_token = await auth_service.login(
            db, body.email, body.password
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
        ),
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        access_token, new_refresh_token = await auth_service.refresh(
            db, body.refresh_token
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return RefreshTokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )
