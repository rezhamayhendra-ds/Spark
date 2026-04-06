import React, { useState, useEffect } from 'react';
import { auth, db, storage, googleProvider, OperationType, handleFirestoreError, messaging, getToken, onMessage } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser, signInWithEmailAndPassword, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, Request, UserRole, RequestStatus, Feedback, Activity } from './types';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Users, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  Star,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Key,
  Mail,
  Calendar,
  Fingerprint,
  Briefcase,
  Phone,
  FileDown,
  Check,
  RotateCcw,
  Pause,
  UserPlus,
  ListTodo,
  History,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  FileUp,
  Trash2
} from 'lucide-react';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  LabelList 
} from 'recharts';

const SPARK_LOGO = "https://lh3.googleusercontent.com/d/13IBYi7NKb4lliQ-x0pNTLz2DhJsTqOhI";

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <motion.div
      animate={{ 
        opacity: [0.4, 1, 0.4],
        scale: [0.98, 1.02, 0.98]
      }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className="mb-4"
    >
      <img src={SPARK_LOGO} className="w-40 h-auto object-contain" alt="SPARK" referrerPolicy="no-referrer" />
    </motion.div>
    <h2 className="text-xl font-bold text-gray-900 font-sans tracking-tight">SPARK</h2>
    <p className="text-sm text-gray-500 font-mono mt-2 uppercase tracking-widest">Initializing...</p>
  </div>
);

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  isDanger = true 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  confirmText?: string; 
  cancelText?: string;
  isDanger?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "p-2 rounded-xl",
                isDanger ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
              )}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
            </div>
            <p className="text-gray-500 leading-relaxed">{message}</p>
          </div>
          <div className="bg-gray-50 p-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm",
                isDanger ? "bg-red-600 hover:bg-red-700 shadow-red-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              )}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorMsg(event.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-8 bg-red-50 text-red-900 rounded-2xl m-4 border border-red-100 shadow-sm">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-6 h-6" />
          Something went wrong
        </h2>
        <p className="font-mono text-sm opacity-80 break-all">{errorMsg}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Reload Application
        </button>
      </div>
    );
  }
  return <>{children}</>;
};

// --- Onboarding ---
const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to SPARK",
      description: "Solution Proposal and Request Kit. A modern platform for Digital Solution team to serve you better.",
      icon: <img src={SPARK_LOGO} className="w-96 h-auto object-contain" alt="SPARK" referrerPolicy="no-referrer" />,
      bg: "bg-indigo-50"
    },
    {
      title: "Capture Problems",
      description: "Submit your internal or external customer requests directly. We analyze every detail to find the best fit.",
      icon: <ClipboardList className="w-16 h-16 text-emerald-600" />,
      bg: "bg-emerald-50"
    },
    {
      title: "Track Progress",
      description: "Real-time visibility into your request status. From initial review to final solution delivery.",
      icon: <Clock className="w-16 h-16 text-amber-600" />,
      bg: "bg-amber-50"
    }
  ];

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        >
          <div className={cn(
            step === 0 ? "p-0 mb-2" : "p-8 rounded-full mb-8", 
            steps[step].bg
          )}>
            {steps[step].icon}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">{steps[step].title}</h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-xs">{steps[step].description}</p>
        </motion.div>
      </AnimatePresence>
      
      <div className="p-8 flex items-center justify-between">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-indigo-600" : "w-2 bg-gray-200"
              )} 
            />
          ))}
        </div>
        <button
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          {step === steps.length - 1 ? "Get Started" : "Next"}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// --- Auth ---
const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const role: UserRole = user.email?.endsWith('@pancaran-logistic.id') ? 'Admin' : 'Internal Customer';
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: role,
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`,
          department: 'General',
          isProfileComplete: false,
          createdAt: serverTimestamp(),
          lastViewedUsersAt: serverTimestamp(),
          lastViewedRequestsAt: serverTimestamp()
        });
      }
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        const role: UserRole = user.email === 'rezha.mayhendra@pancaran-logistic.id' ? 'Admin' : 'Internal Customer';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          role: role,
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`,
          department: 'General',
          isProfileComplete: false,
          createdAt: serverTimestamp(),
          lastViewedUsersAt: serverTimestamp(),
          lastViewedRequestsAt: serverTimestamp()
        });
      }
      onLogin();
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/50 border border-indigo-50"
      >
        <div className="flex justify-center mb-6">
          <img src={SPARK_LOGO} className="w-72 h-auto object-contain" alt="SPARK" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2 tracking-tight">Welcome back to SPARK</h1>
        <p className="text-gray-500 text-center mb-8">Sign in to manage your solution requests</p>
        
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={handleForgotPassword}
              className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-mono">Or continue with</span></div>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-4 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Google Account
        </button>
        
        <p className="mt-8 text-center text-xs text-gray-400 font-mono uppercase tracking-widest">
          Digital Solution Department
        </p>
      </motion.div>
    </div>
  );
};

// --- Dashboard ---
const Dashboard = ({ user }: { user: UserProfile }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isRequestsPath = location.pathname === '/requests';
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; requestId: string | null }>({
    isOpen: false,
    requestId: null
  });

  useEffect(() => {
    const q = user.role === 'Admin' 
      ? query(collection(db, 'requests'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'requests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    let unsubscribeFeedback = () => {};
    let unsubscribeUsers = () => {};

    if (user.role === 'Admin') {
      const fq = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      unsubscribeFeedback = onSnapshot(fq, (snapshot) => {
        setFeedback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'feedback');
      });

      const uq = query(collection(db, 'users'));
      unsubscribeUsers = onSnapshot(uq, (snapshot) => {
        setTotalUsers(snapshot.size);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
    }

    return () => {
      unsubscribe();
      unsubscribeFeedback();
      unsubscribeUsers();
    };
  }, [user]);

  // Calculations for Admin
  const totalInquiries = requests.length;
  const openRequests = requests.filter(r => r.status === 'Submitted' || r.status === 'Review' || r.status === 'Solution Proposed').length;
  const inProgress = requests.filter(r => r.status === 'Approved' || r.status === 'In Progress' || r.status === 'UAT').length;
  const completed = requests.filter(r => r.status === 'Completed').length;
  const achievementRate = totalInquiries > 0 ? Math.round((completed / totalInquiries) * 100) : 0;

  const handleDeleteClick = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, requestId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.requestId) return;
    try {
      const batch = writeBatch(db);
      
      // Delete request
      batch.delete(doc(db, 'requests', deleteConfirm.requestId));
      
      // Find and delete related solutions
      const solSnap = await getDocs(query(collection(db, 'solutions'), where('requestId', '==', deleteConfirm.requestId)));
      solSnap.forEach(d => batch.delete(d.ref));
      
      // Find and delete related feedback
      const feedSnap = await getDocs(query(collection(db, 'feedback'), where('requestId', '==', deleteConfirm.requestId)));
      feedSnap.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      setDeleteConfirm({ isOpen: false, requestId: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'requests');
    }
  };

  const categoryData = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: value as number }))
   .sort((a, b) => b.value - a.value);

  const deptData = Object.entries(
    requests.reduce((acc, r) => {
      const dept = r.department || 'General';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: value as number }))
   .sort((a, b) => b.value - a.value);

  const userData = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.userName || 'Unknown'] = (acc[r.userName || 'Unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: value as number }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 5);

  const avgCsat = feedback.length > 0 
    ? (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1)
    : '0.0';

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (user.role === 'Admin') {
    return (
      <div className="space-y-8 pb-12">
        {!isRequestsPath && (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-gray-500">Overview of Digital Solution performance and requests.</p>
            </header>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Inquiries', value: totalInquiries, icon: <ClipboardList />, color: 'bg-indigo-500' },
                { label: 'Open Requests', value: openRequests, icon: <Clock />, color: 'bg-amber-500' },
                { label: 'In Progress', value: inProgress, icon: <Zap />, color: 'bg-blue-500' },
                { label: 'Completed', value: completed, icon: <CheckCircle2 />, color: 'bg-emerald-500' },
                { label: 'Success Rate', value: `${achievementRate}%`, icon: <Sparkles />, color: 'bg-violet-500' },
                { label: 'Total Users', value: totalUsers, icon: <Users />, color: 'bg-slate-500' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center"
                >
                  <div className={cn("p-2 rounded-xl text-white mb-2", stat.color)}>
                    {React.cloneElement(stat.icon as React.ReactElement, { className: "w-5 h-5" })}
                  </div>
                  <span className="text-xl font-bold text-gray-900">{stat.value}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 leading-tight mt-1">{stat.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Row 2: Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Categories */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Top Categories</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" hide domain={[0, 'dataMax + 1']} />
                      <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: '600' }} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="value" position="right" style={{ fill: '#4b5563', fontSize: '12px', fontWeight: '700' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Departments */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Top Departments</h3>
                <div className="flex flex-col h-full">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ value }) => `${value}`}
                        >
                          {deptData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 gap-2 mt-4 px-2 overflow-hidden">
                    {deptData.slice(0, 4).map((d, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] font-bold text-gray-600 truncate">{d.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex-shrink-0">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Requesters */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Top Requesters</h3>
                <div className="space-y-4">
                  {userData.map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="font-bold text-gray-700">{u.name}</span>
                      </div>
                      <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-indigo-600 border border-indigo-50">
                        {u.value} Requests
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CSAT Score */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Satisfaction</h3>
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (parseFloat(avgCsat) / 5) * 364.4} className="text-indigo-600" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{avgCsat}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Rating</span>
                  </div>
                </div>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-5 h-5", s <= Math.round(parseFloat(avgCsat)) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 font-medium">Based on {feedback.length} user reviews</p>
              </div>
            </div>
          </>
        )}

        {/* Row 3: Live Monitoring Table */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{isRequestsPath ? "All Requests" : "Live Monitoring"}</h3>
            {!isRequestsPath && (
              <button onClick={() => navigate('/requests')} className="text-indigo-600 text-xs font-bold hover:underline">View All</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Request Title</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Urgency</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Requester</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(isRequestsPath ? requests : requests.slice(0, 5)).map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/requests/${req.id}`)}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 truncate max-w-[200px]">{req.title}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{format(req.createdAt.toDate(), 'HH:mm - MMM d')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{req.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        req.urgency === 'Urgent' || req.urgency === 'High' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                      )}>
                        {req.urgency || req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-700">{req.userName}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-tight">{req.department || 'General'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        req.status === 'Completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={(e) => handleDeleteClick(e, req.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, requestId: null })}
          onConfirm={confirmDelete}
          title="Delete Request"
          message="Are you sure you want to delete this request? This action will also delete all related solutions and feedback. This cannot be undone."
        />
      </div>
    );
  }

  // Customer View (Keep it consistent but simple)
  const stats = [
    { label: 'Total', value: requests.length, icon: <ClipboardList />, color: 'bg-indigo-500' },
    { label: 'Pending', value: requests.filter(r => r.status === 'Submitted' || r.status === 'Review').length, icon: <Clock />, color: 'bg-amber-500' },
    { label: 'Completed', value: requests.filter(r => r.status === 'Completed').length, icon: <CheckCircle2 />, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      {!isRequestsPath && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hello, {user.displayName.split(' ')[0]}!</h1>
            <p className="text-gray-500">Here's what's happening with your requests.</p>
          </header>

          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center"
              >
                <div className={cn("p-2 rounded-xl text-white mb-2", stat.color)}>
                  {React.cloneElement(stat.icon as React.ReactElement, { className: "w-5 h-5" })}
                </div>
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{isRequestsPath ? "All Requests" : "Recent Requests"}</h2>
          {!isRequestsPath && (
            <button 
              onClick={() => navigate('/requests')}
              className="text-indigo-600 text-sm font-semibold flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-4">
            {(isRequestsPath ? requests : requests.slice(0, 3)).map((req) => (
              <motion.div 
                key={req.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/requests/${req.id}`)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  req.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{req.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                      req.urgency === 'Urgent' || req.urgency === 'High' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {req.urgency || req.priority}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(req.createdAt.toDate(), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    req.status === 'Completed' ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {req.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center text-center">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <ClipboardList className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 mb-6">No requests found. Start by creating one!</p>
            <button 
              onClick={() => navigate('/new-request')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              New Request
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

// --- Request Form ---
const RequestForm = ({ user }: { user: UserProfile }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: 'Digital Platform Development',
    userName: user.displayName || '',
    nik: user.nik || '',
    waNumber: user.waNumber || '',
    division: user.division || 'Commercial',
    department: user.department || 'Commercial Digital Solution',
    problemStatement: '',
    expectedOutcome: '',
    businessImpact: 'Medium',
    urgency: 'Normal',
    attachmentUrl: ''
  });

  const categories = [
    'Digital Platform Development',
    'Dashboard & Data Visualization',
    'Data Analysis & Insight',
    'Business & Technology Research',
    'Business Process Improvement',
    'Operational Problem Solving',
    'Consultation & Advisory',
    'Others'
  ];

  const divisions = [
    'Commercial',
    'Operational',
    'Business Support',
    'Non Division',
    'Other'
  ];

  const departments = [
    'Commercial Digital Solution',
    'Commercial Heavy Transport Equipment',
    'Commercial Heavy Duty Equipment',
    'Commercial Integrated Logistic Service',
    'Customer Services',
    'Vendor Management',
    'HC&GS',
    'Business Control',
    'Strategic Planning & Improvement',
    'IT',
    'Operation',
    'Business Support'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'requests'), {
        ...formData,
        userId: user.uid,
        status: 'Submitted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate('/requests');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">New Request</h1>
        <p className="text-gray-500">Tell us about the problem or requirement.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Basic Info */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Basic Information</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Request Title</label>
            <p className="text-[10px] text-indigo-500 font-medium italic">👉 Judul singkat (1 kalimat)</p>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Automation of Daily Reporting"
              className="w-full p-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Category</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </section>

        {/* Section: Requester Info */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Requester Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Name</label>
              <input 
                required
                value={formData.userName}
                onChange={e => setFormData({...formData, userName: e.target.value})}
                className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">NIK</label>
              <input 
                required
                value={formData.nik}
                onChange={e => setFormData({...formData, nik: e.target.value})}
                className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">No WA</label>
              <input 
                required
                type="tel"
                value={formData.waNumber}
                onChange={e => setFormData({...formData, waNumber: e.target.value})}
                placeholder="e.g., 08123456789"
                className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Division</label>
              <select 
                value={formData.division}
                onChange={e => setFormData({...formData, division: e.target.value})}
                className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
              >
                {divisions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Department</label>
            <select 
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
              className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </section>

        {/* Section: Problem & Outcome */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Problem & Expected Outcome</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Problem Statement</label>
            <p className="text-[10px] text-indigo-500 font-medium italic">👉 Jelaskan masalah yang sedang terjadi</p>
            <textarea 
              required
              rows={4}
              value={formData.problemStatement}
              onChange={e => setFormData({...formData, problemStatement: e.target.value})}
              placeholder="Describe the current issue..."
              className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Expected Outcome</label>
            <p className="text-[10px] text-indigo-500 font-medium italic">👉 Mau hasil seperti apa</p>
            <textarea 
              required
              rows={4}
              value={formData.expectedOutcome}
              onChange={e => setFormData({...formData, expectedOutcome: e.target.value})}
              placeholder="Describe the desired result..."
              className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </section>

        {/* Section: Impact & Urgency */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Impact & Urgency</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Business Impact</label>
              <select 
                value={formData.businessImpact}
                onChange={e => setFormData({...formData, businessImpact: e.target.value})}
                className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Urgency</label>
              <select 
                value={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.value})}
                className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section: Attachment */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Attachment (Optional)</h3>
          <div className="space-y-2">
            <p className="text-[10px] text-indigo-500 font-medium italic">👉 File / screenshot / data pendukung</p>
            <input 
              type="url"
              value={formData.attachmentUrl}
              onChange={e => setFormData({...formData, attachmentUrl: e.target.value})}
              placeholder="Paste link to file or screenshot (e.g., Google Drive link)"
              className="w-full p-4 bg-white rounded-2xl border border-gray-200 outline-none"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
};

// --- Request Detail ---
const RequestDetail = ({ user }: { user: UserProfile }) => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [solution, setSolution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminProposal, setAdminProposal] = useState('');
  const [adminRemark, setAdminRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | 'Postponed' | null>(null);
  const [selectedPIC, setSelectedPIC] = useState({ id: '', name: '' });
  const [brdActivities, setBrdActivities] = useState<Partial<Activity>[]>([]);
  const [uatRemark, setUatRemark] = useState('');
  
  // Completion Modal States
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingActivityIdx, setCompletingActivityIdx] = useState<number | null>(null);
  const [completionDate, setCompletionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [completionRemark, setCompletionRemark] = useState('');
  const [completionEvidenceUrl, setCompletionEvidenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<Activity | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<Feedback | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (user.role !== 'Admin') return;
    const q = query(collection(db, 'users'), where('role', '==', 'Admin'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAdmins(adminList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [user.role]);

  const generatePDF = async (templateId: string = 'pdf-template', filenamePrefix: string = 'Solution_Request') => {
    const element = document.getElementById(templateId);
    if (!element || !request) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Workaround for oklch error in html2canvas
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(tag => {
            tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)');
          });
          // Also check all elements for inline styles
          clonedDoc.querySelectorAll('*').forEach(el => {
            if (el instanceof HTMLElement && el.style.cssText.includes('oklch')) {
              el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)');
            }
          });
          const el = clonedDoc.getElementById(templateId);
          if (el) {
            el.style.display = 'block';
            el.style.left = '0';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filenamePrefix}_${request.id.slice(0, 8)}_${request.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'requests', id), (docSnap) => {
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() } as Request);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `requests/${id}`);
    });

    const solQuery = query(collection(db, 'solutions'), where('requestId', '==', id));
    const solUnsubscribe = onSnapshot(solQuery, (snapshot) => {
      if (!snapshot.empty) {
        setSolution(snapshot.docs[0].data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'solutions');
    });

    const feedbackQuery = query(collection(db, 'feedback'), where('requestId', '==', id));
    const feedbackUnsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      if (!snapshot.empty) {
        setRequestFeedback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Feedback);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedback');
    });

    return () => {
      unsubscribe();
      solUnsubscribe();
      feedbackUnsubscribe();
    };
  }, [id]);

  const updateStatus = async (newStatus: RequestStatus, extraData: any = {}) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'requests', id), { 
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...extraData
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'requests');
    }
  };

  const handleReview = async () => {
    if (!reviewAction) return;
    setSubmitting(true);
    try {
      await updateStatus(reviewAction, { reviewRemark: adminRemark });
      setShowReviewModal(false);
      setAdminRemark('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignPIC = async () => {
    if (!selectedPIC.id) return;
    setSubmitting(true);
    try {
      await updateStatus(request?.status || 'Approved', { 
        picId: selectedPIC.id, 
        picName: selectedPIC.name 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDefineBRD = async () => {
    if (brdActivities.length === 0) return;
    setSubmitting(true);
    try {
      await updateStatus('In Progress', { 
        activities: brdActivities,
        brdGeneratedAt: serverTimestamp()
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateActivity = async (idx: number, updates: Partial<Activity>) => {
    if (!request?.activities) return;
    const newActivities = [...request.activities];
    let activity = { ...newActivities[idx], ...updates };

    // If status changed back from Done, clear actualDate, completionStatus, and remark
    if (activity.status !== 'Done') {
      delete activity.actualDate;
      delete activity.completionStatus;
      delete activity.remark;
    }

    newActivities[idx] = activity;
    
    // Check if all done
    const allDone = newActivities.every(a => a.status === 'Done');
    
    try {
      await updateDoc(doc(db, 'requests', id!), { 
        activities: newActivities,
        updatedAt: serverTimestamp(),
        status: allDone ? 'UAT' : 'In Progress'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'requests');
    }
  };

  const deleteRequest = async () => {
    try {
      const batch = writeBatch(db);
      
      // Delete request
      batch.delete(doc(db, 'requests', id!));
      
      // Find and delete related solutions
      const solSnap = await getDocs(query(collection(db, 'solutions'), where('requestId', '==', id)));
      solSnap.forEach(d => batch.delete(d.ref));
      
      // Find and delete related feedback
      const feedSnap = await getDocs(query(collection(db, 'feedback'), where('requestId', '==', id)));
      feedSnap.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      setShowDeleteConfirm(false);
      navigate('/requests');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'requests');
    }
  };

  const handleFinalizeCompletion = async () => {
    if (completingActivityIdx === null || !request?.activities) return;
    setUploading(true);
    try {
      const newActivities = [...request.activities];
      const activity = { ...newActivities[completingActivityIdx] };
      
      const completedDate = parseISO(completionDate);
      activity.progress = 100;
      activity.status = 'Done';
      activity.actualDate = completionDate;
      activity.remark = completionRemark;
      activity.evidence = completionEvidenceUrl;

      if (activity.estimatedDate) {
        const estimated = parseISO(activity.estimatedDate);
        // Compare dates (ignoring time)
        const isDelay = completedDate > estimated && format(completedDate, 'yyyy-MM-dd') !== activity.estimatedDate;
        activity.completionStatus = isDelay ? 'Delay' : 'On Time';
      }

      newActivities[completingActivityIdx] = activity;
      
      // Check if all done
      const allDone = newActivities.every(a => a.status === 'Done');

      await updateDoc(doc(db, 'requests', id!), {
        activities: newActivities,
        updatedAt: serverTimestamp(),
        status: allDone ? 'UAT' : 'In Progress'
      });

      setShowCompletionModal(false);
      setCompletingActivityIdx(null);
      setCompletionEvidenceUrl('');
      setCompletionRemark('');
      setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Error finalizing completion:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleUAT = async (status: 'Accepted' | 'Rejected') => {
    setSubmitting(true);
    try {
      if (status === 'Accepted') {
        await updateStatus('Completed', { 
          uatStatus: 'Accepted', 
          uatRemark,
          bastGeneratedAt: serverTimestamp()
        });
      } else {
        await updateStatus('In Progress', { 
          uatStatus: 'Rejected', 
          uatRemark 
        });
      }
      setUatRemark('');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSolution = async () => {
    if (!id || !adminProposal) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'solutions'), {
        requestId: id,
        adminId: user.uid,
        proposal: adminProposal,
        createdAt: serverTimestamp()
      });
      await updateStatus('Solution Proposed');
      setAdminProposal('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'solutions');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!request) return <div className="p-8 text-center">Request not found</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
              request.urgency === 'Urgent' || request.urgency === 'High' ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
            )}>
              {request.urgency || request.priority}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
              {request.category}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{request.title}</h1>
          <p className="text-xs text-gray-400 font-mono">ID: {request.id.slice(0, 8)} • {format(request.createdAt.toDate(), 'MMM d, yyyy')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest",
            request.status === 'Completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}>
            {request.status}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {user.role === 'Admin' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                title="Delete Request"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            <button
              onClick={() => generatePDF('pdf-template', 'SRD')}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {downloading ? "..." : "SRD"}
            </button>
            {request.brdGeneratedAt && (
              <button
                onClick={() => generatePDF('brd-template', 'BRD')}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                {downloading ? "..." : "BRD"}
              </button>
            )}
            {request.bastGeneratedAt && (
              <button
                onClick={() => generatePDF('bast-template', 'BAST')}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                {downloading ? "..." : "BAST"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hidden PDF Template - Using hex colors to avoid oklch errors in html2canvas */}
      <div id="pdf-template" className="fixed -left-[9999px] top-0 w-[210mm] p-12 font-sans" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <div className="flex justify-between items-start pb-6 mb-8" style={{ borderBottom: '2px solid #4f46e5' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#4f46e5' }}>Solution Request Document</h1>
            <p className="text-sm font-mono mt-1 uppercase tracking-widest" style={{ color: '#9ca3af' }}>Solution Proposal & Request Kit</p>
          </div>
          <img src={SPARK_LOGO} className="w-32 h-auto object-contain" alt="SPARK" crossOrigin="anonymous" />
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4f46e5' }}>Request Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Title</p>
                  <p className="text-lg font-bold" style={{ color: '#111827' }}>{request.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Request ID</p>
                  <p className="text-sm font-mono" style={{ color: '#4b5563' }}>{request.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Date Submitted</p>
                  <p className="text-sm" style={{ color: '#4b5563' }}>{format(request.createdAt.toDate(), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Status</p>
                  <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#4f46e5' }}>{request.status}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4f46e5' }}>Requester Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Name</p>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>{request.userName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>NIK</p>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>{request.nik}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>WhatsApp</p>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>{request.waNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Division / Dept</p>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>{request.division} / {request.department}</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4f46e5' }}>Impact & Urgency</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Business Impact</p>
                  <p className="text-sm font-bold" style={{ color: '#111827' }}>{request.businessImpact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Urgency</p>
                  <p className="text-sm font-bold" style={{ color: '#111827' }}>{request.urgency}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4f46e5' }}>Category</h3>
              <p className="text-sm font-medium" style={{ color: '#111827' }}>{request.category}</p>
            </section>
          </div>
        </div>

        <div className="space-y-8">
          <section className="p-6 rounded-2xl" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4f46e5' }}>Problem Statement</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>{request.problemStatement || request.description}</p>
          </section>

          <section className="p-6 rounded-2xl" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4f46e5' }}>Expected Outcome</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>{request.expectedOutcome}</p>
          </section>

          {solution && (
            <section className="p-6 rounded-2xl" style={{ backgroundColor: '#eef2ff', border: '1px solid #e0e7ff' }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4f46e5' }}>Proposed Solution</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#312e81' }}>{solution.proposal}</p>
            </section>
          )}
        </div>

        <div className="mt-20 pt-8 flex justify-between items-end" style={{ borderTop: '1px solid #f3f4f6' }}>
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#9ca3af' }}>
            Generated by Solution Proposal & Request Kit • {format(new Date(), 'yyyy-MM-dd HH:mm')}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-8" style={{ color: '#9ca3af' }}>Authorized Signature</p>
            <div className="w-40" style={{ borderBottom: '1px solid #d1d5db' }}></div>
          </div>
        </div>
      </div>

      {/* Hidden BRD Template */}
      <div id="brd-template" className="fixed -left-[9999px] top-0 w-[210mm] p-12 font-sans" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <div className="flex justify-between items-start pb-6 mb-8" style={{ borderBottom: '2px solid #10b981' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#10b981' }}>Business Requirement Document</h1>
            <p className="text-sm font-mono mt-1 uppercase tracking-widest" style={{ color: '#9ca3af' }}>Solution Proposal & Request Kit</p>
          </div>
          <img src={SPARK_LOGO} className="w-32 h-auto object-contain" alt="SPARK" crossOrigin="anonymous" />
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#10b981' }}>Project Context</h3>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Request Title</p>
              <p className="text-sm font-bold">{request.title}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Assigned PIC</p>
              <p className="text-sm font-bold">{request.picName || '-'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#10b981' }}>Timeline</h3>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>BRD Date</p>
              <p className="text-sm">{request.brdGeneratedAt ? format(request.brdGeneratedAt.toDate(), 'MMMM d, yyyy') : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Total Duration</p>
              <p className="text-sm font-bold">{request.activities?.reduce((sum, act) => sum + (act.totalDays || 0), 0)} Working Days</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Est. Completion</p>
              <p className="text-sm font-bold">
                {request.activities?.[request.activities.length - 1]?.estimatedDate 
                  ? format(parseISO(request.activities[request.activities.length - 1].estimatedDate!), 'MMMM d, yyyy')
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#10b981' }}>Activities & Deliverables</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Activity</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Timeline</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Output</th>
              </tr>
            </thead>
            <tbody>
              {request.activities?.map((act, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="py-4 text-sm font-medium" style={{ color: '#111827' }}>{act.title}</td>
                  <td className="py-4 text-sm" style={{ color: '#4b5563' }}>{act.timeline}</td>
                  <td className="py-4 text-sm" style={{ color: '#4b5563' }}>{act.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-20 pt-8 flex justify-between items-end" style={{ borderTop: '1px solid #f3f4f6' }}>
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#9ca3af' }}>
            Generated by Solution Proposal & Request Kit • {format(new Date(), 'yyyy-MM-dd HH:mm')}
          </div>
          <div className="flex gap-12">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-12" style={{ color: '#9ca3af' }}>Requester</p>
                <div className="w-32 h-px mb-2" style={{ backgroundColor: '#e5e7eb' }}></div>
                <p className="text-[10px] font-bold">{request.userName}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-12" style={{ color: '#9ca3af' }}>DIGITAL SOLUTION</p>
                <div className="w-32 h-px mb-2" style={{ backgroundColor: '#e5e7eb' }}></div>
                <p className="text-[10px] font-bold">Dept Head Digital Solution</p>
              </div>
          </div>
        </div>
      </div>

      {/* Hidden BAST Template */}
      <div id="bast-template" className="fixed -left-[9999px] top-0 w-[210mm] py-12 px-16 font-sans" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <div className="flex justify-between items-start pb-4 mb-8" style={{ borderBottom: '2px solid #3b82f6' }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#3b82f6' }}>Berita Acara Serah Terima</h1>
            <p className="text-xs font-mono mt-1 uppercase tracking-widest" style={{ color: '#9ca3af' }}>Solution Proposal & Request Kit</p>
          </div>
          <img src={SPARK_LOGO} className="w-24 h-auto object-contain" alt="SPARK" crossOrigin="anonymous" />
        </div>

        <div className="space-y-6">
          <p className="text-xs leading-relaxed">
            Pada hari ini, <strong>{request.bastGeneratedAt ? format(request.bastGeneratedAt.toDate(), 'EEEE, d MMMM yyyy') : '-'}</strong>, 
            telah dilakukan serah terima hasil pekerjaan untuk permintaan solusi digital dengan rincian sebagai berikut:
          </p>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Judul Permintaan</p>
              <p className="text-xs font-bold">{request.title}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>ID Permintaan</p>
              <p className="text-xs font-mono">{request.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>PIC Pelaksana</p>
              <p className="text-xs font-bold">{request.picName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Penerima Manfaat</p>
              <p className="text-xs font-bold">{request.userName}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Target Selesai</p>
              <p className="text-xs font-bold">
                {request.activities?.[request.activities.length - 1]?.estimatedDate 
                  ? format(parseISO(request.activities[request.activities.length - 1].estimatedDate!), 'MMMM d, yyyy')
                  : '-'}
              </p>
            </div>
          </div>

          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#3b82f6' }}>Hasil Pekerjaan</h3>
            <div className="space-y-2">
              {request.activities?.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                  <div className="flex-1">
                    <p className="text-xs font-bold" style={{ color: '#111827' }}>{act.title}</p>
                    <p className="text-[9px]" style={{ color: '#6b7280' }}>
                      Target: {act.estimatedDate ? format(parseISO(act.estimatedDate), 'MMM d') : '-'} 
                      {' → '} 
                      Actual: {act.actualDate ? format(parseISO(act.actualDate), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                  <span 
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{ 
                      backgroundColor: act.completionStatus === 'On Time' ? '#d1fae5' : '#fee2e2',
                      color: act.completionStatus === 'On Time' ? '#059669' : '#dc2626'
                    }}
                  >
                    {act.completionStatus || 'Selesai'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-4">
            <p className="text-xs leading-relaxed">
              Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya sebagai bukti sah penyelesaian pekerjaan.
            </p>

            <div className="mt-12 flex justify-between">
              <div className="text-center">
                <p className="text-[10px] font-bold mb-16">Pihak Pertama (Pelaksana)</p>
                <div className="w-32 h-px mb-2 mx-auto" style={{ backgroundColor: '#d1d5db' }}></div>
                <p className="text-xs font-bold">{request.picName}</p>
                <p className="text-[9px]" style={{ color: '#6b7280' }}>Digital Solution Team</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold mb-16">Customer</p>
                <div className="w-32 h-px mb-2 mx-auto" style={{ backgroundColor: '#d1d5db' }}></div>
                <p className="text-xs font-bold">{request.userName}</p>
                <p className="text-[9px]" style={{ color: '#6b7280' }}>{request.department}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Review Remark */}
          {(request.status === 'Rejected' || request.status === 'Postponed') && request.reviewRemark && (
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-2">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest">Review Remark</h3>
              <p className="text-sm text-red-900 leading-relaxed">{request.reviewRemark}</p>
            </div>
          )}

          {/* Execution Tracker (Customer View) */}
          {(request.status === 'In Progress' || request.status === 'UAT' || request.status === 'Completed') && request.activities && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-indigo-500" />
                  Execution Tracker
                </h3>
                {request.brdGeneratedAt && (
                  <span className="text-[10px] text-gray-400 font-mono">BRD Generated: {format(request.brdGeneratedAt.toDate(), 'MMM d')}</span>
                )}
              </div>
              <div className="space-y-4">
                {request.activities.map((act, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedActivityDetail(act)}
                    className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 cursor-pointer hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{act.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                          {act.estimatedDate ? format(parseISO(act.estimatedDate), 'MMM d, yyyy') : act.timeline} • Output: {act.output}
                          {act.completionStatus && (
                            <span className={cn(
                              "ml-2 font-bold",
                              act.completionStatus === 'On Time' ? "text-emerald-600" : "text-red-600"
                            )}>
                              • {act.completionStatus}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        act.status === 'Done' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {act.status}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${act.progress}%` }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                    <div className="text-[10px] text-indigo-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-3 h-3" /> Click to view details {act.evidence ? "& evidence" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UAT Panel (Customer View) */}
          {request.status === 'UAT' && user.uid === request.userId && (
            <div className="bg-indigo-600 p-8 rounded-3xl shadow-xl shadow-indigo-100 text-white space-y-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-lg font-bold tracking-tight">User Acceptance Test (UAT)</h3>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                All activities have been completed. Please review the execution and evidence above. 
                If everything is satisfactory, please Accept to complete the request and generate the BAST.
              </p>
              <div className="space-y-4">
                <textarea 
                  value={uatRemark}
                  onChange={e => setUatRemark(e.target.value)}
                  placeholder="Add your remarks or feedback here..."
                  className="w-full p-4 bg-white/10 rounded-2xl border border-white/20 text-white placeholder:text-white/50 text-sm outline-none focus:ring-2 focus:ring-white/30"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleUAT('Rejected')}
                    disabled={submitting || !uatRemark}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                  >
                    Reject UAT
                  </button>
                  <button 
                    onClick={() => handleUAT('Accepted')}
                    disabled={submitting}
                    className="flex-1 bg-white text-indigo-600 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    Accept UAT
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Problem Statement</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{request.problemStatement || request.description}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Expected Outcome</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{request.expectedOutcome}</p>
          </div>

          {request.attachmentUrl && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Attachment</h3>
              <a 
                href={request.attachmentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 text-sm font-medium flex items-center gap-2 hover:underline"
              >
                <FileText className="w-4 h-4" />
                View Attached Document
              </a>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* PIC Info */}
          {request.picName && (
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-3">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Assigned PIC</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {request.picName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900">{request.picName}</p>
                  <p className="text-[10px] text-indigo-500">Digital Solution Team</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Requester Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</p>
                <p className="text-sm text-gray-900 font-medium">{request.userName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">NIK</p>
                <p className="text-sm text-gray-900 font-medium">{request.nik}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WA Number</p>
                <p className="text-sm text-gray-900 font-medium">{request.waNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Division</p>
                <p className="text-sm text-gray-900 font-medium">{request.division}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Department</p>
                <p className="text-sm text-gray-900 font-medium">{request.department}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Impact & Urgency</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Business Impact</p>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                  request.businessImpact === 'High' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                )}>
                  {request.businessImpact}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Urgency</p>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                  request.urgency === 'Urgent' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                )}>
                  {request.urgency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {solution && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 text-white space-y-4"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Proposed Solution</h3>
          </div>
          <p className="opacity-90 leading-relaxed whitespace-pre-wrap">{solution.proposal}</p>
          {request.status === 'Solution Proposed' && user.uid === request.userId && (
            <button 
              onClick={() => updateStatus('Completed')}
              className="w-full bg-white text-indigo-600 py-3 rounded-2xl font-bold mt-4 hover:bg-indigo-50 transition-all"
            >
              Accept & Complete
            </button>
          )}
        </motion.div>
      )}

      {request.status === 'Completed' && user.uid === request.userId && (
        <FeedbackForm 
          requestId={id!} 
          onComplete={() => navigate('/')} 
          existingFeedback={requestFeedback}
        />
      )}

      {user.role === 'Admin' && request.status !== 'Completed' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-gray-900">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            DS Actions
          </h3>
          
          {/* Step 2: DS Review */}
          {(request.status === 'Submitted' || request.status === 'Review') && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Step 2: DS Review</p>
              <div className="grid grid-cols-3 gap-2">
                {(['Approved', 'Rejected', 'Postponed'] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      setReviewAction(action);
                      setShowReviewModal(true);
                    }}
                    className={cn(
                      "py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-white",
                      action === 'Approved' ? "bg-emerald-600 hover:bg-emerald-700" :
                      action === 'Rejected' ? "bg-red-600 hover:bg-red-700" :
                      "bg-amber-600 hover:bg-amber-700"
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Assign PIC & Define BRD */}
          {request.status === 'Approved' && (
            <div className="space-y-6">
              <p className="text-xs text-gray-500 uppercase font-bold">Step 3: Assign PIC & Define BRD</p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign PIC</label>
                <select 
                  value={selectedPIC.id}
                  onChange={(e) => {
                    const admin = admins.find(a => a.uid === e.target.value);
                    if (admin) setSelectedPIC({ id: admin.uid, name: admin.displayName });
                  }}
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none text-gray-900"
                >
                  <option value="">Select Admin...</option>
                  {admins.map(admin => (
                    <option key={admin.uid} value={admin.uid}>{admin.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activities (BRD)</label>
                  <button 
                    onClick={() => setBrdActivities([...brdActivities, { id: Math.random().toString(36).substr(2, 9), title: '', timeline: '', output: '', progress: 0, status: 'Pending' }])}
                    className="text-[10px] text-indigo-600 font-bold uppercase hover:underline"
                  >
                    + Add Activity
                  </button>
                </div>
                
                {brdActivities.map((act, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <input 
                      placeholder="Activity Title"
                      value={act.title}
                      onChange={e => {
                        const newActs = [...brdActivities];
                        newActs[idx].title = e.target.value;
                        setBrdActivities(newActs);
                      }}
                      className="w-full bg-transparent border-b border-gray-200 pb-1 text-sm outline-none text-gray-900"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Estimate Date</label>
                        <input 
                          type="date"
                          value={act.estimatedDate || ''}
                          onChange={e => {
                            const newActs = [...brdActivities];
                            newActs[idx].estimatedDate = e.target.value;
                            
                            // Recalculate all totalDays sequentially
                            newActs.forEach((act, i) => {
                              if (act.estimatedDate) {
                                const currentEst = parseISO(act.estimatedDate);
                                let startDate: Date;
                                
                                if (i === 0) {
                                  startDate = new Date(); // First activity starts from today
                                } else {
                                  const prevEst = newActs[i-1].estimatedDate;
                                  startDate = prevEst ? parseISO(prevEst) : new Date();
                                }
                                
                                const workingDays = differenceInBusinessDays(currentEst, startDate);
                                newActs[i].totalDays = workingDays >= 0 ? workingDays : 0;
                                newActs[i].timeline = `${newActs[i].totalDays} Working Days`;
                              }
                            });
                            setBrdActivities(newActs);
                          }}
                          className="w-full bg-transparent border-b border-gray-200 pb-1 text-[10px] outline-none text-gray-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total Days</label>
                        <input 
                          readOnly
                          value={act.totalDays !== undefined ? `${act.totalDays} Days` : '-'}
                          className="w-full bg-transparent border-b border-gray-200 pb-1 text-[10px] outline-none text-gray-500"
                        />
                      </div>
                    </div>
                    <input 
                      placeholder="Expected Output"
                      value={act.output}
                      onChange={e => {
                        const newActs = [...brdActivities];
                        newActs[idx].output = e.target.value;
                        setBrdActivities(newActs);
                      }}
                      className="w-full bg-transparent border-b border-gray-200 pb-1 text-[10px] outline-none text-gray-900"
                    />
                  </div>
                ))}

                {brdActivities.length > 0 && (
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Project Duration</p>
                      <p className="text-lg font-bold text-indigo-900">
                        {brdActivities.reduce((sum, act) => sum + (act.totalDays || 0), 0)} Working Days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Est. Completion</p>
                      <p className="text-sm font-bold text-indigo-900">
                        {brdActivities[brdActivities.length - 1]?.estimatedDate 
                          ? format(parseISO(brdActivities[brdActivities.length - 1].estimatedDate!), 'MMM d, yyyy')
                          : '-'}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDefineBRD}
                  disabled={submitting || !selectedPIC.id || brdActivities.length === 0}
                  className="w-full bg-indigo-600 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 text-white text-sm"
                >
                  {submitting ? "Processing..." : "Generate BRD & Start Execution"}
                </button>
              </div>
            </div>
          )}

          {/* Execution Phase (Admin View) */}
          {request.status === 'In Progress' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Step 4: Execution Tracker</p>
              <div className="space-y-3">
                {request.activities?.map((act, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedActivityDetail(act)}
                    className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 cursor-pointer hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{act.title}</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                          Target: {act.estimatedDate ? format(parseISO(act.estimatedDate), 'MMM d, yyyy') : '-'} 
                          {act.completionStatus && (
                            <span className={cn(
                              "ml-2 font-bold",
                              act.completionStatus === 'On Time' ? "text-emerald-600" : "text-red-600"
                            )}>
                              • {act.completionStatus}
                              {act.actualDate && ` (${format(parseISO(act.actualDate), 'MMM d')})`}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-600">{act.progress}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={act.progress}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        if (val === 100) {
                          setCompletingActivityIdx(idx);
                          setShowCompletionModal(true);
                        } else {
                          handleUpdateActivity(idx, { progress: val, status: 'In Progress' });
                        }
                      }}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UAT Phase (Admin View) */}
          {request.status === 'UAT' && (
            <div className="p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl text-center">
              <p className="text-sm font-bold text-indigo-300">Awaiting Customer UAT</p>
              <p className="text-[10px] text-indigo-400 mt-1">Status will update after customer review</p>
            </div>
          )}

          {/* Legacy Proposal Section (Optional) */}
          {request.status === 'Review' && (
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Propose Solution (Optional)</label>
              <textarea 
                value={adminProposal}
                onChange={e => setAdminProposal(e.target.value)}
                placeholder="Detail the technical solution or process change..."
                className="w-full p-4 bg-slate-800 rounded-2xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                rows={3}
              />
              <button
                onClick={submitSolution}
                disabled={submitting || !adminProposal}
                className="w-full bg-slate-800 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-all disabled:opacity-50 text-xs"
              >
                {submitting ? "Submitting..." : "Send Proposal"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 relative z-10 space-y-6"
            >
              <h3 className="text-xl font-bold tracking-tight">Review Request: {reviewAction}</h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remark / Reason</label>
                <textarea 
                  value={adminRemark}
                  onChange={e => setAdminRemark(e.target.value)}
                  placeholder="Explain the decision..."
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReview}
                  disabled={submitting || (reviewAction !== 'Approved' && !adminRemark)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold text-white transition-all disabled:opacity-50",
                    reviewAction === 'Approved' ? "bg-emerald-600 hover:bg-emerald-700" :
                    reviewAction === 'Rejected' ? "bg-red-600 hover:bg-red-700" :
                    "bg-amber-600 hover:bg-amber-700"
                  )}
                >
                  {submitting ? "Processing..." : "Confirm " + reviewAction}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && completingActivityIdx !== null && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Complete Activity</h3>
                    <p className="text-xs text-gray-500 font-medium">Finalize and upload evidence</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletingActivityIdx(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Activity Title</p>
                  <p className="text-sm font-bold text-gray-700">{request.activities?.[completingActivityIdx]?.title}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Completion Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="date"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Evidence Link (URL)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      placeholder="Paste link (Drive, Imgur, etc.)"
                      value={completionEvidenceUrl}
                      onChange={(e) => setCompletionEvidenceUrl(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  {/* Live Preview for Image URLs */}
                  {completionEvidenceUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
                      <img 
                        src={completionEvidenceUrl} 
                        alt="Preview" 
                        className="max-h-32 rounded-xl object-contain shadow-sm"
                        referrerPolicy="no-referrer"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Notes / Remark</label>
                  <textarea 
                    placeholder="Add any notes about this completion..."
                    value={completionRemark}
                    onChange={(e) => setCompletionRemark(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletingActivityIdx(null);
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalizeCompletion}
                  disabled={uploading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-white shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Complete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Detail Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={deleteRequest}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action will also delete all related solutions and feedback. This cannot be undone."
      />
      <AnimatePresence>
        {selectedActivityDetail && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                    selectedActivityDetail.status === 'Done' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {selectedActivityDetail.status === 'Done' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Activity Detail</h3>
                    <p className="text-xs text-gray-500 font-medium">Detailed execution information</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedActivityDetail(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</p>
                  <p className="text-base font-bold text-gray-900">{selectedActivityDetail.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Date</p>
                    <p className="text-sm font-bold text-gray-700">
                      {selectedActivityDetail.estimatedDate ? format(parseISO(selectedActivityDetail.estimatedDate), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actual Date</p>
                    <p className="text-sm font-bold text-gray-700">
                      {selectedActivityDetail.actualDate ? format(parseISO(selectedActivityDetail.actualDate), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Output / Deliverable</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedActivityDetail.output || 'No output defined'}</p>
                </div>

                {selectedActivityDetail.status === 'Done' && (
                  <>
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Evidence</p>
                      {selectedActivityDetail.evidence ? (
                        <div className="space-y-3">
                          <a 
                            href={selectedActivityDetail.evidence} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Evidence Link
                          </a>
                          {selectedActivityDetail.evidence.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                            <div className="w-full rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                              <img 
                                src={selectedActivityDetail.evidence} 
                                alt="Evidence" 
                                className="w-full h-auto object-contain max-h-[300px]"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No evidence provided</p>
                      )}
                    </div>

                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PIC Remark</p>
                      <p className="text-sm text-gray-600 italic leading-relaxed">
                        "{selectedActivityDetail.remark || 'No remark provided'}"
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => setSelectedActivityDetail(null)}
                className="w-full py-4 bg-gray-900 hover:bg-black rounded-2xl font-bold text-white transition-all shadow-lg shadow-gray-200"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Layout ---
const Layout = ({ 
  user, 
  children, 
  isOnline, 
  unreadUsersCount = 0, 
  unreadRequestsCount = 0 
}: { 
  user: UserProfile, 
  children: React.ReactNode, 
  isOnline: boolean,
  unreadUsersCount?: number,
  unreadRequestsCount?: number
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', icon: <LayoutDashboard />, path: '/' },
    { label: 'Requests', icon: <ClipboardList />, path: '/requests', badge: unreadRequestsCount },
    { label: 'New', icon: <PlusCircle />, path: '/new-request' },
    { label: 'Account', icon: <Key />, path: '/settings' },
  ];

  if (user.role === 'Admin') {
    navItems.push({ label: 'Users', icon: <Users />, path: '/admin/users', badge: unreadUsersCount });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-6 py-2 text-center text-xs font-bold uppercase tracking-widest sticky top-0 z-[60] shadow-md flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Offline Mode - Some features may be limited
        </div>
      )}

      {/* Mobile Top Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src={SPARK_LOGO} className="w-24 h-auto object-contain" alt="SPARK" referrerPolicy="no-referrer" />
        </div>
        <div className="flex items-center gap-4">
          <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-gray-200" />
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-64 bg-white z-50 p-6 flex flex-col"
            >
              <div className="flex-1 space-y-4 mt-12">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl font-semibold transition-all",
                      location.pathname === item.path ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5" })}
                      {item.label}
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="flex items-center gap-3 p-4 text-red-600 font-semibold hover:bg-red-50 rounded-2xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center sticky bottom-0 z-40 sm:hidden">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 relative",
              location.pathname === item.path ? "text-indigo-600" : "text-gray-400"
            )}
          >
            <div className="relative">
              {React.cloneElement(item.icon as React.ReactElement, { className: "w-6 h-6" })}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// --- User Management ---
const UserManagement = ({ user }: { user: UserProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; uid: string | null }>({
    isOpen: false,
    uid: null
  });

  useEffect(() => {
    if (user.role !== 'Admin') return;
    const q = query(collection(db, 'users'), orderBy('email'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [user]);

  const updateRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const updateDepartment = async (uid: string, newDept: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { department: newDept });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const deleteUser = async () => {
    if (!deleteConfirm.uid) return;
    try {
      await deleteDoc(doc(db, 'users', deleteConfirm.uid));
      setDeleteConfirm({ isOpen: false, uid: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
        <p className="text-gray-500">Manage roles for internal and external customers.</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={u.photoURL} className="w-8 h-8 rounded-full" alt="" />
                      <div>
                        <div className="font-bold text-gray-900">{u.displayName}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text"
                      defaultValue={u.department || 'General'}
                      onBlur={(e) => updateDepartment(u.uid, e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none w-32"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                      u.role === 'Admin' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <select 
                        value={u.role}
                        onChange={(e) => updateRole(u.uid, e.target.value as UserRole)}
                        className="text-xs font-bold bg-transparent border-none focus:ring-0 text-indigo-600 cursor-pointer"
                      >
                        <option value="Internal Customer">Internal</option>
                        <option value="External Customer">External</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button 
                        onClick={() => setDeleteConfirm({ isOpen: true, uid: u.uid })}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, uid: null })}
        onConfirm={deleteUser}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
      />
    </div>
  );
};

// --- Feedback Form ---
const FeedbackForm = ({ requestId, onComplete, existingFeedback }: { requestId: string, onComplete: () => void, existingFeedback?: Feedback | null }) => {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        requestId,
        rating,
        comment,
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (existingFeedback) {
    return (
      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
        <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <Star className="w-5 h-5" />
          Your Feedback
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={cn(
                "p-2",
                existingFeedback.rating >= s ? "text-amber-500" : "text-emerald-200"
              )}
            >
              <Star className={cn("w-8 h-8", existingFeedback.rating >= s ? "fill-current" : "")} />
            </div>
          ))}
        </div>
        {existingFeedback.comment && (
          <p className="text-sm text-emerald-800 italic bg-white p-4 rounded-2xl border border-emerald-100">
            "{existingFeedback.comment}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
      <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
        <Star className="w-5 h-5" />
        Rate our Solution
      </h3>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button 
            key={s} 
            onClick={() => setRating(s)}
            className={cn(
              "p-2 rounded-xl transition-all",
              rating >= s ? "text-amber-500" : "text-emerald-200"
            )}
          >
            <Star className={cn("w-8 h-8", rating >= s ? "fill-current" : "")} />
          </button>
        ))}
      </div>
      <textarea 
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Any additional feedback?"
        className="w-full p-4 bg-white rounded-2xl border border-emerald-100 outline-none text-sm"
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Submit Feedback"}
      </button>
    </div>
  );
};

// --- Profile Settings ---
const ProfileSettings = ({ user, onShowOnboarding }: { user: UserProfile, onShowOnboarding: () => void }) => {
  const [nik, setNik] = useState(user.nik || '');
  const [birthDate, setBirthDate] = useState(user.birthDate || '');
  const [waNumber, setWaNumber] = useState(user.waNumber || '');
  const [division, setDivision] = useState(user.division || '');
  const [department, setDepartment] = useState(user.department || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showReauth, setShowReauth] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      // Attempt to update password
      await updatePassword(currentUser, newPassword);
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsEditingPassword(false);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setShowReauth(true);
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('No user logged in');
      
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      setShowReauth(false);
      setMessage({ text: 'Verified! You can now update your password.', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage({ text: 'Password reset email sent!', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingProfile) {
      setIsEditingProfile(true);
      return;
    }
    setProfileLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nik,
        birthDate,
        waNumber,
        division,
        department,
        isProfileComplete: true
      });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setIsEditingProfile(false);
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const cancelProfileEdit = () => {
    setNik(user.nik || '');
    setBirthDate(user.birthDate || '');
    setWaNumber(user.waNumber || '');
    setDivision(user.division || '');
    setDepartment(user.department || '');
    setIsEditingProfile(false);
  };

  const cancelPasswordEdit = () => {
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setShowReauth(false);
    setIsEditingPassword(false);
  };

  const divisions = [
    'Commercial',
    'Operational',
    'Business Support',
    'Non Division',
    'Other'
  ];

  const departments = [
    'Commercial Digital Solution',
    'Commercial Heavy Transport Equipment',
    'Commercial Heavy Duty Equipment',
    'Commercial Integrated Logistic Service',
    'Customer Services',
    'Vendor Management',
    'HC&GS',
    'Business Control',
    'Strategic Planning & Improvement',
    'IT',
    'Operation',
    'Business Support'
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="text-gray-500">Manage your security and profile information.</p>
      </header>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-gray-50">
          <img src={user.photoURL} className="w-16 h-16 rounded-2xl border border-gray-100" alt="" />
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{user.displayName}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 mt-1 inline-block">
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6 pb-6 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Profile Information
            </h4>
            {!isEditingProfile && (
              <button 
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> NIK
              </label>
              <input 
                type="text"
                required
                disabled={!isEditingProfile}
                value={nik}
                onChange={e => setNik(e.target.value)}
                placeholder="NIK"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Birth Date
              </label>
              <input 
                type="date"
                required
                disabled={!isEditingProfile}
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> WhatsApp Number
              </label>
              <input 
                type="tel"
                required
                disabled={!isEditingProfile}
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                placeholder="WhatsApp Number"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Division
              </label>
              <select 
                required
                disabled={!isEditingProfile}
                value={division}
                onChange={e => setDivision(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none disabled:opacity-50"
              >
                <option value="">Select Division</option>
                {divisions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Department
              </label>
              <select 
                required
                disabled={!isEditingProfile}
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none disabled:opacity-50"
              >
                <option value="">Select Department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {isEditingProfile && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelProfileEdit}
                className="flex-1 bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold border border-gray-100 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>

        <form onSubmit={showReauth ? handleReauth : handleUpdatePassword} className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4" />
              {showReauth ? 'Verify Identity' : 'Change Password'}
            </h4>
            {!isEditingPassword && !showReauth && (
              <button 
                type="button"
                onClick={() => setIsEditingPassword(true)}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
              >
                Edit Password
              </button>
            )}
          </div>

          {isEditingPassword || showReauth ? (
            <>
              {showReauth ? (
                <div className="space-y-4">
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">For security, please enter your current password to continue.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input 
                      type="password"
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={cancelPasswordEdit}
                      className="flex-1 bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold border border-gray-100 hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold"
                    >
                      {loading ? 'Verifying...' : 'Verify Password'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                    <input 
                      type="password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <input 
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  {message.text && (
                    <p className={cn("text-xs font-medium text-center", message.type === 'error' ? 'text-red-500' : 'text-emerald-500')}>
                      {message.text}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={cancelPasswordEdit}
                      className="flex-1 bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold border border-gray-100 hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={loading}
                      className="w-full text-indigo-600 text-xs font-bold uppercase tracking-widest hover:text-indigo-700 transition-colors"
                    >
                      {loading ? 'Sending...' : 'Send Password Reset Email'}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}
        </form>

        <div className="pt-6 border-t border-gray-50">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-4">
            <img src={SPARK_LOGO} className="w-16 h-auto object-contain" alt="" referrerPolicy="no-referrer" />
            App Tutorial
          </h4>
          <button
            onClick={() => {
              localStorage.removeItem('spark_onboarding_done');
              onShowOnboarding();
            }}
            className="w-full bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold border border-gray-100 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            Re-watch Onboarding
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Profile Completion ---
const ProfileCompletion = ({ user }: { user: UserProfile }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nik, setNik] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [division, setDivision] = useState('');
  const [department, setDepartment] = useState(user.department || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const divisions = [
    'Commercial',
    'Operational',
    'Business Support',
    'Non Division',
    'Other'
  ];

  const departments = [
    'Commercial Digital Solution',
    'Commercial Heavy Transport Equipment',
    'Commercial Heavy Duty Equipment',
    'Commercial Integrated Logistic Service',
    'Customer Services',
    'Vendor Management',
    'HC&GS',
    'Business Control',
    'Strategic Planning & Improvement',
    'IT',
    'Operation',
    'Business Support'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!birthDate || !nik || !waNumber || !division || !department) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      // Update password if provided
      if (password) {
        await updatePassword(currentUser, password);
      }

      // Update Firestore profile
      await updateDoc(doc(db, 'users', user.uid), {
        birthDate,
        nik,
        waNumber,
        division,
        department,
        isProfileComplete: true
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Complete Your Profile</h1>
          <p className="text-gray-500 text-sm">Please provide the following information to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> NIK
              </label>
              <input 
                type="text"
                required
                value={nik}
                onChange={e => setNik(e.target.value)}
                placeholder="NIK"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> WhatsApp Number
              </label>
              <input 
                type="tel"
                required
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                placeholder="WhatsApp Number"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Birth Date
              </label>
              <input 
                type="date"
                required
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Division
            </label>
            <select 
              required
              value={division}
              onChange={e => setDivision(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="">Select Division</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Department
            </label>
            <select 
              required
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="">Select Department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="pt-4 border-t border-gray-50 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Set Password (Optional)</h4>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Key className="w-3 h-3" /> New Password
              </label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Confirm Password
              </label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Saving Profile...' : 'Complete Registration'}
          </button>
        </form>

        <button 
          onClick={() => signOut(auth)}
          className="w-full text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
        >
          Sign Out
        </button>
      </motion.div>
    </div>
  );
};

// --- App ---
const NavigationTracker = ({ user }: { user: UserProfile }) => {
  const location = useLocation();
  
  useEffect(() => {
    if (location.pathname === '/admin/users') {
      updateDoc(doc(db, 'users', user.uid), { lastViewedUsersAt: serverTimestamp() });
    }
    if (location.pathname === '/requests') {
      updateDoc(doc(db, 'users', user.uid), { lastViewedRequestsAt: serverTimestamp() });
    }
  }, [location.pathname, user.uid]);

  return null;
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unreadUsersCount, setUnreadUsersCount] = useState(0);
  const [unreadRequestsCount, setUnreadRequestsCount] = useState(0);

  useEffect(() => {
    if (!user || !messaging) return;

    const requestPermission = async () => {
      if (typeof window === 'undefined' || !window.Notification) {
        console.log('This browser does not support desktop notification');
        return;
      }
      try {
        const permission = await window.Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: 'BIsW9f7_77777777777777777777777777777777777777777777777777777777777777777777777' // Placeholder, FCM works without it in some cases or needs real one
          });
          if (token) {
            const currentTokens = user.fcmTokens || [];
            if (!currentTokens.includes(token)) {
              await updateDoc(doc(db, 'users', user.uid), {
                fcmTokens: [...currentTokens, token]
              });
            }
          }
        }
      } catch (err) {
        console.error('FCM Error:', err);
      }
    };

    requestPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      if (payload.notification && typeof window !== 'undefined' && window.Notification) {
        new window.Notification(payload.notification.title || 'New Notification', {
          body: payload.notification.body,
          icon: '/spark-logo.png'
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      setUnreadUsersCount(0);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('createdAt', '>', user.lastViewedUsersAt || new Date(0))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadUsersCount(snapshot.size);
      if (snapshot.size > 0 && !snapshot.metadata.hasPendingWrites) {
        // Show local notification for new users
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newUser = change.doc.data() as UserProfile;
            if (typeof window !== 'undefined' && window.Notification && window.Notification.permission === 'granted') {
              new window.Notification('New User Registered', {
                body: `${newUser.displayName} has joined SPARK!`,
                icon: newUser.photoURL
              });
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, user?.lastViewedUsersAt]);

  useEffect(() => {
    if (!user) {
      setUnreadRequestsCount(0);
      return;
    }

    const q = user.role === 'Admin' 
      ? query(collection(db, 'requests'), where('createdAt', '>', user.lastViewedRequestsAt || new Date(0)))
      : query(collection(db, 'requests'), where('userId', '==', user.uid), where('updatedAt', '>', user.lastViewedRequestsAt || new Date(0)));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadRequestsCount(snapshot.size);
      if (snapshot.size > 0 && !snapshot.metadata.hasPendingWrites) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const req = change.doc.data() as Request;
            if (typeof window !== 'undefined' && window.Notification && window.Notification.permission === 'granted') {
              new window.Notification('Request Update', {
                body: `Request: ${req.title} - Status: ${req.status}`,
                icon: '/spark-logo.png'
              });
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, user?.lastViewedRequestsAt]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const onboardingDone = localStorage.getItem('spark_onboarding_done');
    if (onboardingDone) setShowOnboarding(false);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('spark_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  if (loading) return <LoadingScreen />;
  if (showOnboarding) return <Onboarding onComplete={completeOnboarding} />;
  if (!user) return <Login onLogin={() => {}} />;
  if (user.isProfileComplete === false || !user.isProfileComplete) return <ProfileCompletion user={user} />;

  return (
    <ErrorBoundary>
      <Router>
        <NavigationTracker user={user} />
        <Layout 
          user={user} 
          isOnline={isOnline} 
          unreadUsersCount={unreadUsersCount} 
          unreadRequestsCount={unreadRequestsCount}
        >
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/requests" element={<Dashboard user={user} />} />
            <Route path="/requests/:id" element={<RequestDetail user={user} />} />
            <Route path="/new-request" element={<RequestForm user={user} />} />
            <Route path="/settings" element={<ProfileSettings user={user} onShowOnboarding={() => setShowOnboarding(true)} />} />
            <Route path="/admin/users" element={<UserManagement user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}
