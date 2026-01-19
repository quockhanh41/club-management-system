import boto3
import os
import json
from datetime import datetime

ecs = boto3.client('ecs')
rds = boto3.client('rds')

# Get configuration from environment variables
CLUSTER_NAME = os.environ.get('ECS_CLUSTER_NAME')
RDS_INSTANCE = os.environ.get('RDS_INSTANCE_ID')
ECS_SERVICES = os.environ.get('ECS_SERVICES', '').split(',')

def lambda_handler(event, context):
    """
    Lambda function to start/stop staging environment
    Triggered by EventBridge on schedule
    """
    
    action = event.get('action', 'stop')  # 'stop' or 'start'
    
    print(f"=== Staging Environment {action.upper()} ===")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Cluster: {CLUSTER_NAME}")
    print(f"RDS: {RDS_INSTANCE}")
    print(f"Services: {ECS_SERVICES}")
    
    results = {
        'action': action,
        'timestamp': datetime.now().isoformat(),
        'ecs_services': [],
        'rds': None
    }
    
    # 1. Handle ECS Services
    for service_name in ECS_SERVICES:
        if not service_name:
            continue
            
        try:
            desired_count = 1 if action == 'start' else 0
            
            response = ecs.update_service(
                cluster=CLUSTER_NAME,
                service=service_name,
                desiredCount=desired_count
            )
            
            status = 'success'
            message = f"Set desired count to {desired_count}"
            print(f"✅ {action.upper()}: ECS service {service_name} → {desired_count}")
            
        except Exception as e:
            status = 'error'
            message = str(e)
            print(f"❌ Error updating {service_name}: {e}")
        
        results['ecs_services'].append({
            'service': service_name,
            'status': status,
            'message': message
        })
    
    # 2. Handle RDS Instance
    try:
        if action == 'stop':
            # Check if already stopped
            db_status = rds.describe_db_instances(DBInstanceIdentifier=RDS_INSTANCE)
            current_status = db_status['DBInstances'][0]['DBInstanceStatus']
            
            if current_status in ['stopped', 'stopping']:
                print(f"ℹ️  RDS {RDS_INSTANCE} already {current_status}")
                results['rds'] = {
                    'status': 'skipped',
                    'message': f'Already {current_status}'
                }
            else:
                rds.stop_db_instance(DBInstanceIdentifier=RDS_INSTANCE)
                print(f"✅ STOP: RDS {RDS_INSTANCE}")
                results['rds'] = {
                    'status': 'success',
                    'message': 'Stop initiated'
                }
                
        else:  # start
            # Check if already running
            db_status = rds.describe_db_instances(DBInstanceIdentifier=RDS_INSTANCE)
            current_status = db_status['DBInstances'][0]['DBInstanceStatus']
            
            if current_status in ['available', 'starting']:
                print(f"ℹ️  RDS {RDS_INSTANCE} already {current_status}")
                results['rds'] = {
                    'status': 'skipped',
                    'message': f'Already {current_status}'
                }
            else:
                rds.start_db_instance(DBInstanceIdentifier=RDS_INSTANCE)
                print(f"✅ START: RDS {RDS_INSTANCE}")
                results['rds'] = {
                    'status': 'success',
                    'message': 'Start initiated'
                }
    
    except Exception as e:
        print(f"❌ Error with RDS {RDS_INSTANCE}: {e}")
        results['rds'] = {
            'status': 'error',
            'message': str(e)
        }
    
    print(f"\n=== Summary ===")
    print(json.dumps(results, indent=2))
    
    return {
        'statusCode': 200,
        'body': json.dumps(results),
        'action': action,
        'results': results
    }


def test_handler():
    """Test function for local testing"""
    # Test stop
    print("\n>>> Testing STOP action")
    result = lambda_handler({'action': 'stop'}, None)
    print(f"Result: {result['statusCode']}")
    
    # Test start
    print("\n>>> Testing START action")
    result = lambda_handler({'action': 'start'}, None)
    print(f"Result: {result['statusCode']}")


if __name__ == '__main__':
    # For local testing
    os.environ['ECS_CLUSTER_NAME'] = 'staging-club-cluster'
    os.environ['RDS_INSTANCE_ID'] = 'staging-club-auth-db'
    os.environ['ECS_SERVICES'] = 'staging-club-auth,staging-club-rabbitmq'
    
    test_handler()
