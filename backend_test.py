#!/usr/bin/env python3
"""
Backend API Testing for ObjectId Serialization Fix
Tests all POST endpoints that were previously broken due to MongoDB ObjectId issues.
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

class APITester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = {}
        
    def login(self):
        """Login and get authentication token"""
        print("🔐 Testing login...")
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=TEST_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            print(f"✅ Login successful, token obtained")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def get_existing_calendar_id(self):
        """Get an existing calendar ID for testing"""
        response = requests.get(f"{BASE_URL}/calendars", headers=self.headers)
        if response.status_code == 200:
            calendars = response.json()
            if calendars and len(calendars) > 0:
                return calendars[0].get('id')
        return None
    
    def test_create_event(self):
        """Test POST /api/events - create event with proper JSON response"""
        print("\n🎯 Testing Event Creation (POST /api/events)...")
        
        # Get an existing calendar ID
        calendar_id = self.get_existing_calendar_id()
        if not calendar_id:
            print("❌ No existing calendar found for event creation test")
            self.test_results["create_event"] = {"status": "FAIL", "error": "No calendar available"}
            return None
        
        print(f"Using existing calendar ID: {calendar_id}")
        
        # Create test event data
        now = datetime.now()
        start_time = now.replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=1)
        
        event_data = {
            "title": "iOS App Test Event",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "calendar_id": calendar_id,
            "description": "Test event for ObjectId serialization fix",
            "status": "confirmed"
        }
        
        response = requests.post(
            f"{BASE_URL}/events",
            json=event_data,
            headers=self.headers
        )
        
        print(f"Event creation status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Event created successfully")
                print(f"Event ID: {data.get('id')}")
                print(f"Event title: {data.get('title')}")
                self.test_results["create_event"] = {
                    "status": "PASS",
                    "event_id": data.get('id'),
                    "data": data
                }
                return data.get('id')
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Response text: {response.text[:200]}...")
                self.test_results["create_event"] = {"status": "FAIL", "error": "JSON decode error"}
                return None
        else:
            print(f"❌ Event creation failed: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            self.test_results["create_event"] = {
                "status": "FAIL", 
                "status_code": response.status_code,
                "response": response.text[:200]
            }
            return None
    
    def test_create_calendar(self):
        """Test POST /api/calendars - create calendar with proper JSON response"""
        print("\n📅 Testing Calendar Creation (POST /api/calendars)...")
        
        calendar_data = {
            "name": "Test iOS Calendar",
            "description": "Test calendar for ObjectId serialization fix",
            "color": "#ff5733",
            "is_public": True
        }
        
        response = requests.post(
            f"{BASE_URL}/calendars",
            json=calendar_data,
            headers=self.headers
        )
        
        print(f"Calendar creation status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Calendar created successfully")
                print(f"Calendar ID: {data.get('id')}")
                print(f"Calendar name: {data.get('name')}")
                self.test_results["create_calendar"] = {
                    "status": "PASS",
                    "calendar_id": data.get('id'),
                    "data": data
                }
                return data.get('id')
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                self.test_results["create_calendar"] = {"status": "FAIL", "error": "JSON decode error"}
                return None
        else:
            print(f"❌ Calendar creation failed: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            self.test_results["create_calendar"] = {
                "status": "FAIL",
                "status_code": response.status_code,
                "response": response.text[:200]
            }
            return None
    
    def test_create_event_type(self):
        """Test POST /api/dictionaries/event-types - create event type with proper JSON response"""
        print("\n🏷️ Testing Event Type Creation (POST /api/dictionaries/event-types)...")
        
        event_type_data = {
            "code": f"ios_test_{int(datetime.now().timestamp())}",
            "name": "iOS Test Type",
            "label": "iOS тестовый тип",
            "color": "#00ff00"
        }
        
        response = requests.post(
            f"{BASE_URL}/dictionaries/event-types",
            json=event_type_data,
            headers=self.headers
        )
        
        print(f"Event type creation status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Event type created successfully")
                print(f"Event type ID: {data.get('id')}")
                print(f"Event type code: {data.get('code')}")
                self.test_results["create_event_type"] = {
                    "status": "PASS",
                    "type_id": data.get('id'),
                    "data": data
                }
                return data.get('id')
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                self.test_results["create_event_type"] = {"status": "FAIL", "error": "JSON decode error"}
                return None
        else:
            print(f"❌ Event type creation failed: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            self.test_results["create_event_type"] = {
                "status": "FAIL",
                "status_code": response.status_code,
                "response": response.text[:200]
            }
            return None
    
    def test_get_events(self):
        """Test GET /api/events - verify events are returned"""
        print("\n📋 Testing Get Events (GET /api/events)...")
        
        response = requests.get(
            f"{BASE_URL}/events",
            headers=self.headers
        )
        
        print(f"Get events status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Events retrieved successfully")
                print(f"Number of events: {len(data)}")
                self.test_results["get_events"] = {"status": "PASS", "count": len(data)}
                return True
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                self.test_results["get_events"] = {"status": "FAIL", "error": "JSON decode error"}
                return False
        else:
            print(f"❌ Get events failed: {response.status_code}")
            self.test_results["get_events"] = {"status": "FAIL", "status_code": response.status_code}
            return False
    
    def test_get_calendars(self):
        """Test GET /api/calendars - verify calendars are returned"""
        print("\n📅 Testing Get Calendars (GET /api/calendars)...")
        
        response = requests.get(
            f"{BASE_URL}/calendars",
            headers=self.headers
        )
        
        print(f"Get calendars status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Calendars retrieved successfully")
                print(f"Number of calendars: {len(data)}")
                self.test_results["get_calendars"] = {"status": "PASS", "count": len(data)}
                return True
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                self.test_results["get_calendars"] = {"status": "FAIL", "error": "JSON decode error"}
                return False
        else:
            print(f"❌ Get calendars failed: {response.status_code}")
            self.test_results["get_calendars"] = {"status": "FAIL", "status_code": response.status_code}
            return False
    
    def test_delete_event(self, event_id):
        """Test DELETE /api/events/{id} - delete test event"""
        if not event_id:
            print("\n🗑️ Skipping Delete Event - no event to delete")
            return
            
        print(f"\n🗑️ Testing Delete Event (DELETE /api/events/{event_id})...")
        
        response = requests.delete(
            f"{BASE_URL}/events/{event_id}",
            headers=self.headers
        )
        
        print(f"Delete event status: {response.status_code}")
        
        if response.status_code in [200, 204]:
            print(f"✅ Event deleted successfully")
            self.test_results["delete_event"] = {"status": "PASS"}
        else:
            print(f"❌ Delete event failed: {response.status_code}")
            self.test_results["delete_event"] = {"status": "FAIL", "status_code": response.status_code}
    
    def test_delete_calendar(self, calendar_id):
        """Test DELETE /api/calendars/{id} - delete test calendar"""
        if not calendar_id:
            print("\n🗑️ Skipping Delete Calendar - no calendar to delete")
            return
            
        print(f"\n🗑️ Testing Delete Calendar (DELETE /api/calendars/{calendar_id})...")
        
        response = requests.delete(
            f"{BASE_URL}/calendars/{calendar_id}",
            headers=self.headers
        )
        
        print(f"Delete calendar status: {response.status_code}")
        
        if response.status_code in [200, 204]:
            print(f"✅ Calendar deleted successfully")
            self.test_results["delete_calendar"] = {"status": "PASS"}
        else:
            print(f"❌ Delete calendar failed: {response.status_code}")
            self.test_results["delete_calendar"] = {"status": "FAIL", "status_code": response.status_code}
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*50)
        print("📊 TEST RESULTS SUMMARY")
        print("="*50)
        
        passed = 0
        total = 0
        
        for test_name, result in self.test_results.items():
            total += 1
            status = result.get("status", "UNKNOWN")
            if status == "PASS":
                passed += 1
                print(f"✅ {test_name.replace('_', ' ').title()}: PASSED")
            else:
                print(f"❌ {test_name.replace('_', ' ').title()}: FAILED")
                if "status_code" in result:
                    print(f"   Status Code: {result['status_code']}")
                if "error" in result:
                    print(f"   Error: {result['error']}")
        
        print(f"\nResults: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - ObjectId serialization fix is working!")
        else:
            print("⚠️ Some tests failed - ObjectId serialization issue may still exist")

def main():
    """Main test execution"""
    print("🚀 Starting Backend API Tests for ObjectId Serialization Fix")
    print(f"🌐 Base URL: {BASE_URL}")
    print("="*60)
    
    tester = APITester()
    
    # Step 1: Login
    if not tester.login():
        print("❌ Cannot proceed without authentication")
        return
    
    # Step 2: Test POST endpoints (the critical ones that were broken)
    event_id = tester.test_create_event()
    calendar_id = tester.test_create_calendar() 
    event_type_id = tester.test_create_event_type()
    
    # Step 3: Test GET endpoints to verify data retrieval
    tester.test_get_events()
    tester.test_get_calendars()
    
    # Step 4: Cleanup - delete test resources
    tester.test_delete_event(event_id)
    tester.test_delete_calendar(calendar_id)
    
    # Step 5: Print summary
    tester.print_summary()

if __name__ == "__main__":
    main()