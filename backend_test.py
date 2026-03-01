import requests
import sys
import json
from datetime import datetime, timedelta
import io
import os

class VehicleManagementTester:
    def __init__(self, base_url="https://fleet-track-39.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_vehicle_id = None
        
        # Test data
        self.test_user = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "testpass123"
        }
        
        today = datetime.now().strftime("%Y-%m-%d")
        future_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        self.test_vehicle = {
            "nickname": "Test Car",
            "reg_number": "MH01AB1234",
            "vehicle_type": "Car", 
            "brand": "Honda",
            "model": "City",
            "year": 2020,
            "fuel_type": "Petrol",
            "odometer": 15000,
            "documents": [
                {
                    "doc_type": "insurance",
                    "issue_date": today,
                    "expiry_date": future_date
                }
            ],
            "challans": [
                {
                    "challan_number": "CH123456",
                    "date": today,
                    "amount": 500.0,
                    "reason": "Over speeding",
                    "status": "unpaid"
                }
            ],
            "services": [
                {
                    "service_type": "Oil Change",
                    "date": today,
                    "odometer": 15000,
                    "cost": 2500.0,
                    "description": "Full service",
                    "next_service_due": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
                }
            ]
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type header for multipart data
                    headers.pop('Content-Type', None)
                    response = requests.post(url, headers=headers, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)[:300]}...")
                except:
                    print("Response: Non-JSON data")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:500]}...")

            return success, response.json() if response.content and response.status_code != 204 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=self.test_user
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"✅ Registered user: {self.user_data['email']}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login", 
            "POST",
            "auth/login",
            200,
            data={"email": self.test_user["email"], "password": self.test_user["password"]}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Login successful for: {response['user']['email']}")
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET", 
            "auth/me",
            200
        )
        if success and 'email' in response:
            print(f"✅ Profile retrieved: {response['email']}")
            return True
        return False

    def test_dashboard_stats_empty(self):
        """Test dashboard stats with no vehicles - should have 7 fields now"""
        success, response = self.run_test(
            "Dashboard Stats (Empty)",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            expected_fields = ['total_vehicles', 'expired_documents', 'expiring_soon', 'valid_documents', 
                             'total_challans', 'unpaid_challans', 'upcoming_services']
            has_all_fields = all(field in response for field in expected_fields)
            if has_all_fields and response['total_vehicles'] == 0:
                print("✅ Empty dashboard stats correct - all 7 fields present")
                return True
            else:
                missing_fields = [f for f in expected_fields if f not in response]
                print(f"❌ Dashboard stats structure incorrect. Missing: {missing_fields}")
                print(f"Response: {response}")
        return False

    def test_get_vehicles_empty(self):
        """Test getting vehicles when none exist"""
        success, response = self.run_test(
            "Get Vehicles (Empty)",
            "GET",
            "vehicles",
            200
        )
        if success and isinstance(response, list) and len(response) == 0:
            print("✅ Empty vehicles list correct")
            return True
        return False

    def test_create_vehicle(self):
        """Test creating a new vehicle with documents, challans and services"""
        success, response = self.run_test(
            "Create Vehicle (with all sections)",
            "POST",
            "vehicles",
            200,
            data=self.test_vehicle
        )
        if success and 'id' in response:
            self.test_vehicle_id = response['id']
            docs_count = len(response.get('documents', []))
            challans_count = len(response.get('challans', []))
            services_count = len(response.get('services', []))
            print(f"✅ Vehicle created with ID: {self.test_vehicle_id}")
            print(f"   Documents: {docs_count}, Challans: {challans_count}, Services: {services_count}")
            
            # Verify all sections were saved
            if docs_count == 1 and challans_count == 1 and services_count == 1:
                print("✅ All sections (documents, challans, services) saved correctly")
                return True
            else:
                print("❌ Not all sections saved correctly")
        return False

    def test_get_vehicle_by_id(self):
        """Test getting specific vehicle"""
        if not self.test_vehicle_id:
            print("❌ No vehicle ID available for test")
            return False
        
        success, response = self.run_test(
            "Get Vehicle by ID",
            "GET",
            f"vehicles/{self.test_vehicle_id}",
            200
        )
        if success and response.get('id') == self.test_vehicle_id:
            print(f"✅ Vehicle retrieved: {response['nickname']}")
            print(f"Vehicle status: {response.get('status', 'unknown')}")
            return True
        return False

    def test_get_vehicles_with_data(self):
        """Test getting vehicles list with data"""
        success, response = self.run_test(
            "Get Vehicles (With Data)",
            "GET", 
            "vehicles",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            vehicle = response[0]
            print(f"✅ Vehicles list returned {len(response)} vehicles")
            print(f"First vehicle: {vehicle['nickname']} - Status: {vehicle.get('status')}")
            return True
        return False

    def test_dashboard_stats_with_data(self):
        """Test dashboard stats with vehicles"""
        success, response = self.run_test(
            "Dashboard Stats (With Data)",
            "GET",
            "dashboard/stats", 
            200
        )
        if success:
            print(f"✅ Dashboard stats: Total={response['total_vehicles']}, Valid={response['valid_documents']}, Expiring={response['expiring_soon']}, Expired={response['expired_documents']}")
            return response['total_vehicles'] > 0
        return False

    def test_update_vehicle(self):
        """Test updating vehicle"""
        if not self.test_vehicle_id:
            print("❌ No vehicle ID available for update test")
            return False

        update_data = {
            "nickname": "Updated Test Car",
            "odometer": 20000
        }
        
        success, response = self.run_test(
            "Update Vehicle",
            "PUT",
            f"vehicles/{self.test_vehicle_id}",
            200,
            data=update_data
        )
        if success and response.get('nickname') == update_data['nickname']:
            print(f"✅ Vehicle updated successfully")
            return True
        return False

    def test_file_upload(self):
        """Test file upload functionality"""
        # Create a simple test file
        test_file_content = b"This is a test file for document upload"
        test_file = io.BytesIO(test_file_content)
        
        files = {
            'file': ('test_document.txt', test_file, 'text/plain')
        }
        
        success, response = self.run_test(
            "File Upload",
            "POST",
            "upload",
            200,
            files=files
        )
        if success and 'path' in response:
            print(f"✅ File uploaded successfully: {response['path']}")
            return True
        return False

    def test_invalid_registration(self):
        """Test registration with invalid data"""
        invalid_user = {
            "name": "Test",
            "email": "invalid-email",  # Invalid email format
            "password": "123"  # Too short password
        }
        
        success, response = self.run_test(
            "Invalid Registration",
            "POST",
            "auth/register", 
            422,  # Validation error expected
            data=invalid_user
        )
        if success:
            print("✅ Invalid registration properly rejected")
            return True
        return False

    def test_invalid_login(self):
        """Test login with wrong credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,  # Unauthorized expected
            data={"email": self.test_user["email"], "password": "wrongpassword"}
        )
        if success:
            print("✅ Invalid login properly rejected")
            return True
        return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without auth"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "vehicles",
            403  # Forbidden expected
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print("✅ Unauthorized access properly blocked")
            return True
        return False

    def test_delete_vehicle(self):
        """Test deleting vehicle (should be last test)"""
        if not self.test_vehicle_id:
            print("❌ No vehicle ID available for delete test")
            return False
        
        success, response = self.run_test(
            "Delete Vehicle", 
            "DELETE",
            f"vehicles/{self.test_vehicle_id}",
            200
        )
        if success:
            print("✅ Vehicle deleted successfully")
            return True
        return False

def main():
    print("🚀 Starting Vehicle Management Dashboard API Tests")
    print("=" * 50)
    
    # Initialize tester
    tester = VehicleManagementTester()
    
    # Test sequence
    test_sequence = [
        # Authentication tests
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login),
        ("Get User Profile", tester.test_get_user_profile),
        
        # Empty state tests
        ("Dashboard Stats (Empty)", tester.test_dashboard_stats_empty),
        ("Get Vehicles (Empty)", tester.test_get_vehicles_empty),
        
        # Vehicle CRUD tests
        ("Create Vehicle", tester.test_create_vehicle),
        ("Get Vehicle by ID", tester.test_get_vehicle_by_id),
        ("Get Vehicles (With Data)", tester.test_get_vehicles_with_data),
        ("Dashboard Stats (With Data)", tester.test_dashboard_stats_with_data),
        ("Update Vehicle", tester.test_update_vehicle),
        ("File Upload", tester.test_file_upload),
        
        # Error handling tests
        ("Invalid Registration", tester.test_invalid_registration),
        ("Invalid Login", tester.test_invalid_login),
        ("Unauthorized Access", tester.test_unauthorized_access),
        
        # Cleanup
        ("Delete Vehicle", tester.test_delete_vehicle),
    ]
    
    # Run all tests
    for test_name, test_func in test_sequence:
        try:
            result = test_func()
            if not result:
                print(f"⚠️ Test '{test_name}' failed but continuing...")
        except Exception as e:
            print(f"💥 Test '{test_name}' crashed: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())