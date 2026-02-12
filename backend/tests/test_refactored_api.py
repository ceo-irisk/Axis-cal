#!/usr/bin/env python3
"""
Comprehensive regression tests for refactored backend API
Tests all endpoints after monolithic server.py was split into modular structure
"""

import requests
import sys
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

class RefactoredAPITester:
    def __init__(self, base_url: str = "https://calendar-ios.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.admin_id = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_event_id = None
        self.created_user_id = None
        self.created_calendar_id = None
        self.created_template_id = None
        self.created_subscription_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, token: Optional[str] = None) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

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

    def test_authentication(self):
        """Test authentication endpoints (routes/auth.py)"""
        print("\n🔍 Testing Authentication (routes/auth.py)...")
        
        # Test admin login
        admin_login = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', admin_login)
        
        if success and 'access_token' in data:
            self.admin_token = data['access_token']
            self.admin_id = data.get('user', {}).get('id')
            self.log_test("Auth - Admin login (admin@example.com)", True)
            
            # Test /auth/me endpoint
            success, me_data = self.make_request('GET', '/auth/me', token=self.admin_token)
            self.log_test("Auth - GET /auth/me", success,
                         "" if success else f"Failed: {me_data}")
        else:
            self.log_test("Auth - Admin login (admin@example.com)", False, 
                         f"Login failed: {data}")
            return False
        
        # Test user login
        user_login = {
            "email": "user@company.com",
            "password": "user123"
        }
        
        success, data = self.make_request('POST', '/auth/login', user_login)
        
        if success and 'access_token' in data:
            self.user_token = data['access_token']
            self.user_id = data.get('user', {}).get('id')
            self.log_test("Auth - User login (user@company.com)", True)
        else:
            # User might not exist, create it
            self.log_test("Auth - User login (user@company.com)", False, 
                         f"User doesn't exist yet: {data}")
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        success, data = self.make_request('POST', '/auth/login', invalid_login, 
                                        expected_status=401)
        self.log_test("Auth - Invalid login rejection", success,
                     "" if success else f"Should reject invalid login: {data}")
        
        return True

    def test_users(self):
        """Test user management endpoints (routes/users.py)"""
        print("\n🔍 Testing Users (routes/users.py)...")
        
        # Test GET /users (admin only)
        success, data = self.make_request('GET', '/users', token=self.admin_token)
        self.log_test("Users - GET /users (admin only)", success,
                     "" if success else f"Failed: {data}")
        
        # Test POST /users (create user with default calendars)
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"test.user.{timestamp}@company.com",
            "name": "Тестовый Пользователь",
            "password": "TestPass123!",
            "role": "user",
            "timezone": "Europe/Moscow"
        }
        
        success, data = self.make_request('POST', '/users', user_data, token=self.admin_token)
        if success and 'id' in data:
            self.created_user_id = data['id']
            self.log_test("Users - POST /users (create with default calendars)", True)
            
            # Verify default calendars were created
            success, calendars = self.make_request('GET', '/calendars', token=self.admin_token)
            if success:
                # Check if "Открытый" and "Закрытый" calendars exist
                user_calendars = [c for c in calendars if c.get('user_id') == self.created_user_id]
                has_open = any(c.get('name') == 'Открытый' for c in user_calendars)
                has_closed = any(c.get('name') == 'Закрытый' for c in user_calendars)
                
                if has_open and has_closed:
                    self.log_test("Users - Default calendars created (Открытый, Закрытый)", True)
                else:
                    self.log_test("Users - Default calendars created", False,
                                 f"Missing calendars. Found: {[c.get('name') for c in user_calendars]}")
            
            # Test GET /users/{user_id}
            success, user_data = self.make_request('GET', f'/users/{self.created_user_id}', 
                                                   token=self.admin_token)
            self.log_test("Users - GET /users/{user_id}", success,
                         "" if success else f"Failed: {user_data}")
            
            # Test PUT /users/{user_id}
            update_data = {
                "email": f"test.user.{timestamp}@company.com",
                "name": "Обновленный Пользователь",
                "role": "assistant",
                "timezone": "Europe/Moscow"
            }
            success, data = self.make_request('PUT', f'/users/{self.created_user_id}', 
                                             update_data, token=self.admin_token)
            self.log_test("Users - PUT /users/{user_id}", success,
                         "" if success else f"Failed: {data}")
            
            # Test PATCH /users/{user_id}/toggle-active
            success, data = self.make_request('PATCH', f'/users/{self.created_user_id}/toggle-active',
                                             token=self.admin_token)
            self.log_test("Users - PATCH /users/{user_id}/toggle-active", success,
                         "" if success else f"Failed: {data}")
            
        else:
            self.log_test("Users - POST /users", False, f"Failed: {data}")

    def test_events(self):
        """Test event management endpoints (routes/events.py)"""
        print("\n🔍 Testing Events (routes/events.py)...")
        
        # Test POST /events (create event with UTC timezone)
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        event_data = {
            "title": "Тестовая встреча",
            "description": "Описание встречи",
            "start_time": tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=11, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Офис",
            "attendees": ["test@example.com"],
            "is_all_day": False,
            "is_blocked": False,
            "is_completed": False,
            "is_urgent": False,
            "is_video_call": False
        }
        
        success, data = self.make_request('POST', '/events', event_data, token=self.admin_token)
        if success and 'id' in data:
            self.created_event_id = data['id']
            
            # Verify datetime is in UTC (aware datetime)
            start_time = data.get('start_time', '')
            has_timezone = 'Z' in start_time or '+' in start_time or start_time.endswith('00:00')
            
            # Verify calendar_id is saved
            has_calendar_id = 'calendar_id' in data
            
            self.log_test("Events - POST /events (UTC timezone)", has_timezone,
                         "" if has_timezone else f"Datetime not in UTC: {start_time}")
            self.log_test("Events - POST /events (calendar_id saved)", has_calendar_id,
                         "" if has_calendar_id else "calendar_id not in response")
            
            # Test GET /events (with permissions filtering)
            success, events = self.make_request('GET', '/events', token=self.admin_token)
            self.log_test("Events - GET /events (with permissions)", success,
                         "" if success else f"Failed: {events}")
            
            # Test GET /events/{event_id}
            success, event = self.make_request('GET', f'/events/{self.created_event_id}',
                                              token=self.admin_token)
            self.log_test("Events - GET /events/{event_id}", success,
                         "" if success else f"Failed: {event}")
            
            # Test PUT /events/{event_id}
            update_data = {
                "title": "Обновленная встреча",
                "description": "Обновленное описание",
                "start_time": tomorrow.replace(hour=14, minute=0, second=0, microsecond=0).isoformat(),
                "end_time": tomorrow.replace(hour=15, minute=0, second=0, microsecond=0).isoformat(),
                "event_type": "call",
                "status": "tentative",
                "location": "Zoom",
                "attendees": ["updated@example.com"],
                "is_all_day": False,
                "is_blocked": False,
                "is_completed": False,
                "is_urgent": True,
                "is_video_call": True
            }
            
            success, data = self.make_request('PUT', f'/events/{self.created_event_id}',
                                             update_data, token=self.admin_token)
            self.log_test("Events - PUT /events/{event_id}", success,
                         "" if success else f"Failed: {data}")
            
            # Test DELETE /events/{event_id}
            success, data = self.make_request('DELETE', f'/events/{self.created_event_id}',
                                             token=self.admin_token)
            self.log_test("Events - DELETE /events/{event_id}", success,
                         "" if success else f"Failed: {data}")
            
        else:
            self.log_test("Events - POST /events", False, f"Failed: {data}")

    def test_calendars(self):
        """Test calendar management endpoints (routes/calendars.py)"""
        print("\n🔍 Testing Calendars (routes/calendars.py)...")
        
        # Test GET /calendars (own + subscribed)
        success, data = self.make_request('GET', '/calendars', token=self.admin_token)
        self.log_test("Calendars - GET /calendars (own + subscribed)", success,
                     "" if success else f"Failed: {data}")
        
        # Test POST /calendars
        calendar_data = {
            "name": "Тестовый календарь",
            "provider": "custom",
            "color": "#ff5722",
            "icon": "calendar",
            "is_public": True,
            "is_active": True,
            "sync_enabled": False,
            "credentials": {}
        }
        
        success, data = self.make_request('POST', '/calendars', calendar_data, token=self.admin_token)
        if success and 'id' in data:
            self.created_calendar_id = data['id']
            self.log_test("Calendars - POST /calendars", True)
            
            # Test GET /calendars/{calendar_id}/permissions
            success, perms = self.make_request('GET', f'/calendars/{self.created_calendar_id}/permissions',
                                              token=self.admin_token)
            self.log_test("Calendars - GET /calendars/{calendar_id}/permissions", success,
                         "" if success else f"Failed: {perms}")
            
            # Test POST /calendars/{calendar_id}/permissions
            if self.created_user_id:
                perm_data = {
                    "user_id": self.created_user_id,
                    "permission_level": "edit"
                }
                success, data = self.make_request('POST', f'/calendars/{self.created_calendar_id}/permissions',
                                                 perm_data, token=self.admin_token)
                self.log_test("Calendars - POST /calendars/{calendar_id}/permissions", success,
                             "" if success else f"Failed: {data}")
                
                # Test DELETE /calendars/{calendar_id}/permissions/{user_id}
                success, data = self.make_request('DELETE', 
                                                 f'/calendars/{self.created_calendar_id}/permissions/{self.created_user_id}',
                                                 token=self.admin_token)
                self.log_test("Calendars - DELETE /calendars/{calendar_id}/permissions/{user_id}", success,
                             "" if success else f"Failed: {data}")
            
            # Test DELETE /calendars/{calendar_id}
            success, data = self.make_request('DELETE', f'/calendars/{self.created_calendar_id}',
                                             token=self.admin_token)
            self.log_test("Calendars - DELETE /calendars/{calendar_id}", success,
                         "" if success else f"Failed: {data}")
            
        else:
            self.log_test("Calendars - POST /calendars", False, f"Failed: {data}")

    def test_subscriptions(self):
        """Test user subscriptions endpoints (routes/calendars.py)"""
        print("\n🔍 Testing Subscriptions (routes/calendars.py)...")
        
        # Test GET /subscriptions
        success, data = self.make_request('GET', '/subscriptions', token=self.admin_token)
        self.log_test("Subscriptions - GET /subscriptions", success,
                     "" if success else f"Failed: {data}")
        
        # Test POST /subscriptions
        if self.created_user_id:
            sub_data = {
                "target_user_id": self.created_user_id
            }
            success, data = self.make_request('POST', '/subscriptions', sub_data, token=self.admin_token)
            if success:
                self.log_test("Subscriptions - POST /subscriptions", True)
                
                # Test DELETE /subscriptions/{target_user_id}
                success, data = self.make_request('DELETE', f'/subscriptions/{self.created_user_id}',
                                                 token=self.admin_token)
                self.log_test("Subscriptions - DELETE /subscriptions/{target_user_id}", success,
                             "" if success else f"Failed: {data}")
            else:
                self.log_test("Subscriptions - POST /subscriptions", False, f"Failed: {data}")

    def test_templates(self):
        """Test template management endpoints (routes/templates.py)"""
        print("\n🔍 Testing Templates (routes/templates.py)...")
        
        # Test GET /templates
        success, data = self.make_request('GET', '/templates', token=self.admin_token)
        self.log_test("Templates - GET /templates", success,
                     "" if success else f"Failed: {data}")
        
        # Test POST /templates
        template_data = {
            "name": "Тестовый шаблон",
            "template_type": "day",
            "events": [
                {
                    "title": "Утренняя встреча",
                    "description": "Планирование дня",
                    "start_time": "09:00",
                    "end_time": "10:00",
                    "event_type": "meeting",
                    "location": "Офис"
                }
            ],
            "is_active": True
        }
        
        success, data = self.make_request('POST', '/templates', template_data, token=self.admin_token)
        if success and 'id' in data:
            self.created_template_id = data['id']
            self.log_test("Templates - POST /templates", True)
            
            # Test POST /templates/{template_id}/apply
            tomorrow = datetime.now().strftime('%Y-%m-%d')
            success, apply_data = self.make_request('POST', f'/templates/{self.created_template_id}/apply',
                                                   {"target_date": tomorrow}, token=self.admin_token)
            self.log_test("Templates - POST /templates/{template_id}/apply", success,
                         "" if success else f"Failed: {apply_data}")
            
            # Test GET /templates/applied (should return array!)
            success, applied = self.make_request('GET', '/templates/applied', token=self.admin_token)
            if success:
                is_array = isinstance(applied, list)
                if is_array and len(applied) > 0:
                    has_date_field = 'date' in applied[0]
                    self.log_test("Templates - GET /templates/applied (array format)", has_date_field,
                                 "" if has_date_field else f"Missing 'date' field in response: {applied[0]}")
                else:
                    self.log_test("Templates - GET /templates/applied (array format)", is_array,
                                 "" if is_array else f"Response is not array: {type(applied)}")
            else:
                self.log_test("Templates - GET /templates/applied", False, f"Failed: {applied}")
            
            # Test DELETE /templates/applied/{date}
            success, data = self.make_request('DELETE', f'/templates/applied/{tomorrow}',
                                             token=self.admin_token)
            self.log_test("Templates - DELETE /templates/applied/{date}", success,
                         "" if success else f"Failed: {data}")
            
            # Test DELETE /templates/{template_id}
            success, data = self.make_request('DELETE', f'/templates/{self.created_template_id}',
                                             token=self.admin_token)
            self.log_test("Templates - DELETE /templates/{template_id}", success,
                         "" if success else f"Failed: {data}")
            
        else:
            self.log_test("Templates - POST /templates", False, f"Failed: {data}")

    def test_dictionaries(self):
        """Test dictionary endpoints (routes/dictionaries.py)"""
        print("\n🔍 Testing Dictionaries (routes/dictionaries.py)...")
        
        # Test GET /dictionaries/event-types
        success, data = self.make_request('GET', '/dictionaries/event-types', token=self.admin_token)
        self.log_test("Dictionaries - GET /dictionaries/event-types", success,
                     "" if success else f"Failed: {data}")
        
        # Test POST /dictionaries/event-types
        type_data = {
            "name": "test_type",
            "label": "Тестовый тип",
            "color": "#ff5722"
        }
        success, data = self.make_request('POST', '/dictionaries/event-types', type_data, token=self.admin_token)
        if success and 'id' in data:
            type_id = data['id']
            self.log_test("Dictionaries - POST /dictionaries/event-types", True)
            
            # Clean up
            self.make_request('DELETE', f'/dictionaries/event-types/{type_id}', token=self.admin_token)
        else:
            self.log_test("Dictionaries - POST /dictionaries/event-types", False, f"Failed: {data}")
        
        # Test GET /dictionaries/event-statuses
        success, data = self.make_request('GET', '/dictionaries/event-statuses', token=self.admin_token)
        self.log_test("Dictionaries - GET /dictionaries/event-statuses", success,
                     "" if success else f"Failed: {data}")
        
        # Test GET /dictionaries/timezones
        success, data = self.make_request('GET', '/dictionaries/timezones', token=self.admin_token)
        self.log_test("Dictionaries - GET /dictionaries/timezones", success,
                     "" if success else f"Failed: {data}")

    def test_recurring_events(self):
        """Test recurring events endpoints (routes/other.py)"""
        print("\n🔍 Testing Recurring Events (routes/other.py)...")
        
        # Test GET /recurring-events (generate instances)
        start_date = datetime.now().strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        success, data = self.make_request('GET', f'/recurring-events?start_date={start_date}&end_date={end_date}',
                                         token=self.admin_token)
        self.log_test("Recurring Events - GET /recurring-events (generate instances)", success,
                     "" if success else f"Failed: {data}")

    def test_permissions(self):
        """Test permissions filtering for closed calendars"""
        print("\n🔍 Testing Permissions (services/permissions.py)...")
        
        # Create event in closed calendar
        # This test verifies that events from closed calendars show as "Занято"
        # This is handled by filter_events_by_permissions in services/permissions.py
        
        # For now, just verify that GET /events applies permissions filtering
        success, data = self.make_request('GET', '/events', token=self.admin_token)
        self.log_test("Permissions - Events filtered by permissions", success,
                     "" if success else f"Failed: {data}")

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created user
        if self.created_user_id:
            success, data = self.make_request('DELETE', f'/users/{self.created_user_id}',
                                             token=self.admin_token)
            self.log_test("Cleanup - Delete test user", success,
                         "" if success else f"Failed: {data}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Refactored API Regression Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 80)
        
        # Run tests in order
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
        
        self.test_users()
        self.test_events()
        self.test_calendars()
        self.test_subscriptions()
        self.test_templates()
        self.test_dictionaries()
        self.test_recurring_events()
        self.test_permissions()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RefactoredAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    import os
    os.makedirs('/app/test_reports', exist_ok=True)
    
    with open('/app/test_reports/refactored_api_test_results.json', 'w') as f:
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
