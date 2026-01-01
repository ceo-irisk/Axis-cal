#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class AxisCalendarSpecificTester:
    def __init__(self, base_url: str = "https://smartplan-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_template_id = None
        self.created_event_id = None

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
                response = requests.get(url, headers=headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15)
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

    def test_specific_authentication(self):
        """Test authentication with specific credentials from review request"""
        print("\n🔍 Testing Authentication with Review Request Credentials...")
        
        # Test login with specific credentials: admin@example.com / admin123
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data, 
                                        auth_required=False)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data.get('user', {}).get('id')
            user_info = data.get('user', {})
            self.log_test("Auth - Login with admin@example.com", True, 
                         f"User: {user_info.get('name', 'Unknown')}, Role: {user_info.get('role', 'Unknown')}")
            return True
        else:
            self.log_test("Auth - Login with admin@example.com", False, 
                         f"Login failed: {data}")
            return False

    def test_events_api(self):
        """Test events API endpoints mentioned in review request"""
        print("\n🔍 Testing Events API (GET /api/events, PUT /api/events/{id})...")
        
        # Test GET /api/events
        success, data = self.make_request('GET', '/events')
        if success:
            events = data if isinstance(data, list) else []
            self.log_test("Events - GET /api/events", True, 
                         f"Retrieved {len(events)} events")
            
            # Look for specific events mentioned in review request
            unconfirmed_events = []
            for event in events:
                if (event.get('is_unconfirmed') == True or 
                    event.get('status') == 'tentative' or
                    'Созвон с кем-то' in event.get('title', '')):
                    unconfirmed_events.append(event)
            
            if unconfirmed_events:
                self.log_test("Events - Found unconfirmed events", True,
                             f"Found {len(unconfirmed_events)} unconfirmed events including 'Созвон с кем-то'")
            else:
                self.log_test("Events - Found unconfirmed events", False,
                             "No unconfirmed events found, expected 'Созвон с кем-то' to be unconfirmed")
            
            # Test event time display - verify events have proper time fields
            events_with_time = [e for e in events if e.get('start_time') and e.get('end_time')]
            self.log_test("Events - Time fields present", len(events_with_time) == len(events),
                         f"{len(events_with_time)}/{len(events)} events have time fields")
            
            # Test PUT /api/events/{id} for event resize functionality
            if events:
                test_event = events[0]
                event_id = test_event.get('id')
                if event_id:
                    # Create update data to simulate resize (extend end time by 30 minutes)
                    original_start = test_event.get('start_time')
                    original_end = test_event.get('end_time')
                    
                    try:
                        # Parse and extend end time
                        end_dt = datetime.fromisoformat(original_end.replace('Z', '+00:00'))
                        new_end_dt = end_dt + timedelta(minutes=30)
                        
                        update_data = {
                            "title": test_event.get('title'),
                            "description": test_event.get('description'),
                            "start_time": original_start,
                            "end_time": new_end_dt.isoformat(),
                            "event_type": test_event.get('event_type', 'meeting'),
                            "status": test_event.get('status', 'confirmed'),
                            "location": test_event.get('location'),
                            "attendees": test_event.get('attendees', [])
                        }
                        
                        success, update_response = self.make_request('PUT', f'/events/{event_id}', update_data)
                        if success:
                            self.log_test("Events - PUT /api/events/{id} (resize simulation)", True,
                                         f"Successfully updated event {event_id}")
                            
                            # Restore original end time
                            restore_data = update_data.copy()
                            restore_data['end_time'] = original_end
                            self.make_request('PUT', f'/events/{event_id}', restore_data)
                        else:
                            self.log_test("Events - PUT /api/events/{id} (resize simulation)", False,
                                         f"Failed to update event: {update_response}")
                    except Exception as e:
                        self.log_test("Events - PUT /api/events/{id} (resize simulation)", False,
                                     f"Error processing event update: {str(e)}")
                else:
                    self.log_test("Events - PUT /api/events/{id} (resize simulation)", False,
                                 "No event ID found to test update")
            else:
                self.log_test("Events - PUT /api/events/{id} (resize simulation)", False,
                             "No events available to test update")
        else:
            self.log_test("Events - GET /api/events", False, f"Failed to get events: {data}")

    def test_templates_api(self):
        """Test templates API endpoints mentioned in review request"""
        print("\n🔍 Testing Templates API (GET /api/templates, POST /api/templates/{id}/apply)...")
        
        # Test GET /api/templates
        success, data = self.make_request('GET', '/templates')
        if success:
            templates = data if isinstance(data, list) else []
            self.log_test("Templates - GET /api/templates", True,
                         f"Retrieved {len(templates)} templates")
            
            # Test template structure for frontend selector
            if templates:
                template = templates[0]
                required_fields = ['id', 'name', 'template_type']
                has_required = all(field in template for field in required_fields)
                self.log_test("Templates - Template structure for selector", has_required,
                             f"Template has required fields: {required_fields}")
                
                # Test POST /api/templates/{id}/apply
                template_id = template.get('id')
                if template_id:
                    # Apply template to tomorrow's date
                    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                    
                    success, apply_response = self.make_request('POST', f'/templates/{template_id}/apply?target_date={tomorrow}')
                    if success:
                        created_events = apply_response.get('created_events', [])
                        self.log_test("Templates - POST /api/templates/{id}/apply", True,
                                     f"Applied template, created {len(created_events)} events")
                        
                        # Store created event IDs for cleanup
                        for event in created_events:
                            if event.get('id'):
                                # Clean up created events immediately
                                self.make_request('DELETE', f'/events/{event["id"]}')
                    else:
                        self.log_test("Templates - POST /api/templates/{id}/apply", False,
                                     f"Failed to apply template: {apply_response}")
                else:
                    self.log_test("Templates - POST /api/templates/{id}/apply", False,
                                 "No template ID found to test apply")
            else:
                self.log_test("Templates - Template structure for selector", False,
                             "No templates available to test structure")
                self.log_test("Templates - POST /api/templates/{id}/apply", False,
                             "No templates available to test apply")
        else:
            self.log_test("Templates - GET /api/templates", False, f"Failed to get templates: {data}")

    def test_event_data_integrity(self):
        """Test that events have proper data for frontend display"""
        print("\n🔍 Testing Event Data Integrity for Frontend...")
        
        success, data = self.make_request('GET', '/events')
        if success:
            events = data if isinstance(data, list) else []
            
            # Check for unconfirmed event styling data
            unconfirmed_found = False
            for event in events:
                title = event.get('title', '')
                if 'Созвон с кем-то' in title:
                    unconfirmed_found = True
                    is_unconfirmed = event.get('is_unconfirmed', False)
                    status = event.get('status', '')
                    
                    self.log_test("Events - 'Созвон с кем-то' unconfirmed status", 
                                 is_unconfirmed or status == 'tentative',
                                 f"is_unconfirmed: {is_unconfirmed}, status: {status}")
                    break
            
            if not unconfirmed_found:
                self.log_test("Events - 'Созвон с кем-то' unconfirmed status", False,
                             "Event 'Созвон с кем-то' not found in events list")
            
            # Check time display data
            events_with_proper_time = 0
            for event in events:
                start_time = event.get('start_time')
                end_time = event.get('end_time')
                if start_time and end_time:
                    try:
                        # Verify time format is parseable
                        datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                        events_with_proper_time += 1
                    except:
                        pass
            
            self.log_test("Events - Proper time format for display", 
                         events_with_proper_time == len(events),
                         f"{events_with_proper_time}/{len(events)} events have proper time format")
        else:
            self.log_test("Events - Data integrity check", False, f"Failed to get events: {data}")

    def run_specific_tests(self):
        """Run tests specific to the review request"""
        print("🚀 Starting Axis Calendar Specific API Tests...")
        print(f"Testing against: {self.base_url}")
        print("Focus: Default Week view, Event resize, Template selector, Unconfirmed styling, Event time display")
        
        # Test authentication with specific credentials
        if not self.test_specific_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test specific API endpoints mentioned in review request
        self.test_events_api()
        self.test_templates_api()
        self.test_event_data_integrity()
        
        # Print summary
        print(f"\n📊 Specific Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AxisCalendarSpecificTester()
    success = tester.run_specific_tests()
    
    # Save detailed results
    with open('/app/test_reports/axis_calendar_specific_results.json', 'w') as f:
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