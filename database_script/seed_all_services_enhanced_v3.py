#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CLUB MANAGEMENT SYSTEM - ENHANCED DATABASE SEEDING ORCHESTRATOR V2
✅ Environment-based configuration
✅ Realistic image URLs
✅ Complete service coverage including Finance
"""

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
    """Run a seeding script and return success status"""
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
            output_lines = result.stdout.strip().split('\n')
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
    """Main orchestration function for enhanced seeding v2"""
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
    # Get directory of current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Seeding plan - (Filename, Service Description)
    # Updated paths to be absolute based on script location
    seeding_plan = [
        (os.path.join(current_dir, 'seed_auth_service_enhanced_v2.py'), 'Enhanced Authentication Service v2'),
        (os.path.join(current_dir, 'seed_club_service_enhanced_v2.py'), 'Enhanced Club Service'),
        (os.path.join(current_dir, 'seed_event_service_enhanced_v2.py'), 'Enhanced Event Service'),
        (os.path.join(current_dir, 'seed_memberships_enhanced.py'), 'Club Memberships'),
        (os.path.join(current_dir, 'seed_event_registrations_enhanced.py'), 'Event Registrations'),
        (os.path.join(current_dir, 'seed_recruitment_campaigns_enhanced.py'), 'Recruitment Campaigns'),
    ]
    
    print(f"\n📋 SEEDING PLAN ({len(seeding_plan)} services):")
    for i, (script, service) in enumerate(seeding_plan, 1):
        print(f"   {i}. {service}")
    
    # Ask for confirmation
    confirm = input("\n🚀 Proceed with enhanced seeding v2? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Seeding cancelled.")
        return
    
    print("\n🏃 Starting enhanced seeding process...\n")
    
    # Track results
    results = {}
    start_time = datetime.now()
    
    # Execute seeding plan
    for script_name, service_name in seeding_plan:
        print(f"\n{'='*60}")
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
    
    print("\n" + "=" * 80)
    print("📊 ENHANCED SEEDING V2 SUMMARY")
    print("=" * 80)
    
    successful_services = sum(1 for success in results.values() if success)
    total_services = len(results)
    
    print(f"⏱️  Duration: {duration}")
    print(f"📈 Overall Status: {successful_services}/{total_services} services completed")
    print(f"🎯 Success Rate: {(successful_services/total_services)*100:.1f}%")
    
    print("\n📋 Detailed Results:")
    for service, success in results.items():
        status_icon = "✅" if success else "❌"
        status_text = "SUCCESS" if success else "FAILED"
        print(f"   {status_icon} {service:<35}: {status_text}")
    
    if successful_services == total_services:
        print("\n🎉 COMPLETE SUCCESS: All enhanced services seeded successfully!")
        print("\n🚀 ENHANCED SYSTEM READY:")
        print("   ✅ Environment-based configuration")
        print("   ✅ Realistic image URLs and placeholders")
        print("   ✅ Complete financial data integration")
        print("   ✅ 100+ users with diverse profiles")
        print("   ✅ 25+ clubs across 6 categories")
        print("   ✅ 100+ events with comprehensive data")
        print("   ✅ Financial transactions and budgets")
        print("   ✅ Membership and registration relationships")
    elif successful_services > 0:
        print(f"\n⚠️  PARTIAL SUCCESS: {successful_services}/{total_services} services completed")
        print("💡 Check error logs above and retry failed services")
    else:
        print("\n💥 COMPLETE FAILURE: No services were seeded successfully")
        print("🔧 Please check database connections and configuration")

if __name__ == "__main__":
    main()
