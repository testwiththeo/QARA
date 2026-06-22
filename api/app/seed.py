"""Seed default tenant + admin user + sample project."""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.user import User
from app.models.project import Project
from app.services.auth_service import hash_password


async def seed() -> None:
    async with async_session_factory() as session:
        # Check if tenant exists
        result = await session.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()

        if tenant is None:
            tenant = Tenant(
                name="Default",
                slug="default",
                plan="free",
                settings={},
            )
            session.add(tenant)
            await session.flush()
            print(f"Created default tenant: {tenant.id}")
        else:
            print(f"Default tenant already exists: {tenant.id}")

        # Check if admin user exists
        result = await session.execute(select(User).where(User.email == "admin@qara.dev"))
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = User(
                tenant_id=tenant.id,
                email="admin@qara.dev",
                name="Admin",
                password_hash=hash_password("admin123"),
                role="admin",
                preferences={},
            )
            session.add(admin)
            await session.flush()
            print(f"Created admin user: {admin.id}")
        else:
            print(f"Admin user already exists: {admin.id}")

        # Check if sample project exists
        result = await session.execute(
            select(Project).where(Project.tenant_id == tenant.id).limit(1)
        )
        project = result.scalar_one_or_none()

        if project is None:
            project = Project(
                tenant_id=tenant.id,
                name="Sample Project",
                vcs_url="https://github.com/example/sample",
                settings={
                    "auto_create_test_case": True,
                    "auto_assign": True,
                    "triage_model": "ai",
                },
            )
            session.add(project)
            await session.flush()
            print(f"Created sample project: {project.id}")
        else:
            print(f"Sample project already exists: {project.id}")

        await session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
