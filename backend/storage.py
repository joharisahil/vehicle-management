import requests
import os
import logging

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "garage-pro"

storage_key = None
last_init_time = None

def init_storage():
    global storage_key, last_init_time
    import time
    
    current_time = time.time()
    if storage_key and last_init_time and (current_time - last_init_time) < 3600:
        return storage_key
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        last_init_time = current_time
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        raise

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Put object failed: {e}")
        raise

def get_object(path: str) -> tuple:
    key = init_storage()
    try:
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60
        )
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    except Exception as e:
        logger.error(f"Get object failed: {e}")
        raise
