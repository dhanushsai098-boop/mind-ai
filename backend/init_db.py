import time
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db.session import engine, Base
from app.db import models  # noqa: F401  (ensures models are registered on Base)


def wait_for_db(max_retries: int = 10, delay_seconds: int = 3):
    print("Connecting to database...")
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Successfully connected to database.")
            return
        except OperationalError as e:
            if attempt == max_retries:
                print(f"Failed to connect to database after {max_retries} attempts.")
                raise e
            print(f"Database not ready yet (attempt {attempt}/{max_retries}). Retrying in {delay_seconds}s...")
            time.sleep(delay_seconds)


def main():
    wait_for_db()
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        print("pgvector extension enabled or already present.")
    except Exception as e:
        print(f"Notice: pgvector extension could not be enabled ({e}). Proceeding with table creation.")

    Base.metadata.create_all(bind=engine)
    print("Database initialized (all tables verified/created).")


if __name__ == "__main__":
    main()
