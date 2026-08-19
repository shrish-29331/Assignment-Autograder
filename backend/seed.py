"""
Optional helper to create a demo TA + student account for local testing.

Usage:
    python seed.py

Unlike the original project (which shipped real-looking username/password
pairs and password hashes directly in source control), this script prompts
for passwords interactively, or reads them from environment variables --
nothing sensitive is committed to the repo.
"""
import asyncio
import getpass
import os

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.security import hash_password


async def main() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]

    demo_ta_password = os.environ.get("SEED_TA_PASSWORD") or getpass.getpass("Password for demo TA 'ta_demo': ")
    demo_student_password = os.environ.get("SEED_STUDENT_PASSWORD") or getpass.getpass(
        "Password for demo student 'student_demo': "
    )

    users = [
        {
            "username": "ta_demo",
            "full_name": "Demo TA",
            "role": "ta",
            "hashed_password": hash_password(demo_ta_password),
        },
        {
            "username": "student_demo",
            "full_name": "Demo Student",
            "role": "student",
            "hashed_password": hash_password(demo_student_password),
        },
    ]

    for user in users:
        await db.users.update_one({"username": user["username"]}, {"$set": user}, upsert=True)
        print(f"Upserted user: {user['username']} ({user['role']})")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
