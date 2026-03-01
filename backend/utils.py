from datetime import datetime, timedelta
from typing import List
import logging
import random
import string

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

def get_days_until_expiry(expiry_date_str: str) -> int:
    try:
        expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
        if not expiry_date.tzinfo:
            expiry_date = expiry_date.replace(tzinfo=None)
            today = datetime.now()
        else:
            today = datetime.now(expiry_date.tzinfo)
        
        return (expiry_date.date() - today.date()).days
    except Exception as e:
        logger.error(f"Error calculating days until expiry: {e}")
        return 999

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

def send_sms_reminder(phone_number: str, message: str):
    """
    Placeholder function for sending SMS reminders.
    In production, integrate with Twilio, AWS SNS, or other SMS API.
    """
    logger.info(f"[SMS REMINDER] To: {phone_number}")
    logger.info(f"[SMS REMINDER] Message: {message}")
    print(f"\n=== SMS REMINDER ===")
    print(f"To: {phone_number}")
    print(f"Message: {message}")
    print(f"==================\n")

def check_and_send_reminders(vehicles: List[dict]):
    """
    Check all vehicles and send SMS reminders for documents expiring in:
    30, 15, 7, 3, 2, 1 days or already expired
    """
    reminder_days = [30, 15, 7, 3, 2, 1]
    
    for vehicle in vehicles:
        reg_number = vehicle.get('reg_number', 'Unknown')
        documents = vehicle.get('documents', [])
        
        for doc in documents:
            expiry_date_str = doc.get('expiry_date')
            if not expiry_date_str:
                continue
            
            days_left = get_days_until_expiry(expiry_date_str)
            doc_type = doc.get('doc_type', 'Unknown').replace('_', ' ').title()
            
            phone_number = "1234567890"
            
            if days_left < 0:
                message = f"URGENT: {doc_type} for vehicle {reg_number} has EXPIRED on {expiry_date_str}. Please renew immediately."
                send_sms_reminder(phone_number, message)
            elif days_left in reminder_days:
                message = f"REMINDER: {doc_type} for vehicle {reg_number} expires in {days_left} day{'s' if days_left != 1 else ''}. Expiry date: {expiry_date_str}"
                send_sms_reminder(phone_number, message)

def generate_reset_code() -> str:
    """Generate a 6-digit reset code for password reset"""
    return ''.join(random.choices(string.digits, k=6))
