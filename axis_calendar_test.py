#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class AxisCalendarSpecificTester:
    def __init__(self, base_url: str = "https://repeat-calendar.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
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
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data=None, expected_status: int = 200, auth_required: bool = True):
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

    def test_authentication_with_review_credentials(self):
        """Test authentication with review request credentials"""
        print("\n🔍 Testing Authentication with Review Credentials...")
        
        # Test login with admin@example.com / admin123
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data, auth_required=False)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.log_test("Auth - Login with admin@example.com", True)
            return True
        else:
            self.log_test("Auth - Login with admin@example.com", False, f"Login failed: {data}")
            return False

    def test_event_creation_with_status_field(self):
        """Test event creation with new status field options"""
        print("\n🔍 Testing Event Creation with Status Field...")
        
        tomorrow = datetime.now() + timedelta(days=1)
        
        # Test 1: Create event with "Подтверждено" status
        event_data_confirmed = {
            "title": "Подтвержденное событие",
            "description": "Тест статуса Подтверждено",
            "start_time": tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=11, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Офис"
        }
        
        success, data = self.make_request('POST', '/events', event_data_confirmed)
        if success and 'id' in data:
            event_id_1 = data['id']
            self.log_test("Events - Create with 'Подтверждено' status", True)
            
            # Verify status was saved correctly
            success, event_data = self.make_request('GET', f'/events/{event_id_1}')
            if success and event_data.get('status') == 'confirmed':
                self.log_test("Events - Verify 'Подтверждено' status saved", True)
            else:
                self.log_test("Events - Verify 'Подтверждено' status saved", False, f"Status not saved correctly: {event_data.get('status')}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{event_id_1}')
        else:
            self.log_test("Events - Create with 'Подтверждено' status", False, f"Failed: {data}")
        
        # Test 2: Create event with "Не согласовано" status (tentative)
        event_data_unconfirmed = {
            "title": "Не согласованное событие",
            "description": "Тест статуса Не согласовано",
            "start_time": tomorrow.replace(hour=14, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=15, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "tentative",
            "location": "Переговорная"
        }
        
        success, data = self.make_request('POST', '/events', event_data_unconfirmed)
        if success and 'id' in data:
            event_id_2 = data['id']
            self.log_test("Events - Create with 'Не согласовано' status", True)
            
            # Verify status and pattern for dotted border
            success, event_data = self.make_request('GET', f'/events/{event_id_2}')
            if success:
                if event_data.get('status') == 'tentative':
                    self.log_test("Events - Verify 'Не согласовано' status saved", True)
                else:
                    self.log_test("Events - Verify 'Не согласовано' status saved", False, f"Status incorrect: {event_data.get('status')}")
                
                if event_data.get('pattern') == 'tentative':
                    self.log_test("Events - Verify dotted border pattern set", True)
                else:
                    self.log_test("Events - Verify dotted border pattern set", False, f"Pattern not set: {event_data.get('pattern')}")
            else:
                self.log_test("Events - Verify 'Не согласовано' status saved", False, f"Failed to get event: {event_data}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{event_id_2}')
        else:
            self.log_test("Events - Create with 'Не согласовано' status", False, f"Failed: {data}")

        # Test 3: Create template event
        event_data_template = {
            "title": "Шаблонное событие",
            "description": "Тест шаблонного события",
            "start_time": tomorrow.replace(hour=16, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=17, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "is_template_event": True,
            "location": "Шаблон"
        }
        
        success, data = self.make_request('POST', '/events', event_data_template)
        if success and 'id' in data:
            event_id_3 = data['id']
            self.log_test("Events - Create template event", True)
            
            # Verify template flag
            success, event_data = self.make_request('GET', f'/events/{event_id_3}')
            if success and event_data.get('is_template_event') == True:
                self.log_test("Events - Verify template event flag", True)
            else:
                self.log_test("Events - Verify template event flag", False, f"Template flag not set: {event_data.get('is_template_event')}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{event_id_3}')
        else:
            self.log_test("Events - Create template event", False, f"Failed: {data}")

    def test_event_flags_functionality(self):
        """Test event flags (Заблокировано, Выполнено, Срочно, Видеозвонок)"""
        print("\n🔍 Testing Event Flags Functionality...")
        
        tomorrow = datetime.now() + timedelta(days=1)
        
        # Test event with all flags
        event_data_with_flags = {
            "title": "Событие с флагами",
            "description": "Тест всех флагов события",
            "start_time": tomorrow.replace(hour=12, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=13, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Тестовая комната",
            "is_blocked": True,
            "is_completed": False,
            "is_urgent": True,
            "is_video_call": True
        }
        
        success, data = self.make_request('POST', '/events', event_data_with_flags)
        if success and 'id' in data:
            event_id = data['id']
            self.log_test("Events - Create event with flags", True)
            
            # Verify all flags were saved
            success, event_data = self.make_request('GET', f'/events/{event_id}')
            if success:
                flags_to_check = {
                    'is_blocked': True,
                    'is_completed': False,
                    'is_urgent': True,
                    'is_video_call': True
                }
                
                all_flags_correct = True
                for flag, expected_value in flags_to_check.items():
                    if event_data.get(flag) != expected_value:
                        all_flags_correct = False
                        break
                
                if all_flags_correct:
                    self.log_test("Events - Verify all event flags saved correctly", True)
                else:
                    self.log_test("Events - Verify all event flags saved correctly", False, 
                                 f"Flags mismatch. Expected: {flags_to_check}, Got: {event_data}")
            else:
                self.log_test("Events - Verify all event flags saved correctly", False, f"Failed to get event: {event_data}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{event_id}')
        else:
            self.log_test("Events - Create event with flags", False, f"Failed: {data}")

    def test_dictionaries_api(self):
        """Test dictionaries API for event types and statuses"""
        print("\n🔍 Testing Dictionaries API...")
        
        # Test event types dictionary
        success, data = self.make_request('GET', '/dictionaries/event-types')
        if success:
            self.log_test("Dictionaries - Get event types", True)
            
            # Check if default types exist
            expected_types = ['meeting', 'call', 'personal', 'urgent', 'travel', 'deep_work']
            type_names = [t.get('name') for t in data if isinstance(t, dict)]
            
            missing_types = [t for t in expected_types if t not in type_names]
            if not missing_types:
                self.log_test("Dictionaries - Verify default event types exist", True)
            else:
                self.log_test("Dictionaries - Verify default event types exist", False, 
                             f"Missing types: {missing_types}")
        else:
            self.log_test("Dictionaries - Get event types", False, f"Failed: {data}")
        
        # Test event statuses dictionary
        success, data = self.make_request('GET', '/dictionaries/event-statuses')
        if success:
            self.log_test("Dictionaries - Get event statuses", True)
            
            # Check if default statuses exist
            expected_statuses = ['confirmed', 'tentative', 'cancelled']
            status_names = [s.get('name') for s in data if isinstance(s, dict)]
            
            missing_statuses = [s for s in expected_statuses if s not in status_names]
            if not missing_statuses:
                self.log_test("Dictionaries - Verify default event statuses exist", True)
            else:
                self.log_test("Dictionaries - Verify default event statuses exist", False, 
                             f"Missing statuses: {missing_statuses}")
        else:
            self.log_test("Dictionaries - Get event statuses", False, f"Failed: {data}")

    def test_event_update_with_status_changes(self):
        """Test updating events with different status values"""
        print("\n🔍 Testing Event Status Updates...")
        
        tomorrow = datetime.now() + timedelta(days=1)
        
        # Create initial event
        event_data = {
            "title": "Событие для обновления статуса",
            "description": "Тест обновления статуса",
            "start_time": tomorrow.replace(hour=9, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Офис"
        }
        
        success, data = self.make_request('POST', '/events', event_data)
        if success and 'id' in data:
            event_id = data['id']
            self.log_test("Events - Create event for status update test", True)
            
            # Update to tentative status
            update_data = {
                "title": "Событие для обновления статуса",
                "description": "Тест обновления статуса - теперь не согласовано",
                "start_time": tomorrow.replace(hour=9, minute=0, second=0, microsecond=0).isoformat(),
                "end_time": tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat(),
                "event_type": "meeting",
                "status": "tentative",
                "location": "Офис"
            }
            
            success, update_response = self.make_request('PUT', f'/events/{event_id}', update_data)
            if success:
                self.log_test("Events - Update status to 'tentative'", True)
                
                # Verify the update
                success, updated_event = self.make_request('GET', f'/events/{event_id}')
                if success:
                    if updated_event.get('status') == 'tentative' and updated_event.get('pattern') == 'tentative':
                        self.log_test("Events - Verify status update and pattern set", True)
                    else:
                        self.log_test("Events - Verify status update and pattern set", False, 
                                     f"Status: {updated_event.get('status')}, Pattern: {updated_event.get('pattern')}")
                else:
                    self.log_test("Events - Verify status update and pattern set", False, f"Failed to get updated event: {updated_event}")
            else:
                self.log_test("Events - Update status to 'tentative'", False, f"Failed: {update_response}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{event_id}')
        else:
            self.log_test("Events - Create event for status update test", False, f"Failed: {data}")

    def run_all_tests(self):
        """Run all Axis Calendar specific tests"""
        print("🚀 Starting Axis Calendar Specific API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test authentication first
        if not self.test_authentication_with_review_credentials():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Run specific feature tests
        self.test_event_creation_with_status_field()
        self.test_event_flags_functionality()
        self.test_dictionaries_api()
        self.test_event_update_with_status_changes()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AxisCalendarSpecificTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())