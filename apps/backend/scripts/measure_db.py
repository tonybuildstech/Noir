import os
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg', 'postgresql')
engine = create_engine(url)

start = time.time()
with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
    print(f"DB Ping: {(time.time() - start) * 1000:.2f}ms")

start = time.time()
with engine.connect() as conn:
    conn.execute(text("SELECT count(*) FROM tags"))
    print(f"Query 1: {(time.time() - start) * 1000:.2f}ms")

start = time.time()
with engine.connect() as conn:
    conn.execute(text("SELECT * FROM profiles LIMIT 1"))
    print(f"Query 2: {(time.time() - start) * 1000:.2f}ms")
