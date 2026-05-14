import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

load_dotenv()

url_str = os.getenv('DATABASE_URL')
if not url_str:
    print("DATABASE_URL not found in .env")
    exit(1)

url = make_url(url_str)
sync_url = url.set(drivername='postgresql')
sync_engine = create_engine(sync_url)

with sync_engine.connect() as conn:
    try:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        version = result.scalar()
        print(f"Current Alembic Version in DB: {version}")
    except Exception as e:
        print(f"Error reading alembic_version: {e}")

    try:
        result = conn.execute(text("SELECT name, slug, category FROM tags LIMIT 5"))
        print("\nTags in DB:")
        for row in result:
            print(f"  - {row.name} ({row.slug}) [{row.category}]")
    except Exception as e:
        print(f"\nError reading tags: {e}")
