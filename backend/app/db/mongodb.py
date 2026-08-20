"""
Async MongoDB connection using Motor.

Kept MongoDB (as in the original project) but swapped the sync `pymongo`
client + hardcoded connection string for an async `motor` client configured
via environment variables, with proper indexes created on startup.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

settings = get_settings()


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


database = Database()


async def connect_to_mongo() -> None:
    database.client = AsyncIOMotorClient(settings.mongo_uri)
    database.db = database.client[settings.mongo_db_name]

    # Indexes -- created idempotently on every startup
    await database.db.users.create_index("username", unique=True)
    await database.db.assignments.create_index("created_by")
    await database.db.submissions.create_index([("assignment_id", 1), ("student_username", 1)])
    await database.db.submissions.create_index("assignment_id")
    await database.db.submissions.create_index(
        [("assignment_id", 1), ("student_username", 1), ("content_hash", 1)]
    )
    await database.db.plagiarism_cases.create_index(
        [("assignment_id", 1), ("submission_id_a", 1), ("submission_id_b", 1)],
        unique=True,
    )
    await database.db.plagiarism_cases.create_index(
        [("student_a", 1), ("student_b", 1), ("flagged", 1)]
    )


async def close_mongo_connection() -> None:
    if database.client:
        database.client.close()


def get_db() -> AsyncIOMotorDatabase:
    assert database.db is not None, "Database not initialized yet"
    return database.db
