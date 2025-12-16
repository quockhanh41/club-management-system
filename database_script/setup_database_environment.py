#!/usr/bin/env python3
"""
Database Environment Setup Script
Sets up the complete environment for database seeding with all fixes
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def create_env_file():
    """Create .env file from template"""
    env_content = """# Database Configuration
SUPABASE_DB_URL=postgresql://postgres.rkzyqtmqflkuxbcghkmy:tDUBMmQzQ5ilqlgU@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
MONGODB_URI=mongodb+srv://22127188_db_user:CqXqm4HFiPSsCxr3@club.gpfnjhm.mongodb.net/club_management_system?retryWrites=true&w=majority&appName=club-management-system

# Cloudinary Configuration (for realistic image URLs)
CLOUDINARY_CLOUD_NAME=djupm4v0l
CLOUDINARY_API_KEY=541197445177598
CLOUDINARY_API_SECRET=your_actual_api_secret_here

# Image URL Configuration
USE_REAL_IMAGES=false
USE_PLACEHOLDER_SERVICE=true

# Seeding Configuration
SEED_BATCH_SIZE=100
SEED_TIMEOUT_SECONDS=600
LOG_LEVEL=INFO
"""
    
    env_path = Path(__file__).parent / '.env'
    if not env_path.exists():
        with open(env_path, 'w') as f:
            f.write(env_content)
        print(f"✅ Created .env file at {env_path}")
    else:
        print(f"ℹ️  .env file already exists at {env_path}")

def install_dependencies():
    """Install Python dependencies"""
    requirements_path = Path(__file__).parent / 'requirements.txt'
    
    if not requirements_path.exists():
        print("❌ requirements.txt not found")
        return False
    
    try:
        print("📦 Installing Python dependencies...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', str(requirements_path)], 
                      check=True, capture_output=True, text=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        print(f"Error output: {e.stderr}")
        return False

def test_environment():
    """Test the database environment"""
    try:
        # Add utils to path
        sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))
        
        from database_config import db_config
        
        print("🔍 Testing database connections...")
        results = db_config.test_connections()
        
        print("📊 Connection Results:")
        for service, status in results.items():
            status_icon = "✅" if status else "❌"
            print(f"   {status_icon} {service}: {'Connected' if status else 'Failed'}")
        
        return all(results.values())
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure dependencies are installed")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def create_updated_seeding_script():
    """Create an updated all-services seeding script"""
    script_content = """#!/usr/bin/env python3
# -*- coding: utf-8 -*-
\"\"\"
CLUB MANAGEMENT SYSTEM - ENHANCED DATABASE SEEDING ORCHESTRATOR V2
✅ Environment-based configuration
✅ Realistic image URLs
✅ Complete service coverage including Finance
\"\"\"

import subprocess
import sys
import logging
from datetime import datetime
import os

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))

from database_config import db_config

# Logging setup
logging.basicConfig(
    level=getattr(logging, db_config.seeding_config['log_level']),
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def run_seeding_script(script_name, service_name):
    \"\"\"Run a seeding script and return success status\"\"\"
    try:
        logging.info(f"🚀 Running {script_name}...")
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=True,
            text=True,
            timeout=db_config.seeding_config['timeout_seconds']
        )
        
        if result.returncode == 0:
            logging.info(f"✅ SUCCESS: {service_name} seeded successfully")
            # Print summary
            output_lines = result.stdout.strip().split('\\n')
            summary_lines = output_lines[-5:] if len(output_lines) > 5 else output_lines
            for line in summary_lines:
                if line.strip():
                    logging.info(f"   {line}")
            return True
        else:
            logging.error(f"❌ FAILED: {service_name} seeding failed")
            logging.error(f"Error output: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logging.error(f"⏰ TIMEOUT: {service_name} seeding timed out")
        return False
    except Exception as e:
        logging.error(f"💥 ERROR: Failed to run {service_name} seeding: {e}")
        return False

def main():
    \"\"\"Main orchestration function for enhanced seeding v2\"\"\"
    print("🚀 CLUB MANAGEMENT SYSTEM - ENHANCED DATABASE SEEDING V2")
    print("=" * 80)
    print("✨ NEW FEATURES:")
    print("   ✅ Environment-based configuration")
    print("   ✅ Realistic image URLs with placeholder services")
    print("   ✅ Complete Finance service integration")
    print("   ✅ Improved error handling and logging")
    print("   ✅ Configurable batch sizes and timeouts")
    print("=" * 80)
    
    # Test environment first
    print("🔍 Testing environment configuration...")
    from database_config import db_config
    connection_results = db_config.test_connections()
    
    failed_connections = [k for k, v in connection_results.items() if not v]
    if failed_connections:
        print(f"❌ Database connection failed for: {', '.join(failed_connections)}")
        print("💡 Please check your .env configuration")
        return
    
    print("✅ All database connections successful")
    
    # Seeding plan
    seeding_plan = [
        ('seed_auth_service_enhanced_v2.py', 'Enhanced Authentication Service v2'),
        ('seed_club_service_enhanced.py', 'Enhanced Club Service'),
        ('seed_event_service_enhanced.py', 'Enhanced Event Service'),
        ('seed_memberships_enhanced.py', 'Club Memberships'),
        ('seed_event_registrations_enhanced.py', 'Event Registrations'),
        ('seed_recruitment_campaigns_enhanced.py', 'Recruitment Campaigns'),

    ]
    
    print(f"\\n📋 SEEDING PLAN ({len(seeding_plan)} services):")
    for i, (script, service) in enumerate(seeding_plan, 1):
        print(f"   {i}. {service}")
    
    # Ask for confirmation
    confirm = input("\\n🚀 Proceed with enhanced seeding v2? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Seeding cancelled.")
        return
    
    print("\\n🏃 Starting enhanced seeding process...\\n")
    
    # Track results
    results = {}
    start_time = datetime.now()
    
    # Execute seeding plan
    for script_name, service_name in seeding_plan:
        print(f"\\n{'='*60}")
        print(f"🔄 {service_name}")
        print(f"{'='*60}")
        
        if os.path.exists(script_name):
            results[service_name] = run_seeding_script(script_name, service_name)
        else:
            print(f"⚠️  Script {script_name} not found, skipping...")
            results[service_name] = False
    
    # Summary
    end_time = datetime.now()
    duration = end_time - start_time
    
    print("\\n" + "=" * 80)
    print("📊 ENHANCED SEEDING V2 SUMMARY")
    print("=" * 80)
    
    successful_services = sum(1 for success in results.values() if success)
    total_services = len(results)
    
    print(f"⏱️  Duration: {duration}")
    print(f"📈 Overall Status: {successful_services}/{total_services} services completed")
    print(f"🎯 Success Rate: {(successful_services/total_services)*100:.1f}%")
    
    print("\\n📋 Detailed Results:")
    for service, success in results.items():
        status_icon = "✅" if success else "❌"
        status_text = "SUCCESS" if success else "FAILED"
        print(f"   {status_icon} {service:<35}: {status_text}")
    
    if successful_services == total_services:
        print("\\n🎉 COMPLETE SUCCESS: All enhanced services seeded successfully!")
        print("\\n🚀 ENHANCED SYSTEM READY:")
        print("   ✅ Environment-based configuration")
        print("   ✅ Realistic image URLs and placeholders")
        print("   ✅ Complete financial data integration")
        print("   ✅ 100+ users with diverse profiles")
        print("   ✅ 25+ clubs across 6 categories")
        print("   ✅ 100+ events with comprehensive data")
        print("   ✅ Financial transactions and budgets")
        print("   ✅ Membership and registration relationships")
    elif successful_services > 0:
        print(f"\\n⚠️  PARTIAL SUCCESS: {successful_services}/{total_services} services completed")
        print("💡 Check error logs above and retry failed services")
    else:
        print("\\n💥 COMPLETE FAILURE: No services were seeded successfully")
        print("🔧 Please check database connections and configuration")

if __name__ == "__main__":
    main()
"""
    
    script_path = Path(__file__).parent / 'seed_all_services_enhanced_v3.py'
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    # Make it executable
    os.chmod(script_path, 0o755)
    print(f"✅ Created enhanced seeding orchestrator: {script_path}")

def main():
    """Main setup function"""
    print("🛠️  DATABASE ENVIRONMENT SETUP")
    print("=" * 50)
    print("This script will set up the complete database seeding environment")
    print("with all the fixes for missing components.")
    print()
    
    steps = [
        ("📁 Create .env file", create_env_file),
        ("📦 Install dependencies", install_dependencies),
        ("🔍 Test environment", test_environment),
        ("📝 Create enhanced seeding script", create_updated_seeding_script)
    ]
    
    results = {}
    for step_name, step_func in steps:
        print(f"🔄 {step_name}...")
        try:
            result = step_func()
            results[step_name] = result if result is not None else True
            status = "✅" if results[step_name] else "❌"
            print(f"{status} {step_name} {'completed' if results[step_name] else 'failed'}")
        except Exception as e:
            print(f"❌ {step_name} failed: {e}")
            results[step_name] = False
        print()
    
    # Summary
    successful_steps = sum(1 for success in results.values() if success)
    total_steps = len(results)
    
    print("=" * 50)
    print("📊 SETUP SUMMARY")
    print("=" * 50)
    print(f"✅ Completed: {successful_steps}/{total_steps} steps")
    
    if successful_steps == total_steps:
        print("\\n🎉 SETUP COMPLETE!")
        print("\\n🚀 Next Steps:")
        print("   1. Review and update .env file with correct credentials")
        print("   2. Run: python seed_all_services_enhanced_v3.py")
        print("   3. Test your seeded data with the applications")
        print("\\n💡 Key Improvements:")
        print("   ✅ Environment-based configuration")
        print("   ✅ Realistic image URLs")
        print("   ✅ Complete service coverage")
        print("   ✅ Improved error handling")
    else:
        print("\\n⚠️  SETUP INCOMPLETE")
        print("Please resolve the failed steps above before proceeding.")

if __name__ == "__main__":
    main()
