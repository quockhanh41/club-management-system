#!/usr/bin/env python3
"""
Enhanced Event Registrations Seeding Script
Generates realistic event registration data
Ensures proper ID references between users (PostgreSQL) and events (MongoDB)
"""

import logging
import os
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
import psycopg2
from bson import ObjectId
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('seed_event_registrations.log'),
        logging.StreamHandler()
    ]
)

# Database connections (can be overridden by env vars)
MONGODB_URI = os.getenv("MONGODB_URI")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

def get_existing_users():
    """Fetch existing user IDs and details from PostgreSQL"""
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, email, full_name, phone, gender 
            FROM users 
            WHERE deleted_at IS NULL
            ORDER BY created_at
        """)
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': row[0],
                'email': row[1],
                'full_name': row[2],
                'phone': row[3] or '',
                'gender': row[4] or 'Khác'
            })
        
        cursor.close()
        conn.close()
        
        logging.info(f"[SUCCESS] Retrieved {len(users)} users from PostgreSQL")
        return users
        
    except Exception as e:
        logging.error(f"[FAILED] Error fetching users: {e}")
        return []

def get_existing_events():
    """Fetch existing event IDs and details from MongoDB"""
    try:
        client = MongoClient(MONGODB_URI)
        db = client.club_management_system
        
        events = list(db.events.find({}, {
            '_id': 1, 
            'title': 1, 
            'category': 1,
            'start_date': 1,
            'end_date': 1,
            'max_participants': 1,
            'participation_fee': 1,
            'registration_deadline': 1,
            'status': 1
        }))
        
        client.close()
        
        logging.info(f"[SUCCESS] Retrieved {len(events)} events from MongoDB")
        return events
        
    except Exception as e:
        logging.error(f"[FAILED] Error fetching events: {e}")
        return []

def generate_registration_answers(event_category):
    """Generate realistic registration answers based on event category"""
    
    answers_by_category = {
        "Workshop": [
            "Tôi muốn học thêm kỹ năng mới từ workshop này",
            "Workshop này phù hợp với mục tiêu phát triển nghề nghiệp của tôi",
            "Tôi quan tâm đến chủ đề và muốn trao đổi với các chuyên gia"
        ],
        "Seminar": [
            "Chủ đề seminar rất thú vị và có ích cho công việc",
            "Tôi muốn cập nhật kiến thức mới nhất trong lĩnh vực này",
            "Được nghe chia sẻ từ các diễn giả có kinh nghiệm"
        ],
        "Competition": [
            "Tôi muốn thử thách bản thân trong cuộc thi này",
            "Đây là cơ hội tốt để thể hiện năng lực",
            "Tôi yêu thích tinh thần cạnh tranh và học hỏi"
        ],
        "Social": [
            "Tôi muốn gặp gỡ và kết nối với nhiều bạn mới",
            "Sự kiện xã hội giúp tôi thư giãn sau thời gian học tập",
            "Thích tham gia các hoạt động vui vẻ cùng cộng đồng"
        ],
        "Fundraiser": [
            "Tôi muốn đóng góp cho hoạt động thiện nguyện",
            "Ủng hộ mục đích ý nghĩa của chương trình",
            "Muốn tham gia giúp đỡ cộng đồng"
        ]
    }
    
    special_requirements = [
        "Không có yêu cầu đặc biệt",
        "Cần hỗ trợ dinh dưỡng chay",
        "Có dị ứng với một số loại thực phẩm",
        "Cần hỗ trợ di chuyển",
        "Yêu cầu chỗ ngồi gần sân khấu",
        "Cần bãi đỗ xe gần nhất"
    ]
    
    default_answers = answers_by_category.get(event_category, answers_by_category["Social"])
    
    return {
        "motivation": random.choice(default_answers),
        "special_requirements": random.choice(special_requirements),
        "dietary_preferences": random.choice(["Không", "Chay", "Halal", "Không có sữa", "Không có gluten"])
    }

def generate_emergency_contact():
    """Generate realistic emergency contact information"""
    
    vietnamese_names = [
        "Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Dung",
        "Hoàng Văn Em", "Vũ Thị Phương", "Đặng Văn Giang", "Bùi Thị Hoa",
        "Ngô Văn Inh", "Dương Thị Kim", "Lý Văn Long", "Tô Thị Mai"
    ]
    
    relationships = ["Cha", "Mẹ", "Anh/Chị", "Vợ/Chồng", "Bạn thân", "Người thân"]
    
    return {
        "name": random.choice(vietnamese_names),
        "phone": f"0{random.randint(300000000, 999999999)}",
        "relationship": random.choice(relationships)
    }

def generate_registration_data(users, events):
    """Generate realistic event registration data"""
    registrations = []
    
    # Registration status distribution (aligned with system: registered | attended | cancelled)
    status_weights = {
        'registered': 0.80,
        'cancelled': 0.10,
        'attended': 0.10,
    }
    
    # Payment status distribution (aligned with UI: pending | paid | refunded)
    payment_weights = {
        'paid': 0.60,
        'pending': 0.30,
        'refunded': 0.10,
    }
    
    for event in events:
        event_id = event['_id']
        event_title = event['title']
        event_category = event.get('category', 'Social')
        start_date = event['start_date']
        max_participants = event.get('max_participants', 50)
        participation_fee = event.get('participation_fee', 0)
        registration_deadline = event.get('registration_deadline', start_date)
        event_status = event.get('status', 'published')
        
        # Skip draft or cancelled events
        if event_status in ['draft', 'cancelled']:
            continue
        
        # Determine number of registrations (40-90% of max capacity)
        fill_rate = random.uniform(0.4, 0.9)
        num_registrations = int(max_participants * fill_rate)
        num_registrations = min(num_registrations, len(users))
        
        # Select random users for this event
        event_users = random.sample(users, num_registrations)
        
        for i, user in enumerate(event_users):
            user_id = user['id']
            
            # Determine registration status
            if start_date < datetime.utcnow():  # Past events
                reg_status = random.choices(
                    ['attended', 'registered', 'cancelled'],
                    weights=[0.65, 0.25, 0.10]
                )[0]
            else:  # Future events
                reg_status = random.choices(
                    list(status_weights.keys()),
                    weights=list(status_weights.values())
                )[0]
            
            # Determine payment status
            if participation_fee == 0:
                # For free events, mark as pending by default (UI supports pending/paid/refunded)
                payment_status = 'pending'
            else:
                payment_status = random.choices(
                    list(payment_weights.keys()),
                    weights=list(payment_weights.values())
                )[0]
            
            # Generate registration timestamp
            reg_deadline = registration_deadline or start_date
            try:
                # Calculate days before registration deadline
                time_diff = (reg_deadline - datetime.utcnow())
                max_days = max(1, time_diff.days + 30)  # Ensure positive value
                days_before = random.randint(1, min(30, max_days))
                registered_at = reg_deadline - timedelta(days=days_before)
            except (ValueError, AttributeError):
                # Fallback: random registration time in the past
                days_ago = random.randint(1, 60)
                registered_at = datetime.utcnow() - timedelta(days=days_ago)
            
            # Ensure registered_at is not in future
            if registered_at > datetime.utcnow():
                registered_at = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            
            registration = {
                '_id': ObjectId(),
                'event_id': event_id,
                'user_id': user_id,
                'ticket_id': f"TK-{str(uuid.uuid4())[:8].upper()}",
                'status': reg_status,
                # Enrich with user info to avoid extra lookups in UI/services
                'user_email': user['email'],
                'user_name': user['full_name'],
                'registration_data': {
                    'answers': [generate_registration_answers(event_category)],
                    'special_requirements': generate_registration_answers(event_category).get('special_requirements', ''),
                    'emergency_contact_legacy': f"{generate_emergency_contact()['name']} - {generate_emergency_contact()['phone']}"
                },
                'payment_info': {
                    'amount': participation_fee,
                    'currency': 'VND',
                    'method': random.choice(['credit_card', 'bank_transfer', 'cash', 'digital_wallet']) if participation_fee > 0 else None,
                    'transaction_id': f"TXN-{random.randint(100000, 999999)}" if payment_status == 'paid' else None
                },
                'payment_status': payment_status,
                'payment_reference': f"PAY-{random.randint(1000000, 9999999)}" if payment_status in ['paid', 'refunded'] else None,
                'emergency_contact': generate_emergency_contact(),
                'registered_at': registered_at,
                'created_at': registered_at,
                'updated_at': registered_at
            }
            
            # Add cancellation info if cancelled
            if reg_status == 'cancelled':
                cancelled_at = registered_at + timedelta(days=random.randint(1, 15))
                registration['cancelled_at'] = cancelled_at
                registration['cancellation_reason'] = random.choice([
                    "Có việc đột xuất không thể tham gia",
                    "Thay đổi lịch trình cá nhân",
                    "Vấn đề sức khỏe",
                    "Không phù hợp với nội dung sự kiện",
                    "Lý do tài chính"
                ])
                registration['updated_at'] = cancelled_at
                
                # Refund if was paid
                if payment_status == 'paid':
                    registration['payment_status'] = 'refunded'
            
            registrations.append(registration)
    
    return registrations

def seed_event_registrations():
    """Main function to seed event registrations collection"""
    try:
        logging.info("[STARTING] Starting enhanced event registrations seeding...")
        
        # Get existing data
        users = get_existing_users()
        events = get_existing_events()
        
        if not users:
            logging.error("[FAILED] No users found. Please seed users first.")
            return False
            
        if not events:
            logging.error("[FAILED] No events found. Please seed events first.")
            return False
        
        # Generate registration data
        logging.info("[STATS] Generating event registration data...")
        registrations_data = generate_registration_data(users, events)
        
        # Connect to MongoDB and seed
        client = MongoClient(MONGODB_URI)
        db = client.club_management_system
        
        # Clear existing registrations
        logging.info("[CLEANING] Clearing existing registrations...")
        db.registrations.delete_many({})
        
        # Insert new registrations in batches
        batch_size = 100
        logging.info(f"[INSERTING] Inserting {len(registrations_data)} registrations in batches of {batch_size}...")
        
        for i in range(0, len(registrations_data), batch_size):
            batch = registrations_data[i:i + batch_size]
            result = db.registrations.insert_many(batch)
            logging.info(f"Inserted batch {i//batch_size + 1}: {len(result.inserted_ids)} registrations")
        
        # Verify insertion
        total_registrations = db.registrations.count_documents({})
        logging.info(f"[SUCCESS] Total registrations created: {total_registrations}")
        
        # Generate statistics
        logging.info("\n[SUMMARY] REGISTRATION STATISTICS:")
        
        # By status
        statuses = db.registrations.distinct("status")
        for status in statuses:
            count = db.registrations.count_documents({"status": status})
            logging.info(f"   {status}: {count}")
        
        # By payment status
        payment_statuses = db.registrations.distinct("payment_status")
        logging.info("\n[PAYMENT] PAYMENT STATUS:")
        for status in payment_statuses:
            count = db.registrations.count_documents({"payment_status": status})
            logging.info(f"   {status}: {count}")
        
        # Events with most registrations
        pipeline = [
            {"$group": {"_id": "$event_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_events = list(db.registrations.aggregate(pipeline))
        
        logging.info("\n[TOP] TOP EVENTS BY REGISTRATIONS:")
        for event_stat in top_events:
            event = db.events.find_one({"_id": event_stat["_id"]})
            if event:
                logging.info(f"   {event['title']}: {event_stat['count']} registrations")
        
        # Update event statistics
        logging.info("\n[UPDATING] Updating event statistics...")
        for event in events:
            event_id = event['_id']
            
            total_regs = db.registrations.count_documents({"event_id": event_id})
            confirmed_regs = db.registrations.count_documents({"event_id": event_id, "status": "registered"})
            attended = db.registrations.count_documents({"event_id": event_id, "status": "attended"})
            
            # Update event statistics
            db.events.update_one(
                {"_id": event_id},
                {"$set": {
                    "statistics.total_registrations": total_regs,
                    "statistics.total_attended": attended,
                    "statistics.total_interested": 0  # Will be updated when interests are seeded
                }}
            )
        
        client.close()
        logging.info("[SUCCESS] Enhanced event registrations seeding completed successfully!")
        return True
        
    except Exception as e:
        logging.error(f"[FAILED] Error seeding event registrations: {e}")
        return False

if __name__ == "__main__":
    success = seed_event_registrations()
    if success:
        print("[COMPLETED] Event registrations seeding completed successfully!")
    else:
        print("[ERROR] Event registrations seeding failed!")
        exit(1)
