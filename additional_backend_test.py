#!/usr/bin/env python3
"""
Additional Backend API Testing for ObjectId Serialization Fix
Tests additional POST endpoints to ensure comprehensive fix across all refactored routes.
"""

import requests
import json
from datetime import datetime, timedelta
import uuid

# Base URL from frontend/.env
BASE_URL = "https://calendar-ios.preview.emergentagent.com/api"

# Test credentials
TEST_CREDENTIALS = {
    "email": "admin@company.com", 
    "password": "admin123"
}

def get_auth_headers():
    """Get authentication headers"""
    response = requests.post(f"{BASE_URL}/auth/login", json=TEST_CREDENTIALS)
    if response.status_code == 200:
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    return {}

def test_create_user():
    """Test POST /api/users - user creation"""
    print("👤 Testing User Creation (POST /api/users)...")
    
    headers = get_auth_headers()
    timestamp = int(datetime.now().timestamp())
    
    user_data = {
        "email": f"test{timestamp}@example.com",
        "full_name": f"Test User {timestamp}",
        "role": "user",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"✅ User created successfully: {data.get('email')}")
            return data.get('id')
        except json.JSONDecodeError:
            print(f"❌ JSON decode error: {response.text[:200]}...")
    else:
        print(f"❌ Failed: {response.text[:200]}...")
    return None

def test_create_template():
    """Test POST /api/templates - template creation"""
    print("\n📝 Testing Template Creation (POST /api/templates)...")
    
    headers = get_auth_headers()
    timestamp = int(datetime.now().timestamp())
    
    template_data = {
        "name": f"Test Template {timestamp}",
        "description": "Test template for ObjectId fix verification",
        "template_data": {
            "events": [],
            "calendars": []
        }
    }
    
    response = requests.post(f"{BASE_URL}/templates", json=template_data, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"✅ Template created successfully: {data.get('name')}")
            return data.get('id')
        except json.JSONDecodeError:
            print(f"❌ JSON decode error: {response.text[:200]}...")
    else:
        print(f"❌ Failed: {response.text[:200]}...")
    return None

def test_create_subscription():
    """Test POST /api/subscriptions - subscription creation"""
    print("\n🔗 Testing Subscription Creation (POST /api/subscriptions)...")
    
    headers = get_auth_headers()
    
    # First get an existing calendar to subscribe to
    cal_response = requests.get(f"{BASE_URL}/calendars", headers=headers)
    if cal_response.status_code != 200:
        print("❌ Cannot get calendars for subscription test")
        return None
        
    calendars = cal_response.json()
    if not calendars:
        print("❌ No calendars available for subscription test")
        return None
    
    calendar_id = calendars[0].get('id')
    
    subscription_data = {
        "calendar_id": calendar_id
    }
    
    response = requests.post(f"{BASE_URL}/subscriptions", json=subscription_data, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"✅ Subscription created successfully: {data.get('id')}")
            return data.get('id')
        except json.JSONDecodeError:
            print(f"❌ JSON decode error: {response.text[:200]}...")
    else:
        print(f"❌ Failed: {response.text[:200]}...")
    return None

def main():
    """Main test execution"""
    print("🚀 Additional Backend API Tests for ObjectId Serialization Fix")
    print(f"🌐 Base URL: {BASE_URL}")
    print("="*70)
    
    # Test additional POST endpoints
    results = {}
    
    # Test user creation
    user_id = test_create_user()
    results['user_creation'] = user_id is not None
    
    # Test template creation  
    template_id = test_create_template()
    results['template_creation'] = template_id is not None
    
    # Test subscription creation
    subscription_id = test_create_subscription()
    results['subscription_creation'] = subscription_id is not None
    
    # Summary
    print("\n" + "="*50)
    print("📊 ADDITIONAL TEST RESULTS")
    print("="*50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASSED" if passed_test else "❌ FAILED"
        print(f"{status}: {test_name.replace('_', ' ').title()}")
    
    print(f"\nAdditional Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL ADDITIONAL TESTS PASSED!")
    else:
        print("⚠️ Some additional tests failed")

if __name__ == "__main__":
    main()