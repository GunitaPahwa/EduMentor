import requests
import sys
import json
import tempfile
import os
from datetime import datetime
from pathlib import Path

class EduMentorAPITester:
    def __init__(self, base_url="https://quizforge-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.material_id = None
        self.quiz_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, is_form_data=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not is_form_data and not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=60)
                elif is_form_data:
                    response = requests.post(url, data=data, headers=headers, timeout=60)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=60)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test if the API is accessible"""
        try:
            response = requests.get(f"{self.base_url}/docs", timeout=10)
            if response.status_code == 200:
                print("✅ API is accessible - FastAPI docs available")
                return True
            else:
                print(f"❌ API health check failed - Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ API health check failed - Error: {str(e)}")
            return False

    def test_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True, test_user_data
        return False, {}

    def test_login(self, user_data):
        """Test user login"""
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   New token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and 'id' in response:
            self.user_id = response['id']
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def create_test_file(self):
        """Create a test text file for upload"""
        test_content = """
        Introduction to Machine Learning
        
        Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.
        
        Key Concepts:
        1. Supervised Learning - Learning with labeled data
        2. Unsupervised Learning - Finding patterns in unlabeled data  
        3. Reinforcement Learning - Learning through interaction with environment
        
        Applications:
        - Image recognition
        - Natural language processing
        - Recommendation systems
        - Autonomous vehicles
        
        Popular Algorithms:
        - Linear Regression
        - Decision Trees
        - Neural Networks
        - Support Vector Machines
        """
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        temp_file.write(test_content)
        temp_file.close()
        
        return temp_file.name

    def test_upload_material(self):
        """Test file upload and material creation"""
        test_file_path = self.create_test_file()
        
        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_material.txt', f, 'text/plain')}
                data = {'title': 'Machine Learning Basics'}
                
                success, response = self.run_test(
                    "Upload Study Material",
                    "POST",
                    "materials/upload",
                    200,
                    data=data,
                    files=files
                )
                
                if success and 'material_id' in response:
                    self.material_id = response['material_id']
                    print(f"   Material ID: {self.material_id}")
                    return True
                return False
        finally:
            # Clean up temp file
            try:
                os.unlink(test_file_path)
            except:
                pass

    def test_get_materials(self):
        """Test getting user's materials"""
        success, response = self.run_test(
            "Get User Materials",
            "GET",
            "materials",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} materials")
            return True
        return False

    def test_get_material_detail(self):
        """Test getting specific material details"""
        if not self.material_id:
            print("❌ No material ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Material Detail",
            "GET",
            f"materials/{self.material_id}",
            200
        )
        
        if success and 'extracted_text' in response:
            print(f"   Extracted text length: {len(response['extracted_text'])}")
            return True
        return False

    def test_generate_quiz(self):
        """Test quiz generation"""
        if not self.material_id:
            print("❌ No material ID available for quiz generation")
            return False
            
        quiz_data = {
            'material_id': self.material_id,
            'quiz_type': 'practice',
            'question_type': 'mcq'
        }
        
        success, response = self.run_test(
            "Generate Quiz",
            "POST",
            "quiz/generate",
            200,
            data=quiz_data,
            is_form_data=True
        )
        
        if success and 'id' in response and 'questions' in response:
            self.quiz_id = response['id']
            print(f"   Quiz ID: {self.quiz_id}")
            print(f"   Questions generated: {len(response['questions'])}")
            return True
        return False

    def test_submit_quiz(self):
        """Test quiz submission"""
        if not self.quiz_id:
            print("❌ No quiz ID available for submission")
            return False
            
        # Create dummy answers
        user_answers = [
            {"question_id": "dummy_id_1", "answer": "A"},
            {"question_id": "dummy_id_2", "answer": "B"}
        ]
        
        quiz_response = {
            "quiz_id": self.quiz_id,
            "user_answers": user_answers
        }
        
        success, response = self.run_test(
            "Submit Quiz",
            "POST",
            f"quiz/{self.quiz_id}/submit",
            200,
            data=quiz_response
        )
        
        if success and 'score' in response:
            print(f"   Score: {response['score']}%")
            return True
        return False

    def test_generate_flashcards(self):
        """Test flashcard generation"""
        if not self.material_id:
            print("❌ No material ID available for flashcard generation")
            return False
            
        flashcard_data = {
            'material_id': self.material_id
        }
        
        success, response = self.run_test(
            "Generate Flashcards",
            "POST",
            "flashcards/generate",
            200,
            data=flashcard_data,
            is_form_data=True
        )
        
        if success and isinstance(response, list):
            print(f"   Flashcards generated: {len(response)}")
            return True
        return False

    def test_get_flashcards(self):
        """Test getting flashcards for a material"""
        if not self.material_id:
            print("❌ No material ID available for getting flashcards")
            return False
            
        success, response = self.run_test(
            "Get Flashcards",
            "GET",
            f"flashcards/{self.material_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Retrieved {len(response)} flashcards")
            return True
        return False

    def test_chat_ask(self):
        """Test chat/Q&A functionality"""
        if not self.material_id:
            print("❌ No material ID available for chat")
            return False
            
        chat_data = {
            'material_id': self.material_id,
            'question': 'What is machine learning?'
        }
        
        success, response = self.run_test(
            "Ask Question (Chat)",
            "POST",
            "chat/ask",
            200,
            data=chat_data,
            is_form_data=True
        )
        
        if success and 'answer' in response:
            print(f"   Answer length: {len(response['answer'])}")
            return True
        return False

def main():
    print("🚀 Starting EduMentor API Tests")
    print("=" * 50)
    
    tester = EduMentorAPITester()
    
    # Test API accessibility
    if not tester.test_health_check():
        print("❌ API is not accessible. Stopping tests.")
        return 1
    
    # Test authentication flow
    print("\n📝 Testing Authentication...")
    success, user_data = tester.test_register()
    if not success:
        print("❌ Registration failed. Stopping tests.")
        return 1
    
    if not tester.test_login(user_data):
        print("❌ Login failed. Stopping tests.")
        return 1
    
    if not tester.test_get_me():
        print("❌ Get user info failed. Stopping tests.")
        return 1
    
    # Test material management
    print("\n📚 Testing Material Management...")
    if not tester.test_upload_material():
        print("❌ Material upload failed. Stopping tests.")
        return 1
    
    if not tester.test_get_materials():
        print("❌ Get materials failed.")
    
    if not tester.test_get_material_detail():
        print("❌ Get material detail failed.")
    
    # Test AI features (these might take longer)
    print("\n🤖 Testing AI Features...")
    print("⚠️  AI features may take 10-30 seconds each...")
    
    if not tester.test_generate_quiz():
        print("❌ Quiz generation failed.")
    else:
        # Only test quiz submission if generation succeeded
        tester.test_submit_quiz()
    
    if not tester.test_generate_flashcards():
        print("❌ Flashcard generation failed.")
    else:
        tester.test_get_flashcards()
    
    if not tester.test_chat_ask():
        print("❌ Chat functionality failed.")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())