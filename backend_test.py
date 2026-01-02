#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class ExecutiveCalendarAPITester:
    def __init__(self, base_url: str = "https://git-to-deploy.preview.emergentagent.com"):
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
            "password": "admin123"
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
        
        # Test create survey question (admin only) - uses query parameters
        success, data = self.make_request('POST', '/survey/questions?question=How was your focus today?&question_type=scale&options=1&options=2&options=3&options=4&options=5')
        self.log_test("Admin - Create survey question", success,
                     "" if success else f"Failed to create question: {data}")

    def test_templates_functionality(self):
        """Test templates functionality"""
        print("\n🔍 Testing Templates Functionality...")
        
        # Test get templates
        success, data = self.make_request('GET', '/templates')
        self.log_test("Templates - Get templates list", success,
                     "" if success else f"Failed to get templates: {data}")
        
        # Test create template with enhanced event fields
        template_data = {
            "name": "Важный день",
            "template_type": "day",
            "events": [
                {
                    "title": "Важная встреча",
                    "description": "Встреча с клиентом",
                    "start_hour": 9,
                    "start_minute": 0,
                    "end_hour": 10,
                    "end_minute": 0,
                    "event_type": "meeting",
                    "status": "confirmed",
                    "location": "Офис",
                    "is_blocked": False,
                    "is_completed": False,
                    "is_urgent": True,
                    "is_video_call": False,
                    "is_unconfirmed": False
                }
            ],
            "is_active": True
        }
        
        success, data = self.make_request('POST', '/templates', template_data)
        if success and 'id' in data:
            self.created_template_id = data['id']
            self.log_test("Templates - Create template with enhanced fields", True)
            
            # Test template editing (PUT endpoint)
            updated_template_data = {
                "name": "Важный день (обновлено)",
                "template_type": "day",
                "events": [
                    {
                        "title": "Обновленная встреча",
                        "description": "Обновленное описание",
                        "start_hour": 10,
                        "start_minute": 30,
                        "end_hour": 11,
                        "end_minute": 30,
                        "event_type": "call",
                        "status": "tentative",
                        "location": "Zoom",
                        "is_blocked": True,
                        "is_completed": False,
                        "is_urgent": False,
                        "is_video_call": True,
                        "is_unconfirmed": True
                    }
                ],
                "is_active": True
            }
            
            success, update_data = self.make_request('PUT', f'/templates/{self.created_template_id}', updated_template_data)
            self.log_test("Templates - Edit template (PUT endpoint)", success,
                         "" if success else f"Failed to update template: {update_data}")
            
            if success:
                # Verify the update was applied
                success, get_data = self.make_request('GET', '/templates')
                if success:
                    updated_template = next((t for t in get_data if t.get('id') == self.created_template_id), None)
                    if updated_template and updated_template.get('name') == "Важный день (обновлено)":
                        self.log_test("Templates - Verify template update persisted", True)
                    else:
                        self.log_test("Templates - Verify template update persisted", False, 
                                     "Updated template name not found in templates list")
                else:
                    self.log_test("Templates - Verify template update persisted", False, 
                                 f"Failed to retrieve templates: {get_data}")
            
        else:
            self.log_test("Templates - Create template with enhanced fields", False, f"Failed to create template: {data}")

    def test_enhanced_event_fields(self):
        """Test enhanced event fields functionality"""
        print("\n🔍 Testing Enhanced Event Fields...")
        
        # Test create event with all new fields
        tomorrow = datetime.now() + timedelta(days=1)
        enhanced_event_data = {
            "title": "Тестовое событие с расширенными полями",
            "description": "Описание события с новыми полями",
            "start_time": tomorrow.replace(hour=14, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=15, minute=0, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Конференц-зал А",
            "attendees": ["participant@example.com"],
            "is_all_day": False,
            "is_unconfirmed": False,
            "is_template_event": False,
            "is_blocked": True,
            "is_completed": False,
            "is_urgent": True,
            "is_video_call": False
        }
        
        success, data = self.make_request('POST', '/events', enhanced_event_data)
        if success and 'id' in data:
            event_id = data['id']
            self.log_test("Enhanced Events - Create event with new fields", True)
            
            # Verify all fields were saved correctly
            success, event_data = self.make_request('GET', f'/events/{event_id}')
            if success:
                required_fields = ['location', 'is_blocked', 'is_completed', 'is_urgent', 'is_video_call', 'is_unconfirmed']
                missing_fields = [field for field in required_fields if field not in event_data]
                
                if not missing_fields:
                    self.log_test("Enhanced Events - Verify new fields saved", True)
                else:
                    self.log_test("Enhanced Events - Verify new fields saved", False, 
                                 f"Missing fields: {missing_fields}")
            else:
                self.log_test("Enhanced Events - Verify new fields saved", False, 
                             f"Failed to retrieve created event: {event_data}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{event_id}')
            
        else:
            self.log_test("Enhanced Events - Create event with new fields", False, 
                         f"Failed to create enhanced event: {data}")

    def test_dictionary_functionality(self):
        """Test dictionary management functionality"""
        print("\n🔍 Testing Dictionary Functionality...")
        
        # Test get event types
        success, data = self.make_request('GET', '/dictionaries/event-types')
        self.log_test("Dictionaries - Get event types", success,
                     "" if success else f"Failed to get event types: {data}")
        
        if success:
            original_types = data
            
            # Test create new event type (uses query parameters)
            success, create_data = self.make_request('POST', '/dictionaries/event-types?name=test_type&label=Тестовый тип&color=%23ff5722')
            if success and 'id' in create_data:
                new_type_id = create_data['id']
                self.log_test("Dictionaries - Create event type", True)
                
                # Test reordering functionality
                # Get current types to test reordering
                success, current_types = self.make_request('GET', '/dictionaries/event-types')
                if success and len(current_types) >= 2:
                    # Create a reorder list (reverse the order)
                    type_ids = [t['id'] for t in current_types]
                    reversed_ids = list(reversed(type_ids))
                    
                    success, reorder_data = self.make_request('PUT', '/dictionaries/event-types/reorder', 
                                                            {"type_ids": reversed_ids})
                    self.log_test("Dictionaries - Reorder event types", success,
                                 "" if success else f"Failed to reorder types: {reorder_data}")
                    
                    if success:
                        # Verify the reordering worked
                        success, reordered_types = self.make_request('GET', '/dictionaries/event-types')
                        if success:
                            new_order = [t['id'] for t in reordered_types]
                            if new_order == reversed_ids:
                                self.log_test("Dictionaries - Verify reorder persisted", True)
                            else:
                                self.log_test("Dictionaries - Verify reorder persisted", False,
                                             f"Order not updated correctly. Expected: {reversed_ids}, Got: {new_order}")
                        else:
                            self.log_test("Dictionaries - Verify reorder persisted", False,
                                         f"Failed to get types after reorder: {reordered_types}")
                
                # Clean up - delete the test type
                self.make_request('DELETE', f'/dictionaries/event-types/{new_type_id}')
                
            else:
                self.log_test("Dictionaries - Create event type", False, 
                             f"Failed to create event type: {create_data}")
        
        # Test get event statuses
        success, data = self.make_request('GET', '/dictionaries/event-statuses')
        self.log_test("Dictionaries - Get event statuses", success,
                     "" if success else f"Failed to get event statuses: {data}")

    def test_axis_calendar_specific_features(self):
        """Test Axis Calendar specific features from review request"""
        print("\n🔍 Testing Axis Calendar Specific Features...")
        
        # Test authentication with review request credentials
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data, auth_required=False)
        
        if success and 'access_token' in data:
            # Update token for subsequent requests
            old_token = self.token
            self.token = data['access_token']
            self.log_test("Axis Calendar - Login with review credentials", True)
            
            # Test template creation for "Важный день" template
            important_day_template = {
                "name": "Важный день",
                "template_type": "day",
                "events": [
                    {
                        "title": "Важное событие",
                        "description": "Описание важного события",
                        "start_hour": 9,
                        "start_minute": 0,
                        "end_hour": 10,
                        "end_minute": 0,
                        "event_type": "meeting",
                        "status": "confirmed",
                        "location": "Переговорная",
                        "is_blocked": False,
                        "is_completed": False,
                        "is_urgent": True,
                        "is_video_call": False,
                        "is_unconfirmed": False
                    }
                ],
                "is_active": True
            }
            
            success, template_data = self.make_request('POST', '/templates', important_day_template)
            if success and 'id' in template_data:
                template_id = template_data['id']
                self.log_test("Axis Calendar - Create 'Важный день' template", True)
                
                # Test template editing with enhanced fields
                updated_template = {
                    "name": "Важный день (обновлено)",
                    "template_type": "day",
                    "events": [
                        {
                            "title": "Обновленное важное событие",
                            "description": "Обновленное описание",
                            "start_hour": 10,
                            "start_minute": 0,
                            "end_hour": 11,
                            "end_minute": 30,
                            "event_type": "call",
                            "status": "tentative",
                            "location": "Zoom",
                            "is_blocked": True,
                            "is_completed": False,
                            "is_urgent": False,
                            "is_video_call": True,
                            "is_unconfirmed": True
                        }
                    ],
                    "is_active": True
                }
                
                success, update_data = self.make_request('PUT', f'/templates/{template_id}', updated_template)
                self.log_test("Axis Calendar - Edit template with enhanced event form", success,
                             "" if success else f"Failed to update template: {update_data}")
                
                # Clean up
                self.make_request('DELETE', f'/templates/{template_id}')
            else:
                self.log_test("Axis Calendar - Create 'Важный день' template", False,
                             f"Failed to create template: {template_data}")
            
            # Restore original token
            self.token = old_token
            
        else:
            self.log_test("Axis Calendar - Login with review credentials", False,
                         f"Failed to login with review credentials: {data}")

    def test_recurring_events(self):
        """Test recurring events functionality"""
        print("\n🔍 Testing Recurring Events...")
        
        # Test create event with recurrence
        tomorrow = datetime.now() + timedelta(days=1)
        recurring_event_data = {
            "title": "Daily Standup Meeting",
            "description": "Daily team standup",
            "start_time": tomorrow.replace(hour=9, minute=0, second=0, microsecond=0).isoformat(),
            "end_time": tomorrow.replace(hour=9, minute=30, second=0, microsecond=0).isoformat(),
            "event_type": "meeting",
            "status": "confirmed",
            "location": "Conference Room A",
            "recurrence_type": "daily",
            "recurrence_end_date": (tomorrow + timedelta(days=7)).isoformat()
        }
        
        success, data = self.make_request('POST', '/events', recurring_event_data)
        if success and 'id' in data:
            recurring_event_id = data['id']
            self.log_test("Recurring Events - Create daily recurring event", True)
            
            # Test get recurring events with instances
            start_date = tomorrow.strftime('%Y-%m-%d')
            end_date = (tomorrow + timedelta(days=10)).strftime('%Y-%m-%d')
            
            success, recurring_data = self.make_request('GET', f'/recurring-events?start_date={start_date}&end_date={end_date}')
            if success:
                # Check if recurring instances are generated
                recurring_instances = [e for e in recurring_data if e.get('recurrence_parent_id') == recurring_event_id]
                if len(recurring_instances) > 0:
                    self.log_test("Recurring Events - Generate recurring instances", True)
                else:
                    self.log_test("Recurring Events - Generate recurring instances", False, 
                                 "No recurring instances found in response")
            else:
                self.log_test("Recurring Events - Get recurring events", False,
                             f"Failed to get recurring events: {recurring_data}")
            
            # Test workdays recurrence
            workdays_event_data = {
                "title": "Workdays Meeting",
                "description": "Monday to Friday meeting",
                "start_time": tomorrow.replace(hour=14, minute=0, second=0, microsecond=0).isoformat(),
                "end_time": tomorrow.replace(hour=15, minute=0, second=0, microsecond=0).isoformat(),
                "event_type": "meeting",
                "status": "confirmed",
                "recurrence_type": "workdays",
                "recurrence_end_date": (tomorrow + timedelta(days=14)).isoformat()
            }
            
            success, workdays_data = self.make_request('POST', '/events', workdays_event_data)
            if success and 'id' in workdays_data:
                self.log_test("Recurring Events - Create workdays recurring event", True)
                # Clean up
                self.make_request('DELETE', f'/events/{workdays_data["id"]}')
            else:
                self.log_test("Recurring Events - Create workdays recurring event", False,
                             f"Failed to create workdays event: {workdays_data}")
            
            # Clean up
            self.make_request('DELETE', f'/events/{recurring_event_id}')
            
        else:
            self.log_test("Recurring Events - Create daily recurring event", False,
                         f"Failed to create recurring event: {data}")

    def test_ics_subscriptions(self):
        """Test ICS subscriptions functionality"""
        print("\n🔍 Testing ICS Subscriptions...")
        
        # Test get ICS subscriptions (should be empty initially)
        success, data = self.make_request('GET', '/ics-subscriptions')
        self.log_test("ICS Subscriptions - Get subscriptions list", success,
                     "" if success else f"Failed to get subscriptions: {data}")
        
        # Test create ICS subscription with a test URL
        # Using a mock ICS URL for testing
        test_ics_url = "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics"
        subscription_data = {
            "url": test_ics_url,
            "name": "Test Calendar Subscription",
            "color": "#ff5722"
        }
        
        success, data = self.make_request('POST', '/ics-subscriptions', subscription_data)
        if success and 'id' in data:
            subscription_id = data['id']
            self.log_test("ICS Subscriptions - Create subscription", True)
            
            # Test get specific subscription events
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            
            success, events_data = self.make_request('GET', f'/ics-subscriptions/{subscription_id}/events?start_date={start_date}&end_date={end_date}')
            self.log_test("ICS Subscriptions - Fetch subscription events", success,
                         "" if success else f"Failed to fetch events: {events_data}")
            
            # Test update subscription
            update_data = {
                "name": "Updated Test Calendar",
                "color": "#2196f3"
            }
            success, updated_data = self.make_request('PUT', f'/ics-subscriptions/{subscription_id}?name=Updated Test Calendar&color=%232196f3')
            self.log_test("ICS Subscriptions - Update subscription", success,
                         "" if success else f"Failed to update subscription: {updated_data}")
            
            # Test get all ICS events
            success, all_events = self.make_request('GET', f'/ics-subscriptions/all-events?start_date={start_date}&end_date={end_date}')
            self.log_test("ICS Subscriptions - Get all ICS events", success,
                         "" if success else f"Failed to get all ICS events: {all_events}")
            
            # Test delete subscription
            success, delete_data = self.make_request('DELETE', f'/ics-subscriptions/{subscription_id}')
            self.log_test("ICS Subscriptions - Delete subscription", success,
                         "" if success else f"Failed to delete subscription: {delete_data}")
            
        else:
            # If the test URL fails, try with a simpler test
            self.log_test("ICS Subscriptions - Create subscription", False,
                         f"Failed to create subscription (may be due to network/URL): {data}")
            
            # Test with invalid URL to check validation
            invalid_subscription = {
                "url": "https://invalid-url-test.com/not-ics",
                "name": "Invalid Test",
                "color": "#ff0000"
            }
            
            success, invalid_data = self.make_request('POST', '/ics-subscriptions', invalid_subscription, expected_status=400)
            self.log_test("ICS Subscriptions - Reject invalid URL", success,
                         "" if success else f"Should have rejected invalid URL: {invalid_data}")

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
        
        # New feature tests for Axis Calendar
        self.test_templates_functionality()
        self.test_enhanced_event_fields()
        self.test_dictionary_functionality()
        self.test_axis_calendar_specific_features()
        
        # Test new recurring events and ICS subscriptions
        self.test_recurring_events()
        self.test_ics_subscriptions()
        
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