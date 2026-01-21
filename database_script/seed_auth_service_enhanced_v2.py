#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Auth Service Database Seeding Script - Version 2
✅ Uses environment variables instead of hardcoded credentials
✅ Generates realistic image URLs with placeholder services
✅ Improved error handling and logging
"""

import logging
import re
import unicodedata
import psycopg2
from datetime import datetime, timedelta
import random
import json
import os
import sys
import uuid

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))

from database_config import db_config
from image_url_generator import generate_profile_picture_url

# Logging setup
logging.basicConfig(
    level=getattr(logging, db_config.seeding_config['log_level']),
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def to_ascii_slug(text: str) -> str:
    """Convert Unicode text to a lowercase ASCII slug without diacritics.
    Keeps only [a-z0-9] characters.
    """
    if not isinstance(text, str):
        text = str(text)
    # Normalize and remove diacritics
    normalized = unicodedata.normalize('NFKD', text)
    ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
    # Lowercase and keep alphanumerics only
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r'[^a-z0-9]', '', ascii_text)
    # Fallback if empty
    return ascii_text or 'user'

def generate_users_data():
    """Generate comprehensive user data with realistic image URLs"""
    
    # Vietnamese names and realistic data
    first_names = [
        'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Vũ', 'Đặng', 'Bùi',
        'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Mai', 'Trinh', 'Lưu', 'Cao', 'Trương',
        'Phan', 'Tạ', 'Lâm', 'Đinh', 'Tôn', 'Bạch', 'Quách', 'Châu', 'Ông', 'Lục'
    ]
    
    middle_names = [
        'Văn', 'Thị', 'Thành', 'Minh', 'Hoàng', 'Đức', 'Quốc', 'Anh', 'Hải', 'Hữu',
        'Ngọc', 'Thủy', 'Kim', 'Xuân', 'Duy', 'Bảo', 'Khánh', 'Lan', 'Linh', 'My'
    ]
    
    last_names = [
        'An', 'Bình', 'Cao', 'Đức', 'Em', 'Giang', 'Hoa', 'Khải', 'Linh', 'Mai',
        'Nam', 'Oanh', 'Phúc', 'Quang', 'Sơn', 'Tam', 'Uyên', 'Vy', 'Xuân', 'Yến',
        'Bảo', 'Chi', 'Đạt', 'Huy', 'Khoa', 'Long', 'Nhật', 'Phong', 'Quân', 'Tùng'
    ]
    
    departments = [
        'CNTT', 'KTMT', 'KHMT', 'ATTT', 'KTPM', 'TTNT', 'DTPT', 'KTTT', 'CNPM', 'HEHH',
        'KDQT', 'QTKD', 'KTCK', 'TCNH', 'XHKD', 'QLCS', 'TCKT', 'TTQT', 'NVKD', 'QLNN'
    ]
    
    universities = [
        'Đại học Bách khoa Hà Nội',
        'Đại học Quốc gia Hà Nội', 
        'Đại học Kinh tế Quốc dân',
        'Đại học Ngoại thương',
        'Đại học Công nghệ',
        'Đại học Sư phạm Hà Nội',
        'Đại học Y Hà Nội',
        'Đại học Luật Hà Nội'
    ]
    
    interests = [
        'Lập trình', 'Công nghệ', 'Thể thao', 'Âm nhạc', 'Du lịch', 'Đọc sách',
        'Nhiếp ảnh', 'Nấu ăn', 'Phim ảnh', 'Game', 'Nghệ thuật', 'Khoa học',
        'Tình nguyện', 'Kinh doanh', 'Marketing', 'Design', 'Blockchain', 'AI'
    ]
    
    users_data = []
    
    # Generate admin users with realistic profile pictures
    admin_users = [
        {
            'id': str(uuid.uuid4()),
            'email': 'admin@clubsystem.edu.vn',
            'password_hash': '$2b$12$LQv3c1yqBwdVHdDhzXCZl.j8kF9QzMKlGqE3gOQwHzHzFqZyK9tI2',
            'full_name': 'Nguyễn Văn Quân',
            'role': 'admin',
            'phone': '+84901000001',
            'profile_picture_url': generate_profile_picture_url('admin1', 'Nam'),
            'bio': 'Quản trị viên hệ thống quản lý câu lạc bộ sinh viên',
            'date_of_birth': datetime(1990, 1, 15),
            'gender': 'Nam',
            'address': 'Hà Nội, Việt Nam',
            'social_links': json.dumps({'linkedin': 'https://linkedin.com/in/admin-system'}),
            'email_verified': True
        },
        {
            'id': str(uuid.uuid4()),
            'email': 'clubs.admin@clubsystem.edu.vn', 
            'password_hash': '$2b$12$LQv3c1yqBwdVHdDhzXCZl.j8kF9QzMKlGqE3gOQwHzHzFqZyK9tI2',
            'full_name': 'Trần Thị Linh',
            'role': 'admin',
            'phone': '+84901000002',
            'profile_picture_url': generate_profile_picture_url('admin2', 'Nữ'),
            'bio': 'Quản trị viên phụ trách các hoạt động câu lạc bộ',
            'date_of_birth': datetime(1991, 3, 22),
            'gender': 'Nữ',
            'address': 'Hà Nội, Việt Nam',
            'social_links': json.dumps({'linkedin': 'https://linkedin.com/in/clubs-admin'}),
            'email_verified': True
        }
    ]
    
    users_data.extend(admin_users)
    
    # Generate regular users with realistic profile pictures
    batch_size = db_config.seeding_config['batch_size']
    for i in range(1, min(101, batch_size + 1)):  # Respect batch size
        first_name = random.choice(first_names)
        middle_name = random.choice(middle_names)
        last_name = random.choice(last_names)
        
        username_base = f"{last_name.lower()}{first_name.lower()}{i:03d}"
        ascii_username_base = to_ascii_slug(username_base)
        email = f"{ascii_username_base}@student.university.edu.vn"
        
        # Random personal data
        birth_year = random.randint(1999, 2005)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        
        year_of_study = random.randint(1, 4)
        department = random.choice(departments)
        university = random.choice(universities)
        gender = random.choice(['Nam', 'Nữ', 'Khác'])
        
        # Generate full name
        full_name = f"{first_name} {middle_name} {last_name}"
        
        # Generate interests (1-4 interests per user)
        user_interests = random.sample(interests, random.randint(1, 4))
        
        # Generate bio
        bio_templates = [
            f"Sinh viên năm {year_of_study} chuyên ngành {department}. Yêu thích {', '.join(user_interests[:2])}.",
            f"Đam mê {user_interests[0]} và các hoạt động {user_interests[1] if len(user_interests) > 1 else 'tình nguyện'}.",
            f"Học {department} tại {university}. Quan tâm đến {', '.join(user_interests)}.",
            f"Sinh viên năm {year_of_study}, thích khám phá {user_interests[0]} và kết bạn.",
            f"Yêu thích học hỏi và tham gia các hoạt động {user_interests[0]} cùng bạn bè."
        ]
        
        # Create social links
        social_links = {
            'facebook': f"https://facebook.com/{ascii_username_base}",
            'instagram': f"https://instagram.com/{ascii_username_base}"
        }
        if random.random() > 0.7:  # 30% chance to have LinkedIn
            social_links['linkedin'] = f"https://linkedin.com/in/{ascii_username_base}"
        
        # Generate realistic profile picture
        user_id = f"user{i:03d}"
        profile_picture_url = generate_profile_picture_url(user_id, gender)
        
        user_data = {
            'id': str(uuid.uuid4()),
            'email': email,
            'password_hash': '$2b$12$LQv3c1yqBwdVHdDhzXCZl.j8kF9QzMKlGqE3gOQwHzHzFqZyK9tI2',
            'full_name': full_name,
            'role': 'user',
            'phone': f'+8490{random.randint(1000000, 9999999)}',
            'profile_picture_url': profile_picture_url,
            'bio': random.choice(bio_templates),
            'date_of_birth': datetime(birth_year, birth_month, birth_day),
            'gender': gender,
            'address': f"Hà Nội, Việt Nam",
            'social_links': json.dumps(social_links),
            'email_verified': random.choice([True, True, True, False])  # 75% verified
        }
        
        users_data.append(user_data)
    
    return users_data
 
def seed_auth_service():
    """Seed the authentication service with enhanced user data"""
    
    print("Starting Enhanced Auth Service Database Seeding v2...")
    print(f"Target: PostgreSQL Database")
    print(f"Configuration: {db_config.seeding_config}")
    
    # Test database connection first
    print("\nTesting database connection...")
    connection_results = db_config.test_connections()
    if not connection_results['postgresql']:
        print("PostgreSQL connection failed. Please check your configuration.")
        return False
    
    try:
        # Connect to database
        conn = psycopg2.connect(db_config.supabase_url)
        cur = conn.cursor()
        
        print("Connected to PostgreSQL")

        # Create table if not exists (Required for fresh RDS)
        print("Ensuring users table exists...")
        create_table_query = """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user',
            phone VARCHAR(50),
            profile_picture_url TEXT,
            bio TEXT,
            date_of_birth DATE,
            gender VARCHAR(50),
            address TEXT,
            social_links JSONB DEFAULT '{}',
            email_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP WITH TIME ZONE
        );
        """
        cur.execute(create_table_query)
        
        # Clear existing users
        print("Clearing existing users...")
        cur.execute("DELETE FROM users")
        
        # Generate user data
        users_data = generate_users_data()
        print(f"Generated {len(users_data)} users with realistic profile pictures")
        
        # Insert users
        print("Seeding users...")
        insert_query = """
        INSERT INTO users (
            id, email, password_hash, full_name, role, phone, profile_picture_url,
            bio, date_of_birth, gender, address, social_links, email_verified,
            created_at, updated_at
        ) VALUES (
            %(id)s, %(email)s, %(password_hash)s, %(full_name)s, %(role)s, %(phone)s, %(profile_picture_url)s,
            %(bio)s, %(date_of_birth)s, %(gender)s, %(address)s, %(social_links)s, %(email_verified)s,
            NOW(), NOW()
        )
        """
        
        cur.executemany(insert_query, users_data)
        
        # Commit transaction
        conn.commit()
        print("All data committed successfully")
        
        # Verify data
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        print(f"Total users in database: {total_users}")
        
        # Show users by role
        cur.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
        role_counts = cur.fetchall()
        print("Users by role:")
        for role, count in role_counts:
            print(f"   - {role}: {count} users")
        
        # Show verification status
        cur.execute("SELECT email_verified, COUNT(*) FROM users GROUP BY email_verified")
        verification_counts = cur.fetchall()
        print("Email verification status:")
        for verified, count in verification_counts:
            status = "Verified" if verified else "Unverified"
            print(f"   - {status}: {count} users")
        
        # Show gender distribution
        cur.execute("SELECT gender, COUNT(*) FROM users WHERE gender IS NOT NULL GROUP BY gender")
        gender_counts = cur.fetchall()
        print("Users by gender:")
        for gender, count in gender_counts:
            print(f"   - {gender}: {count} users")
        
        # Show sample profile picture URLs
        cur.execute("SELECT full_name, profile_picture_url FROM users LIMIT 3")
        sample_users = cur.fetchall()
        print("Sample profile picture URLs:")
        for name, url in sample_users:
            print(f"   - {name}: {url}")
            
    except Exception as e:
        import traceback
        import sys
        import logging
        error_msg = f"Error: {e}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr)
        logging.error(error_msg)
        return False
    finally:
        try:
            cur.close()
            conn.close()
            print("Database connection closed")
        except:
            pass
    
    return True
 
if __name__ == "__main__":
    success = seed_auth_service()
    if success:
        print("\nSUCCESS: Enhanced auth service v2 completed successfully")
        print("Features:")
        print("   - Environment-based configuration")
        print("   - Realistic profile picture URLs")
        print("   - Improved error handling")
        print("   - Configurable batch sizes")
    else:
        print("\nERROR: Enhanced auth service v2 seeding failed")
        print("Check your .env configuration and database connectivity")
        sys.exit(1)


