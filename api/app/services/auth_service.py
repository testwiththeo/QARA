from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.tenant import Tenant
from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "role": user.role,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
        "iat": now,
        "jti": str(uuid.uuid4()),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "exp": now + timedelta(days=settings.jwt_refresh_token_expire_days),
        "iat": now,
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def register(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
) -> tuple[User, str, str]:
    """Register a new user. First user creates tenant + gets admin role."""
    # Check existing
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise ValueError("Email already registered")

    # Check if any tenant exists
    result = await db.execute(select(Tenant).limit(1))
    tenant = result.scalar_one_or_none()

    if tenant is None:
        # First user: create tenant
        tenant = Tenant(name="Default", slug="default", plan="free", settings={})
        db.add(tenant)
        await db.flush()
        role = "admin"
    else:
        role = "qa"

    user = User(
        tenant_id=tenant.id,
        email=email,
        name=name,
        password_hash=hash_password(password),
        role=role,
        preferences={},
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    # Store refresh token hash
    user.refresh_token_hash = hash_token(refresh_token)
    await db.flush()

    return user, access_token, refresh_token


async def login(
    db: AsyncSession,
    email: str,
    password: str,
) -> tuple[User, str, str]:
    """Login with email + password."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    user.refresh_token_hash = hash_token(refresh_token)
    await db.flush()

    return user, access_token, refresh_token


async def refresh(
    db: AsyncSession,
    refresh_token: str,
) -> tuple[str, str]:
    """Refresh access token using refresh token."""
    from jose import JWTError

    try:
        payload = jwt.decode(
            refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = payload.get("sub")
    except JWTError:
        raise ValueError("Invalid refresh token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("User not found")

    if user.refresh_token_hash != hash_token(refresh_token):
        raise ValueError("Refresh token mismatch")

    access_token = create_access_token(user)
    new_refresh_token = create_refresh_token(user)

    user.refresh_token_hash = hash_token(new_refresh_token)
    await db.flush()

    return access_token, new_refresh_token
