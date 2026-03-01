from datetime import datetime, timedelta
from typing import List
import logging

logger = logging.getLogger(__name__)

def check_document_status(expiry_date_str: str) -> str:
    try:
        expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
        if not expiry_date.tzinfo:
            expiry_date = expiry_date.replace(tzinfo=None)
            today = datetime.now()
        else:
            today = datetime.now(expiry_date.tzinfo)
        
        days_until_expiry = (expiry_date.date() - today.date()).days
        
        if days_until_expiry < 0:
            return "expired"
        elif days_until_expiry <= 30:
            return "expiring"
        else:
            return "valid"
    except Exception as e:
        logger.error(f"Error checking document status: {e}")
        return "unknown"

def get_vehicle_status(documents: List[dict]) -> str:
    if not documents:
        return "valid"
    
    statuses = [check_document_status(doc.get('expiry_date', '')) for doc in documents if doc.get('expiry_date')]
    
    if "expired" in statuses:
        return "expired"
    elif "expiring" in statuses:
        return "expiring"
    else:
        return "valid"

def check_reminders(vehicles: List[dict]):
    for vehicle in vehicles:
        reg_number = vehicle.get('reg_number', 'Unknown')
        documents = vehicle.get('documents', [])
        
        for doc in documents:
            status = check_document_status(doc.get('expiry_date', ''))
            doc_type = doc.get('doc_type', 'Unknown')
            
            if status == "expired":
                logger.info(f"[SMS REMINDER] Vehicle {reg_number}: {doc_type} has EXPIRED on {doc.get('expiry_date')}")
            elif status == "expiring":
                logger.info(f"[SMS REMINDER] Vehicle {reg_number}: {doc_type} expiring soon on {doc.get('expiry_date')}")
