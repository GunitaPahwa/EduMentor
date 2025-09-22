import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import Shadcn components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Progress } from './components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Separator } from './components/ui/separator';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';

// Icons from lucide-react
import { 
  Upload, 
  BookOpen, 
  Brain, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User, 
  LogOut,
  Home,
  Plus,
  MessageCircle,
  GraduationCap,
  Star,
  ArrowRight,
  Play,
  Timer,
  Award
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email, password, full_name) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { email, password, full_name });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return React.useContext(AuthContext);
}

// Auth Components
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (!success) {
      alert('Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-purple-800">Welcome Back</CardTitle>
        <CardDescription>Sign in to your EduMentor account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await register(email, password, fullName);
    if (!success) {
      alert('Registration failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-purple-800">Create Account</CardTitle>
        <CardDescription>Join EduMentor and start learning smarter</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-purple-600 mr-2" />
            <h1 className="text-4xl font-bold text-purple-800">EduMentor</h1>
          </div>
          <p className="text-gray-600">Your AI-powered study companion</p>
        </div>

        {isLogin ? <LoginForm /> : <RegisterForm />}

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-700"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main App Components
function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-purple-600 mr-2" />
            <span className="text-xl font-bold text-purple-800">EduMentor</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">{user?.full_name}</span>
            </div>
            <Button variant="outline" onClick={logout} className="text-purple-600 border-purple-200">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/materials`);
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const title = prompt('Enter a title for this study material:');
    if (!title) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    try {
      await axios.post(`${API}/materials/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchMaterials();
      alert('Material uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-purple-800 mb-2">Upload Study Materials</h1>
        <p className="text-gray-600">Upload your notes, PDFs, or documents to get started</p>
      </div>

      {/* Upload Area */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {uploading ? 'Processing your file...' : 'Drop your files here or click to browse'}
            </h3>
            <p className="text-gray-500 mb-4">
              Supports PDF, DOCX, PPTX, JPG, PNG files
            </p>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.txt"
              disabled={uploading}
            />
            <Button 
              onClick={() => document.getElementById('file-upload').click()}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Choose Files'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-purple-800">Your Study Materials</h2>
        {materials.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No materials uploaded yet. Upload your first document to get started!</p>
            </CardContent>
          </Card>
        ) : (
          materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))
        )}
      </div>
    </div>
  );
}

function MaterialCard({ material }) {
  const navigate = useNavigate();
  
  const handleStudyClick = () => {
    navigate(`/material/${material.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{material.title}</h3>
              <p className="text-sm text-gray-500">
                {material.file_type.toUpperCase()} • {new Date(material.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleStudyClick}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Study
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialDetailPage({ materialId }) {
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMaterial();
  }, [materialId]);

  const fetchMaterial = async () => {
    try {
      const response = await axios.get(`${API}/materials/${materialId}`);
      setMaterial(response.data);
    } catch (error) {
      console.error('Error fetching material:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!material) {
    return <div className="text-center text-red-500">Material not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="text-purple-600 mb-4"
        >
          ← Back to Materials
        </Button>
        <h1 className="text-3xl font-bold text-purple-800">{material.title}</h1>
        <p className="text-gray-600">Study with AI-powered tools</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="chat">Ask Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab material={material} />
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <QuizTab materialId={materialId} />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-6">
          <FlashcardsTab materialId={materialId} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatTab materialId={materialId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ material }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
            Material Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">File Type</Label>
              <p className="text-lg">{material.file_type.toUpperCase()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Uploaded</Label>
              <p className="text-lg">{new Date(material.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-6">
            <Label className="text-sm font-medium text-gray-500">Extracted Content Preview</Label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {material.extracted_text.substring(0, 500)}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-800">Generate Quiz</h3>
            <p className="text-sm text-gray-500 mt-2">Test your knowledge with AI-generated questions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Star className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-800">Create Flashcards</h3>
            <p className="text-sm text-gray-500 mt-2">Review key concepts with smart flashcards</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-800">Ask Questions</h3>
            <p className="text-sm text-gray-500 mt-2">Get explanations in simple language</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuizTab({ materialId }) {
  const [quizSettings, setQuizSettings] = useState({
    quiz_type: 'practice',
    question_type: 'mcq'
  });
  const [generating, setGenerating] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);

  const generateQuiz = async () => {
    setGenerating(true);
    const formData = new FormData();
    formData.append('material_id', materialId);
    formData.append('quiz_type', quizSettings.quiz_type);
    formData.append('question_type', quizSettings.question_type);

    try {
      const response = await axios.post(`${API}/quiz/generate`, formData);
      setCurrentQuiz(response.data);
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (currentQuiz) {
    return <QuizPlayer quiz={currentQuiz} onComplete={() => setCurrentQuiz(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Generate Quiz
          </CardTitle>
          <CardDescription>
            Create personalized quizzes from your study material
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quiz Type</Label>
              <Select value={quizSettings.quiz_type} onValueChange={(value) => 
                setQuizSettings({...quizSettings, quiz_type: value})
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice (with answers)</SelectItem>
                  <SelectItem value="test">Test (timed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Question Type</Label>
              <Select value={quizSettings.question_type} onValueChange={(value) => 
                setQuizSettings({...quizSettings, question_type: value})
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (15 min)</SelectItem>
                  <SelectItem value="short_answer">Short Answer (30 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={generateQuiz} 
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={generating}
          >
            {generating ? 'Generating Quiz...' : 'Generate Quiz'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuizPlayer({ quiz, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit * 60); // Convert to seconds
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (quiz.quiz_type === 'test' && timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResults) {
      handleSubmit();
    }
  }, [timeLeft, showResults]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmit = async () => {
    const userAnswers = Object.keys(answers).map(questionId => ({
      question_id: questionId,
      answer: answers[questionId] || ''
    }));

    try {
      const response = await axios.post(`${API}/quiz/${quiz.id}/submit`, {
        quiz_id: quiz.id,
        user_answers: userAnswers
      });
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-purple-600" />
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {results.score}%
            </div>
            <p className="text-gray-600">
              You got {results.correct_answers} out of {results.total_questions} questions correct
            </p>
          </div>
          
          <div className="space-y-4">
            {quiz.questions.map((question, index) => (
              <Card key={question.id} className="p-4">
                <div className="flex items-start space-x-2">
                  {answers[question.id] && question.answer.toLowerCase().includes(answers[question.id].toLowerCase()) ? 
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" /> :
                    <XCircle className="h-5 w-5 text-red-500 mt-1" />
                  }
                  <div className="flex-1">
                    <p className="font-medium">{question.question}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Correct Answer:</strong> {question.answer}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{question.explanation}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <Button onClick={onComplete} className="w-full mt-6 bg-purple-600 hover:bg-purple-700">
            Back to Material
          </Button>
        </CardContent>
      </Card>
    );
  }

  const question = quiz.questions[currentQuestion];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Play className="h-5 w-5 mr-2 text-purple-600" />
            {quiz.title}
          </CardTitle>
          {quiz.quiz_type === 'test' && (
            <div className="flex items-center space-x-2 text-purple-600">
              <Timer className="h-4 w-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
          <Progress value={(currentQuestion + 1) / quiz.questions.length * 100} className="w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{question.question}</h3>
          
          {question.question_type === 'mcq' ? (
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <label key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="text-purple-600"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              placeholder="Type your answer here..."
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="min-h-[100px]"
            />
          )}

          {quiz.quiz_type === 'practice' && answers[question.id] && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Explanation</AlertTitle>
              <AlertDescription>{question.explanation}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          {currentQuestion === quiz.questions.length - 1 ? (
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FlashcardsTab({ materialId }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const generateFlashcards = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('material_id', materialId);

    try {
      const response = await axios.post(`${API}/flashcards/generate`, formData);
      setFlashcards(response.data);
      setCurrentCard(0);
      setShowAnswer(false);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashcards = async () => {
    try {
      const response = await axios.get(`${API}/flashcards/${materialId}`);
      setFlashcards(response.data);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, [materialId]);

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2 text-purple-600" />
            Flashcards
          </CardTitle>
          <CardDescription>
            Create flashcards to review key concepts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={generateFlashcards} 
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? 'Generating Flashcards...' : 'Generate Flashcards'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const flashcard = flashcards[currentCard];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-purple-800">Flashcards</h2>
        <div className="text-sm text-gray-500">
          {currentCard + 1} of {flashcards.length}
        </div>
      </div>

      <Card className="min-h-[300px] cursor-pointer" onClick={() => setShowAnswer(!showAnswer)}>
        <CardContent className="p-8 flex flex-col justify-center items-center text-center h-[300px]">
          {!showAnswer ? (
            <div>
              <h3 className="text-xl font-medium mb-4 text-purple-800">Question</h3>
              <p className="text-lg">{flashcard.question}</p>
              <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-purple-800">Answer</h3>
              <p className="text-lg">{flashcard.answer}</p>
              <Separator />
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Explanation</h4>
                <p className="text-sm text-gray-600">{flashcard.explanation}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setCurrentCard(Math.max(0, currentCard - 1));
            setShowAnswer(false);
          }}
          disabled={currentCard === 0}
        >
          Previous
        </Button>
        
        <Button
          onClick={() => setShowAnswer(!showAnswer)}
          variant="outline"
          className="text-purple-600 border-purple-200"
        >
          {showAnswer ? 'Show Question' : 'Show Answer'}
        </Button>

        <Button
          onClick={() => {
            setCurrentCard(Math.min(flashcards.length - 1, currentCard + 1));
            setShowAnswer(false);
          }}
          disabled={currentCard === flashcards.length - 1}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Next
        </Button>
      </div>

      <Progress value={(currentCard + 1) / flashcards.length * 100} className="w-full" />
    </div>
  );
}

function ChatTab({ materialId }) {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    const currentQuestion = question;
    setQuestion('');

    // Add user question to chat
    setChatHistory(prev => [...prev, { type: 'user', content: currentQuestion }]);

    const formData = new FormData();
    formData.append('material_id', materialId);
    formData.append('question', currentQuestion);

    try {
      const response = await axios.post(`${API}/chat/ask`, formData);
      setChatHistory(prev => [...prev, { type: 'ai', content: response.data.answer }]);
    } catch (error) {
      console.error('Error asking question:', error);
      setChatHistory(prev => [...prev, { type: 'error', content: 'Failed to get answer. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-purple-600" />
            Ask EduMentor
          </CardTitle>
          <CardDescription>
            Get explanations and clarifications about your study material
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Ask any question about your study material!</p>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : message.type === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-600">EduMentor is thinking...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Textarea
              placeholder="Ask a question about your study material..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              rows={2}
            />
            <Button 
              onClick={askQuestion} 
              disabled={loading || !question.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading EduMentor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-purple-50">
      <Navbar />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/material/:materialId" element={<MaterialRouter />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

function MaterialRouter() {
  const { materialId } = useParams();
  return materialId ? <MaterialDetailPage materialId={materialId} /> : <Navigate to="/" />;
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;