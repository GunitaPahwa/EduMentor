from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import hashlib
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import shutil
import tempfile
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# LLM Integration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app without a prefix
app = FastAPI(title="EduMentor API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str

class StudyMaterial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    file_type: str
    extracted_text: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: Optional[List[str]] = None  # For MCQ
    answer: str
    explanation: str
    question_type: str  # "mcq" or "short_answer"

class Quiz(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    material_id: str
    user_id: str
    title: str
    questions: List[QuizQuestion]
    quiz_type: str  # "practice" or "test"
    time_limit: int  # in minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Flashcard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    material_id: str
    user_id: str
    question: str
    answer: str
    explanation: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizResponse(BaseModel):
    quiz_id: str
    user_answers: List[dict]  # {"question_id": str, "answer": str}
    score: Optional[int] = None
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

async def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text from uploaded file using AI"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"extract_{uuid.uuid4()}",
            system_message="You are an expert at extracting and understanding text from documents. Extract all text content accurately while preserving the structure and meaning."
        ).with_model("gemini", "gemini-2.0-flash")

        # Create file attachment
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=get_mime_type(file_type)
        )

        # Send to AI for text extraction
        user_message = UserMessage(
            text="Please extract all text content from this document. Preserve the structure, headings, and important formatting. Return only the extracted text content.",
            file_contents=[file_content]
        )

        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"Error extracting text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")

def get_mime_type(file_type: str) -> str:
    mime_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "txt": "text/plain"
    }
    return mime_types.get(file_type.lower(), "application/octet-stream")

async def generate_quiz_with_ai(text: str, quiz_type: str, question_type: str) -> List[QuizQuestion]:
    """Generate quiz questions using AI"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quiz_{uuid.uuid4()}",
            system_message="You are an expert educational content creator. Generate high-quality quiz questions based on the provided text."
        ).with_model("openai", "gpt-4o")

        time_limit = 15 if question_type == "mcq" else 30
        num_questions = 10

        prompt = f"""
        Based on the following educational content, create {num_questions} {question_type} questions for a {quiz_type}.
        
        Content: {text[:8000]}  # Limit content to avoid token limits
        
        Requirements:
        - Question type: {question_type}
        - Quiz type: {quiz_type}
        - Time limit: {time_limit} minutes
        
        For MCQ questions, provide 4 options (A, B, C, D) with only one correct answer.
        For short answer questions, provide expected key points in the answer.
        
        Please provide detailed explanations for each answer, referencing the source material.
        
        Return the response in this exact JSON format:
        {{
            "questions": [
                {{
                    "question": "Your question here",
                    "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],  // Only for MCQ
                    "answer": "Correct answer",
                    "explanation": "Detailed explanation with reference to source material",
                    "question_type": "{question_type}"
                }}
            ]
        }}
        """

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response - extract JSON from response if it contains other text
        try:
            # Try to parse the response directly
            quiz_data = json.loads(response)
        except json.JSONDecodeError:
            # If direct parsing fails, try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                quiz_data = json.loads(json_str)
            else:
                # If no JSON found, create a fallback response
                logging.warning(f"Could not parse AI response as JSON. Response: {response[:500]}")
                raise ValueError("AI response is not in expected JSON format")
        
        questions = []
        
        for q in quiz_data["questions"]:
            questions.append(QuizQuestion(
                question=q["question"],
                options=q.get("options"),
                answer=q["answer"],
                explanation=q["explanation"],
                question_type=question_type
            ))
        
        return questions
    except Exception as e:
        logging.error(f"Error generating quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

async def generate_flashcards_with_ai(text: str) -> List[Flashcard]:
    """Generate flashcards using AI"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"flashcards_{uuid.uuid4()}",
            system_message="You are an expert at creating educational flashcards that aid in learning and retention."
        ).with_model("openai", "gpt-4o")

        prompt = f"""
        Based on the following educational content, create 15 flashcards for effective studying.
        
        Content: {text[:8000]}
        
        Create flashcards that cover:
        - Key concepts and definitions
        - Important facts and figures
        - Cause and effect relationships
        - Problem-solving examples
        
        Return the response in this exact JSON format:
        {{
            "flashcards": [
                {{
                    "question": "Front of the card - question or concept",
                    "answer": "Back of the card - clear, concise answer",
                    "explanation": "Additional context or explanation to aid understanding"
                }}
            ]
        }}
        """

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response - extract JSON from response if it contains other text
        try:
            # Try to parse the response directly
            flashcard_data = json.loads(response)
        except json.JSONDecodeError:
            # If direct parsing fails, try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                flashcard_data = json.loads(json_str)
            else:
                # If no JSON found, create a fallback response
                logging.warning(f"Could not parse AI response as JSON. Response: {response[:500]}")
                raise ValueError("AI response is not in expected JSON format")
        
        flashcards = []
        
        for fc in flashcard_data["flashcards"]:
            flashcards.append({
                "question": fc["question"],
                "answer": fc["answer"],
                "explanation": fc["explanation"]
            })
        
        return flashcards
    except Exception as e:
        logging.error(f"Error generating flashcards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name
    )
    
    user_dict = new_user.dict()
    user_dict["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"email": user_login.email})
    if not user or not verify_password(user_login.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Study Material routes
@api_router.post("/materials/upload")
async def upload_material(
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    allowed_extensions = {"pdf", "docx", "pptx", "jpg", "jpeg", "png", "txt"}
    file_extension = file.filename.split(".")[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not supported")
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}.{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract text using AI
    extracted_text = await extract_text_from_file(str(file_path), file_extension)
    
    # Save to database
    material = StudyMaterial(
        user_id=current_user.id,
        title=title,
        file_type=file_extension,
        extracted_text=extracted_text
    )
    
    await db.study_materials.insert_one(material.dict())
    
    return {"message": "Material uploaded successfully", "material_id": material.id}

@api_router.get("/materials", response_model=List[StudyMaterial])
async def get_materials(current_user: User = Depends(get_current_user)):
    materials = await db.study_materials.find({"user_id": current_user.id}).to_list(length=None)
    return [StudyMaterial(**material) for material in materials]

@api_router.get("/materials/{material_id}", response_model=StudyMaterial)
async def get_material(material_id: str, current_user: User = Depends(get_current_user)):
    material = await db.study_materials.find_one({"id": material_id, "user_id": current_user.id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return StudyMaterial(**material)

# Quiz routes
@api_router.post("/quiz/generate")
async def generate_quiz(
    material_id: str = Form(...),
    quiz_type: str = Form(...),  # "practice" or "test"
    question_type: str = Form(...),  # "mcq" or "short_answer"
    current_user: User = Depends(get_current_user)
):
    # Get material
    material = await db.study_materials.find_one({"id": material_id, "user_id": current_user.id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Generate questions
    questions = await generate_quiz_with_ai(material["extracted_text"], quiz_type, question_type)
    
    # Create quiz
    time_limit = 15 if question_type == "mcq" else 30
    quiz = Quiz(
        material_id=material_id,
        user_id=current_user.id,
        title=f"{material['title']} - {quiz_type.title()} Quiz",
        questions=questions,
        quiz_type=quiz_type,
        time_limit=time_limit
    )
    
    await db.quizzes.insert_one(quiz.dict())
    
    return quiz

@api_router.post("/quiz/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    quiz_response: QuizResponse,
    current_user: User = Depends(get_current_user)
):
    # Get quiz
    quiz = await db.quizzes.find_one({"id": quiz_id, "user_id": current_user.id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Calculate score
    total_questions = len(quiz["questions"])
    correct_answers = 0
    
    for user_answer in quiz_response.user_answers:
        question_id = user_answer["question_id"]
        user_ans = user_answer["answer"]
        
        # Find the question
        question = next((q for q in quiz["questions"] if q["id"] == question_id), None)
        if question and question["answer"].lower().strip() in user_ans.lower().strip():
            correct_answers += 1
    
    score = int((correct_answers / total_questions) * 100)
    quiz_response.score = score
    
    # Save response
    await db.quiz_responses.insert_one(quiz_response.dict())
    
    return {"score": score, "correct_answers": correct_answers, "total_questions": total_questions}

# Flashcard routes
@api_router.post("/flashcards/generate")
async def generate_flashcards(
    material_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    # Get material
    material = await db.study_materials.find_one({"id": material_id, "user_id": current_user.id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Generate flashcards
    flashcard_data = await generate_flashcards_with_ai(material["extracted_text"])
    
    # Save flashcards
    flashcards = []
    for fc_data in flashcard_data:
        flashcard = Flashcard(
            material_id=material_id,
            user_id=current_user.id,
            question=fc_data["question"],
            answer=fc_data["answer"],
            explanation=fc_data["explanation"]
        )
        flashcards.append(flashcard)
    
    # Insert all flashcards
    flashcard_dicts = [fc.dict() for fc in flashcards]
    await db.flashcards.insert_many(flashcard_dicts)
    
    return flashcards

@api_router.get("/flashcards/{material_id}", response_model=List[Flashcard])
async def get_flashcards(material_id: str, current_user: User = Depends(get_current_user)):
    flashcards = await db.flashcards.find({"material_id": material_id, "user_id": current_user.id}).to_list(length=None)
    return [Flashcard(**flashcard) for flashcard in flashcards]

# Chat/Q&A route
@api_router.post("/chat/ask")
async def ask_question(
    material_id: str = Form(...),
    question: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    # Get material
    material = await db.study_materials.find_one({"id": material_id, "user_id": current_user.id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"chat_{material_id}_{current_user.id}",
            system_message="You are EduMentor, a helpful educational assistant. Explain concepts in simple, easy-to-understand language with examples and analogies when helpful."
        ).with_model("openai", "gpt-4o")

        prompt = f"""
        Based on this educational material, please answer the student's question in simple, easy-to-understand language:
        
        Material Content: {material['extracted_text'][:6000]}
        
        Student's Question: {question}
        
        Please provide:
        1. A clear, simple explanation
        2. Examples or analogies if helpful
        3. Key points to remember
        
        Keep your response educational and encouraging.
        """

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"question": question, "answer": response}
    except Exception as e:
        logging.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()