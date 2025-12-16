#!/usr/bin/env python3
"""
Enhanced Memberships Seeding Script
Generates realistic membership data for club-user relationships
Ensures proper ID references between users (PostgreSQL) and clubs (MongoDB)
"""

import sys
import os
import logging
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
import psycopg2
from bson import ObjectId

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))
from database_config import db_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('seed_memberships.log'),
        logging.StreamHandler()
    ]
)

# Database connections
MONGODB_URI = db_config.club_db_uri
SUPABASE_DB_URL = db_config.supabase_url

def get_existing_users():
    """Fetch existing user IDs and details from PostgreSQL"""
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, email, full_name, role 
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
                'role': row[3]
            })
        
        cursor.close()
        conn.close()
        
        logging.info(f"[SUCCESS] Retrieved {len(users)} users from PostgreSQL")
        return users
        
    except Exception as e:
        logging.error(f"[FAILED] Error fetching users: {e}")
        return []

def get_existing_clubs():
    """Fetch existing club IDs and details from MongoDB"""
    try:
        client = MongoClient(MONGODB_URI)
        db = client.club_management_system
        
        clubs = list(db.clubs.find({}, {
            '_id': 1, 
            'name': 1, 
            'category': 1,
            'manager': 1,
            'created_by': 1
        }))
        
        client.close()
        
        logging.info(f"[SUCCESS] Retrieved {len(clubs)} clubs from MongoDB")
        return clubs
        
    except Exception as e:
        logging.error(f"[FAILED] Error fetching clubs: {e}")
        return []

def get_existing_campaigns():
    """Fetch existing recruitment campaigns from MongoDB club service"""
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        db = client.club_management_system

        campaigns = list(db.recruitmentcampaigns.find(
            {},  # Get all campaigns regardless of status
            {'_id': 1, 'club_id': 1, 'title': 1}
        ))

        client.close()

        logging.info(f"[SUCCESS] Retrieved {len(campaigns)} campaigns from MongoDB")
        return campaigns

    except Exception as e:
        logging.error(f"[FAILED] Error fetching campaigns: {e}")
        return []

def generate_membership_data(users, clubs, campaigns):
    """Generate realistic membership data"""
    memberships = []

    # Create campaign mapping by club_id for easy lookup
    campaigns_by_club = {}
    for campaign in campaigns:
        club_id = campaign['club_id']
        if club_id not in campaigns_by_club:
            campaigns_by_club[club_id] = []
        campaigns_by_club[club_id].append(campaign['_id'])

    # Membership roles and their probabilities
    role_weights = {
        'member': 0.80,      # 80% regular members
        'organizer': 0.15,   # 15% organizers
        'club_manager': 0.05 # 5% club managers
    }
    
    # Status distribution
    status_weights = {
        'active': 0.85,    # 85% active
        'pending': 0.10,   # 10% pending
        'rejected': 0.03,  # 3% rejected
        'removed': 0.02    # 2% removed
    }
    
    user_club_assignments = {}
    
    for club in clubs:
        club_id = club['_id']
        club_name = club['name']
        club_manager_id = club.get('manager', {}).get('user_id') if isinstance(club.get('manager'), dict) else club.get('created_by')
        
        # Determine number of members for this club (5-25 members per club)
        num_members = random.randint(5, min(25, len(users)))
        
        # Select random users for this club
        club_users = random.sample(users, num_members)
        
        # Ensure club manager/creator is a member
        if club_manager_id:
            manager_user = next((u for u in users if u['id'] == club_manager_id), None)
            if manager_user and manager_user not in club_users:
                if len(club_users) < 25:
                    club_users.append(manager_user)
                else:
                    club_users[-1] = manager_user  # Replace last member
        
        for i, user in enumerate(club_users):
            user_id = user['id']
            
            # Prevent duplicate memberships
            if user_id in user_club_assignments:
                if club_id in user_club_assignments[user_id]:
                    continue
            else:
                user_club_assignments[user_id] = set()
            
            user_club_assignments[user_id].add(club_id)
            
            # Determine role
            if user_id == club_manager_id:
                role = 'club_manager'
                status = 'active'
            elif i == 0 and user_id != club_manager_id:  # First member becomes organizer
                role = random.choices(['organizer', 'member'], weights=[0.7, 0.3])[0]
                status = 'active'
            else:
                role = random.choices(
                    list(role_weights.keys()), 
                    weights=list(role_weights.values())
                )[0]
                status = random.choices(
                    list(status_weights.keys()), 
                    weights=list(status_weights.values())
                )[0]
            
            # Generate timestamps
            days_ago = random.randint(1, 365)
            joined_at = datetime.utcnow() - timedelta(days=days_ago)
            
            # Assign campaign_id if available for this club
            campaign_id = None
            if club_id in campaigns_by_club and campaigns_by_club[club_id]:
                # 100% chance of being associated with a campaign
                campaign_id = random.choice(campaigns_by_club[club_id])

            membership = {
                '_id': ObjectId(),
                'club_id': club_id,
                'user_id': user_id,
                'user_email': user['email'],
                'user_full_name': user['full_name'],
                'campaign_id': campaign_id,
                'role': role,
                'status': status,
                'application_message': f"Tôi muốn tham gia {club_name} để học hỏi và đóng góp cho cộng đồng.",
                'application_answers': {},
                'joined_at': joined_at,
                'created_at': joined_at,
                'updated_at': joined_at
            }
            
            # Add approval info for active members
            if status == 'active':
                if club_manager_id:
                    membership['approved_by'] = club_manager_id
                    membership['approved_at'] = joined_at + timedelta(hours=random.randint(1, 48))
            
            # Add removal info for removed members
            elif status == 'removed':
                membership['removed_at'] = joined_at + timedelta(days=random.randint(30, 200))
                membership['removal_reason'] = random.choice([
                    'Vi phạm quy định câu lạc bộ',
                    'Không tham gia hoạt động lâu dài',
                    'Yêu cầu rời khỏi câu lạc bộ'
                ])
            
            memberships.append(membership)
    
    return memberships

def seed_memberships():
    """Main function to seed memberships collection"""
    try:
        logging.info("[STARTING] Starting enhanced memberships seeding...")
        
        # Get existing data
        users = get_existing_users()
        clubs = get_existing_clubs()
        campaigns = get_existing_campaigns()

        if not users:
            logging.error("[FAILED] No users found. Please seed users first.")
            return False
        
        if not clubs:
            logging.error("[FAILED] No clubs found. Please seed clubs first.")
            return False
        
        # Generate membership data
        logging.info("[STATS] Generating membership data...")
        memberships_data = generate_membership_data(users, clubs, campaigns)
        
        # Connect to MongoDB and seed
        client = MongoClient(MONGODB_URI)
        db = client.club_management_system
        
        # Clear existing memberships
        logging.info("[CLEANING] Clearing existing memberships...")
        db.memberships.delete_many({})
        
        # Insert new memberships in batches
        batch_size = 50
        logging.info(f"[INSERTING] Inserting {len(memberships_data)} memberships in batches of {batch_size}...")
        
        for i in range(0, len(memberships_data), batch_size):
            batch = memberships_data[i:i + batch_size]
            result = db.memberships.insert_many(batch)
            logging.info(f"Inserted batch {i//batch_size + 1}: {len(result.inserted_ids)} memberships")
        
        # Verify insertion
        total_memberships = db.memberships.count_documents({})
        logging.info(f"[SUCCESS] Total memberships created: {total_memberships}")
        
        # Generate statistics
        logging.info("\n[SUMMARY] MEMBERSHIP STATISTICS:")
        
        # By role
        roles = db.memberships.distinct("role")
        for role in roles:
            count = db.memberships.count_documents({"role": role})
            logging.info(f"   {role}: {count}")
        
        # By status
        statuses = db.memberships.distinct("status")
        for status in statuses:
            count = db.memberships.count_documents({"status": status})
            logging.info(f"   {status}: {count}")
        
        # Club with most members
        pipeline = [
            {"$match": {"status": "active"}},
            {"$group": {"_id": "$club_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_clubs = list(db.memberships.aggregate(pipeline))
        
        logging.info("\n[TOP] TOP CLUBS BY ACTIVE MEMBERS:")
        for club_stat in top_clubs:
            club = db.clubs.find_one({"_id": club_stat["_id"]})
            if club:
                logging.info(f"   {club['name']}: {club_stat['count']} active members")
        
        # Update club member counts
        logging.info("\n[UPDATING] Updating club member counts...")
        for club in clubs:
            active_count = db.memberships.count_documents({
                "club_id": club['_id'], 
                "status": "active"
            })
            db.clubs.update_one(
                {"_id": club['_id']},
                {"$set": {"member_count": active_count}}
            )
        
        client.close()
        logging.info("[SUCCESS] Enhanced memberships seeding completed successfully!")
        return True
        
    except Exception as e:
        logging.error(f"[FAILED] Error seeding memberships: {e}")
        return False

if __name__ == "__main__":
    success = seed_memberships()
    if success:
        print("[COMPLETED] Memberships seeding completed successfully!")
    else:
        print("[ERROR] Memberships seeding failed!")
        exit(1)
