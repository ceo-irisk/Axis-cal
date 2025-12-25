#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class ExecutiveCalendarAPITester:
    def __init__(self, base_url: str = "https://execalendaro.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_event_id = None
        self.created_user_id = None
        self.created_template_id = None
        self.created_rule_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '/', auth_required=False)
        self.log_test("Health - Root endpoint", success, 
                     "" if success else f"Status check failed: {data}")
        
        # Test health endpoint
        success, data = self.make_request('GET', '/health', auth_required=False)
        self.log_test("Health - Health endpoint", success,
                     "" if success else f"Health check failed: {data}")

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test login with admin credentials
        login_data = {
            "email": "admin@company.com",
            "password": "Admin123!"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data, 
                                        auth_required=False)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data.get('user', {}).get('id')
            self.log_test("Auth - Admin login", True)
            
            # Test /auth/me endpoint
            success, me_data = self.make_request('GET', '/auth/me')
            self.log_test("Auth - Get current user", success,
                         "" if success else f"Failed to get user info: {me_data}")
        else:
            self.log_test("Auth - Admin login", False, 
                         f"Login failed: {data}")
            return False
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        success, data = self.make_request('POST', '/auth/login', invalid_login, 
                                        expected_status=401, auth_required=False)
        self.log_test("Auth - Invalid login rejection", success,
                     "" if success else f"Should have rejected invalid login: {data}")
        
        return True

    def test_events(self):
        """Test event management endpoints"""
        print("\n🔍 Testing Event Management...")
        
        # Test get events
        success, data = self.make_request('GET', '/events')
        self.log_test("Events - Get events list", success,
                     "" if success else f"Failed to get events: {data}")
        
        # Test create event
        tomorrow = datetime.now() + timedelta(days=1)
        event_data = {
            "title": "Test Meeting",
            "description": "Test event description",
            "start_time": tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=11, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Test Office",
            "attendees": ["test@example.com"]
        }
        
        success, data = self.make_request('POST', '/events', event_data, expected_status=200)
        if success and 'id' in data:
            self.created_event_id = data['id']
            self.log_test("Events - Create event", True)
            
            # Test get specific event
            success, event_data = self.make_request('GET', f'/events/{self.created_event_id}')
            self.log_test("Events - Get specific event", success,
                         "" if success else f"Failed to get event: {event_data}")
            
            # Test update event
            update_data = {
                "title": "Updated Test Meeting",
                "description": "Updated description",
                "start_time": tomorrow.replace(hour=14, minute=0, second=0, microsecond=0).isoformat(),
                "end_time": tomorrow.replace(hour=15, minute=0, second=0, microsecond=0).isoformat(),
                "event_type": "call",
                "status": "tentative",
                "location": "Zoom",
                "attendees": ["updated@example.com"]
            }
            
            success, data = self.make_request('PUT', f'/events/{self.created_event_id}', update_data)
            self.log_test("Events - Update event", success,
                         "" if success else f"Failed to update event: {data}")
            
        else:
            self.log_test("Events - Create event", False, f"Failed to create event: {data}")

    def test_day_ratings(self):
        """Test day rating functionality"""
        print("\n🔍 Testing Day Ratings...")
        
        # Test create/update rating (uses query parameters)
        today = datetime.now().strftime('%Y-%m-%d')
        
        success, data = self.make_request('POST', f'/ratings?rating=4&date={today}&notes=Good productive day')
        self.log_test("Ratings - Create day rating", success,
                     "" if success else f"Failed to create rating: {data}")
        
        # Test get ratings
        success, data = self.make_request('GET', '/ratings')
        self.log_test("Ratings - Get ratings list", success,
                     "" if success else f"Failed to get ratings: {data}")
        
        # Test get specific date rating
        success, data = self.make_request('GET', f'/ratings/{today}')
        self.log_test("Ratings - Get specific date rating", success,
                     "" if success else f"Failed to get date rating: {data}")

    def test_survey_functionality(self):
        """Test survey questions and responses"""
        print("\n🔍 Testing Survey Functionality...")
        
        # Test get survey questions
        success, data = self.make_request('GET', '/survey/questions')
        self.log_test("Survey - Get questions", success,
                     "" if success else f"Failed to get questions: {data}")
        
        # Test submit survey response (date as query param, responses as body)
        today = datetime.now().strftime('%Y-%m-%d')
        response_data = {
            "productivity": "4",
            "completed_tasks": "Finished project review",
            "improvements": "Better time management"
        }
        
        success, data = self.make_request('POST', f'/survey/responses?date={today}', response_data)
        self.log_test("Survey - Submit response", success,
                     "" if success else f"Failed to submit response: {data}")
        
        # Test get survey responses
        success, data = self.make_request('GET', '/survey/responses')
        self.log_test("Survey - Get responses", success,
                     "" if success else f"Failed to get responses: {data}")

    def test_rules_functionality(self):
        """Test day rules functionality"""
        print("\n🔍 Testing Rules Functionality...")
        
        # Test get rules
        success, data = self.make_request('GET', '/rules')
        self.log_test("Rules - Get rules list", success,
                     "" if success else f"Failed to get rules: {data}")
        
        # Test check day rules
        today = datetime.now().strftime('%Y-%m-%d')
        success, data = self.make_request('GET', f'/rules/check/{today}')
        self.log_test("Rules - Check day rules", success,
                     "" if success else f"Failed to check rules: {data}")

    def test_admin_functionality(self):
        """Test admin-only functionality"""
        print("\n🔍 Testing Admin Functionality...")
        
        # Test get users (admin only)
        success, data = self.make_request('GET', '/users')
        self.log_test("Admin - Get users list", success,
                     "" if success else f"Failed to get users: {data}")
        
        # Test create user (admin only)
        user_data = {
            "email": f"test.user.{datetime.now().strftime('%H%M%S')}@company.com",
            "name": "Test User",
            "password": "TestPass123!",
            "role": "assistant",
            "timezone": "Europe/Moscow"
        }
        
        success, data = self.make_request('POST', '/users', user_data, expected_status=200)
        if success and 'id' in data:
            self.created_user_id = data['id']
            self.log_test("Admin - Create user", True)
            
            # Test get specific user
            success, user_data = self.make_request('GET', f'/users/{self.created_user_id}')
            self.log_test("Admin - Get specific user", success,
                         "" if success else f"Failed to get user: {user_data}")
            
            # Test toggle user active status
            success, data = self.make_request('PATCH', f'/users/{self.created_user_id}/toggle-active')
            self.log_test("Admin - Toggle user active", success,
                         "" if success else f"Failed to toggle user: {data}")
            
        else:
            self.log_test("Admin - Create user", False, f"Failed to create user: {data}")
        
        # Test create survey question (admin only)
        success, data = self.make_request('POST', '/survey/questions', {
            "question": "How was your focus today?",
            "question_type": "scale",
            "options": ["1", "2", "3", "4", "5"]
        })
        self.log_test("Admin - Create survey question", success,
                     "" if success else f"Failed to create question: {data}")

    def test_templates_functionality(self):
        """Test templates functionality"""
        print("\n🔍 Testing Templates Functionality...")
        
        # Test get templates
        success, data = self.make_request('GET', '/templates')
        self.log_test("Templates - Get templates list", success,
                     "" if success else f"Failed to get templates: {data}")
        
        # Test create template
        template_data = {
            "name": "Daily Standup Template",
            "template_type": "day",
            "events": [
                {
                    "title": "Daily Standup",
                    "start_hour": 9,
                    "start_minute": 0,
                    "end_hour": 9,
                    "end_minute": 30,
                    "event_type": "meeting",
                    "status": "confirmed"
                }
            ],
            "is_active": True
        }
        
        success, data = self.make_request('POST', '/templates', template_data)
        if success and 'id' in data:
            self.created_template_id = data['id']
            self.log_test("Templates - Create template", True)
        else:
            self.log_test("Templates - Create template", False, f"Failed to create template: {data}")

    def test_analytics(self):
        """Test analytics endpoints"""
        print("\n🔍 Testing Analytics...")
        
        # Test overloaded days
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        success, data = self.make_request('GET', f'/analytics/overloaded-days?start_date={start_date}&end_date={end_date}')
        self.log_test("Analytics - Get overloaded days", success,
                     "" if success else f"Failed to get overloaded days: {data}")

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created event
        if self.created_event_id:
            success, data = self.make_request('DELETE', f'/events/{self.created_event_id}')
            self.log_test("Cleanup - Delete test event", success,
                         "" if success else f"Failed to delete event: {data}")
        
        # Delete created user
        if self.created_user_id:
            success, data = self.make_request('DELETE', f'/users/{self.created_user_id}')
            self.log_test("Cleanup - Delete test user", success,
                         "" if success else f"Failed to delete user: {data}")
        
        # Delete created template
        if self.created_template_id:
            success, data = self.make_request('DELETE', f'/templates/{self.created_template_id}')
            self.log_test("Cleanup - Delete test template", success,
                         "" if success else f"Failed to delete template: {data}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Executive Calendar API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Run tests in order
        self.test_health_check()
        
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
        
        self.test_events()
        self.test_day_ratings()
        self.test_survey_functionality()
        self.test_rules_functionality()
        self.test_admin_functionality()
        self.test_templates_functionality()
        self.test_analytics()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ExecutiveCalendarAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'failed_tests': tester.tests_run - tester.tests_passed,
            'success_rate': tester.tests_passed / tester.tests_run * 100 if tester.tests_run > 0 else 0,
            'test_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())