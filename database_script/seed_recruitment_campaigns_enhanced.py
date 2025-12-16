#!/usr/bin/env python3
"""
Enhanced Recruitment Campaigns Seeding Script
Generates realistic recruitment campaign data for clubs
Ensures proper ID references and realistic Vietnamese content
"""

import logging
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('seed_recruitment_campaigns.log'),
        logging.StreamHandler()
    ]
)

# Database connection
MONGODB_URI = os.getenv("MONGODB_URI")

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
            'created_by': 1,
            'logo_url': 1
        }))
        
        client.close()
        
        logging.info(f"[SUCCESS] Retrieved {len(clubs)} clubs from MongoDB")
        return clubs
        
    except Exception as e:
        logging.error(f"[FAILED] Error fetching clubs: {e}")
        return []

def generate_campaign_questions(club_category):
    """Generate application questions based on club category using allowed types
    Allowed types: text, textarea, select, checkbox
    """

    base_questions = [
        {
            "id": "personal_intro",
            "question": "Hãy giới thiệu về bản thân bạn",
            "type": "textarea",
            "is_required": True,
            "max_length": 800
        },
        {
            "id": "motivation",
            "question": "Tại sao bạn muốn tham gia câu lạc bộ này?",
            "type": "textarea",
            "is_required": True,
            "max_length": 600
        }
    ]

    category_questions = {
        "Công nghệ": [
            {
                "id": "programming_experience",
                "question": "Bạn có kinh nghiệm lập trình không? Nếu có, hãy chia sẻ.",
                "type": "textarea",
                "is_required": False,
                "max_length": 400
            },
            {
                "id": "tech_interests",
                "question": "Bạn quan tâm đến lĩnh vực công nghệ nào?",
                "type": "checkbox",
                "options": [
                    "Web Development",
                    "Mobile App",
                    "AI/ML",
                    "Data Science",
                    "Cybersecurity",
                    "Game Development"
                ],
                "is_required": True
            }
        ],
        "Thể thao": [
            {
                "id": "sports_experience",
                "question": "Bạn có kinh nghiệm chơi thể thao không?",
                "type": "select",
                "options": [
                    "Chưa bao giờ",
                    "Nghiệp dư",
                    "Bán chuyên nghiệp",
                    "Chuyên nghiệp"
                ],
                "is_required": True
            },
            {
                "id": "preferred_sports",
                "question": "Môn thể thao bạn yêu thích nhất?",
                "type": "text",
                "is_required": True,
                "max_length": 100
            }
        ],
        "Học thuật": [
            {
                "id": "academic_field",
                "question": "Lĩnh vực học thuật bạn quan tâm nhất?",
                "type": "text",
                "is_required": True,
                "max_length": 150
            },
            {
                "id": "research_interest",
                "question": "Bạn có muốn tham gia nghiên cứu không?",
                "type": "select",
                "options": [
                    "Rất muốn",
                    "Có thể",
                    "Chưa chắc chắn",
                    "Không quan tâm"
                ],
                "is_required": False
            }
        ],
        "Nghệ thuật": [
            {
                "id": "art_skills",
                "question": "Bạn có kỹ năng nghệ thuật gì?",
                "type": "checkbox",
                "options": [
                    "Vẽ",
                    "Hát",
                    "Nhảy",
                    "Chơi nhạc cụ",
                    "Nhiếp ảnh",
                    "Thiết kế",
                    "Viết lách"
                ],
                "is_required": False
            },
            {
                "id": "art_portfolio",
                "question": "Bạn có portfolio nghệ thuật không? (Link hoặc mô tả)",
                "type": "textarea",
                "is_required": False,
                "max_length": 300
            }
        ]
    }

    questions = base_questions.copy()
    if club_category in category_questions:
        questions.extend(category_questions[club_category])

    return questions

def generate_campaign_data(clubs):
    """Generate realistic recruitment campaign data"""
    campaigns = []
    
    # Campaign titles by category
    title_templates = {
        "Công nghệ": [
            "Tuyển thành viên Tech Club Kỳ {season}",
            "Mở rộng đội ngũ Developer",
            "Tham gia cộng đồng Lập trình viên",
            "Recruitment Drive - Programming Club"
        ],
        "Thể thao": [
            "Tuyển cầu thủ mùa giải mới",
            "Mở rộng đội hình Sports Club",
            "Tham gia đội tuyển thể thao",
            "Recruitment - Athletic Team"
        ],
        "Học thuật": [
            "Tuyển thành viên nghiên cứu",
            "Mở rộng nhóm học thuật",
            "Tham gia dự án nghiên cứu",
            "Academic Club Recruitment"
        ],
        "Nghệ thuật": [
            "Tuyển nghệ sĩ tài năng",
            "Mở rộng cộng đồng sáng tạo",
            "Tham gia đoàn nghệ thuật",
            "Arts Club Open Recruitment"
        ],
        "Cộng đồng": [
            "Tuyển tình nguyện viên",
            "Mở rộng đội ngũ hoạt động xã hội",
            "Tham gia phục vụ cộng đồng",
            "Community Service Recruitment"
        ],
        "Kinh doanh": [
            "Tuyển thành viên Business Club",
            "Mở rộng mạng lưới kinh doanh",
            "Tham gia dự án khởi nghiệp",
            "Entrepreneurship Club Recruitment"
        ]
    }
    
    # For each club, create 1-2 campaigns
    for club in clubs:
        club_id = club['_id']
        club_name = club['name']
        club_category = club.get('category', 'Khác')
        created_by = club.get('manager', {}).get('user_id') if isinstance(club.get('manager'), dict) else club.get('created_by')
        
        # Determine number of campaigns (70% have 1, 30% have 2)
        num_campaigns = random.choices([1, 2], weights=[0.7, 0.3])[0]
        
        for i in range(num_campaigns):
            # Generate campaign title
            templates = title_templates.get(club_category, title_templates["Cộng đồng"])
            title_template = random.choice(templates)
            
            seasons = ["Xuân", "Hè", "Thu", "Đông"]
            title = title_template.format(
                season=random.choice(seasons),
                club_name=club_name
            )
            
            # Generate description
            descriptions = [
                f"{club_name} đang tìm kiếm những thành viên năng động và nhiệt huyết để cùng phát triển câu lạc bộ. "
                f"Chúng tôi cam kết mang đến môi trường học tập và làm việc chuyên nghiệp, cơ hội networking rộng lớn "
                f"và nhiều hoạt động thú vị trong lĩnh vực {club_category.lower()}.",
                
                f"Bạn đam mê {club_category.lower()}? Hãy tham gia {club_name}! "
                f"Chúng tôi là cộng đồng gồm những người trẻ năng động, luôn sẵn sàng học hỏi và chia sẻ kinh nghiệm. "
                f"Đây là cơ hội tuyệt vời để bạn phát triển kỹ năng và mở rộng mối quan hệ.",
                
                f"{club_name} tự hào là một trong những câu lạc bộ {club_category.lower()} hàng đầu. "
                f"Chúng tôi đang mở rộng đội ngũ với mong muốn tìm kiếm những tài năng mới. "
                f"Nếu bạn có niềm đam mê và mong muốn đóng góp, đây chính là nơi dành cho bạn!"
            ]
            
            description = random.choice(descriptions)
            
            # Generate requirements
            requirements = [
                "Có tinh thần trách nhiệm và làm việc nhóm tốt",
                "Cam kết tham gia hoạt động đều đặn",
                "Có thái độ học hỏi và phát triển bản thân"
            ]
            
            if club_category == "Công nghệ":
                requirements.extend([
                    "Có kiến thức cơ bản về lập trình (ưu tiên)",
                    "Sẵn sàng học hỏi công nghệ mới"
                ])
            elif club_category == "Thể thao":
                requirements.extend([
                    "Có sức khỏe tốt",
                    "Đam mê thể thao và tinh thần thi đấu"
                ])
            elif club_category == "Học thuật":
                requirements.extend([
                    "Có thành tích học tập tốt",
                    "Quan tâm đến nghiên cứu khoa học"
                ])
            
            # Generate time range
            start_date = datetime.utcnow() + timedelta(days=random.randint(-30, 60))
            duration = random.randint(14, 45)  # 2-6 weeks
            end_date = start_date + timedelta(days=duration)
            
            # Generate status
            current_time = datetime.utcnow()
            if start_date > current_time:
                status = random.choices(['draft', 'published'], weights=[0.3, 0.7])[0]
            elif end_date < current_time:
                status = random.choices(['completed', 'archived'], weights=[0.7, 0.3])[0]
            else:
                status = random.choices(['published', 'paused'], weights=[0.9, 0.1])[0]
            
            campaign = {
                '_id': ObjectId(),
                'club_id': club_id,
                'title': title,
                'description': description,
                'requirements': requirements,
                'application_questions': generate_campaign_questions(club_category),
                'start_date': start_date,
                'end_date': end_date,
                'max_applications': random.randint(20, 100),
                'status': status,
                'logo_url': club.get('logo_url') or f"https://picsum.photos/seed/{str(club_id)[:8]}-{i}/300/300",
                'statistics': {
                    'total_applications': 0,
                    'approved_applications': 0,
                    'rejected_applications': 0,
                    'pending_applications': 0,
                    'last_updated': datetime.utcnow()
                },
                'created_by': created_by,
                'created_at': start_date - timedelta(days=random.randint(1, 7)),
                'updated_at': datetime.utcnow()
            }
            
            # Add some statistics for completed campaigns
            if status in ['completed', 'archived']:
                total_apps = random.randint(15, campaign['max_applications'])
                approved = int(total_apps * random.uniform(0.3, 0.7))
                rejected = int(total_apps * random.uniform(0.2, 0.4))
                pending = max(0, total_apps - approved - rejected)
                
                campaign['statistics'] = {
                    'total_applications': total_apps,
                    'approved_applications': approved,
                    'rejected_applications': rejected,
                    'pending_applications': pending,
                    'last_updated': end_date
                }
            
            campaigns.append(campaign)
    
    return campaigns

def seed_recruitment_campaigns():
    """Main function to seed recruitment campaigns collection"""
    try:
        logging.info("[STARTING] Starting enhanced recruitment campaigns seeding...")
        
        # Get existing clubs
        clubs = get_existing_clubs()
        
        if not clubs:
            logging.error("[FAILED] No clubs found. Please seed clubs first.")
            return False
        
        # Generate campaign data
        logging.info("[STATS] Generating recruitment campaign data...")
        campaigns_data = generate_campaign_data(clubs)
        
        # Connect to MongoDB and seed
        client = MongoClient(MONGODB_URI)
        db = client.club_management_system
        
        # Clear existing campaigns
        logging.info("[CLEANING] Clearing existing recruitment campaigns...")
        db.recruitmentcampaigns.delete_many({})
        
        # Insert new campaigns in batches
        batch_size = 25
        logging.info(f"[INSERTING] Inserting {len(campaigns_data)} campaigns in batches of {batch_size}...")
        
        for i in range(0, len(campaigns_data), batch_size):
            batch = campaigns_data[i:i + batch_size]
            result = db.recruitmentcampaigns.insert_many(batch)
            logging.info(f"Inserted batch {i//batch_size + 1}: {len(result.inserted_ids)} campaigns")
        
        # Verify insertion
        total_campaigns = db.recruitmentcampaigns.count_documents({})
        logging.info(f"[SUCCESS] Total campaigns created: {total_campaigns}")
        
        # Generate statistics
        logging.info("\n[SUMMARY] CAMPAIGN STATISTICS:")
        
        # By status
        statuses = db.recruitmentcampaigns.distinct("status")
        for status in statuses:
            count = db.recruitmentcampaigns.count_documents({"status": status})
            logging.info(f"   {status}: {count}")
        
        # By club category
        pipeline = [
            {
                "$lookup": {
                    "from": "clubs",
                    "localField": "club_id",
                    "foreignField": "_id",
                    "as": "club_info"
                }
            },
            {"$unwind": "$club_info"},
            {
                "$group": {
                    "_id": "$club_info.category",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        category_stats = list(db.recruitmentcampaigns.aggregate(pipeline))
        logging.info("\n[STATS] CAMPAIGNS BY CLUB CATEGORY:")
        for stat in category_stats:
            logging.info(f"   {stat['_id']}: {stat['count']} campaigns")
        
        # Active campaigns
        active_count = db.recruitmentcampaigns.count_documents({"status": "published"})
        logging.info(f"\n[ACTIVE] Currently active campaigns: {active_count}")
        
        client.close()
        logging.info("[SUCCESS] Enhanced recruitment campaigns seeding completed successfully!")
        return True
        
    except Exception as e:
        logging.error(f"[FAILED] Error seeding recruitment campaigns: {e}")
        return False

if __name__ == "__main__":
    success = seed_recruitment_campaigns()
    if success:
        print("[COMPLETED] Recruitment campaigns seeding completed successfully!")
    else:
        print("[ERROR] Recruitment campaigns seeding failed!")
        exit(1)
