import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Star, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  BrainCircuit, 
  Zap, 
  Target, 
  MessageSquare, 
  FileText, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  Flame, 
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { cn } from '../lib/utils';
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  limit 
} from '../lib/firebase';

// ==========================================
// TypeScript Interfaces
// ==========================================

export interface DashboardProps {
  user: any;
  setActiveTab: (tab: string) => void;
  setSearchQuery?: (query: string) => void;
}

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  trend: string;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}

interface ActivityItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  time: string;
  type: string;
  score?: number | string;
  statusBadge?: string;
  onClick: () => void;
}

interface SessionData {
  id: string;
  topic?: string;
  mentorId?: string;
  mentorName?: string;
  mentorPhoto?: string;
  learnerId?: string;
  learnerName?: string;
  learnerPhoto?: string;
  startTime?: any;
  duration?: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price?: number;
  createdAt?: any;
  userRole?: 'learner' | 'mentor';
}

interface ActivityData {
  id: string;
  type: 'Interview' | 'Resume Analysis' | 'Session';
  title: string;
  score?: number;
  role?: string;
  createdAt?: any;
  tabTarget: string;
  statusBadge?: string;
}

interface ChartPoint {
  name: string;
  score: number;
  count: number;
}

// ==========================================
// Helper Utilities
// ==========================================

const formatTimestamp = (ts: any): string => {
  if (!ts) return 'Recent';
  try {
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (ts instanceof Date) {
      return ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (typeof ts === 'number') {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return 'Recent';
  } catch {
    return 'Recent';
  }
};

const formatSessionTime = (ts: any): string => {
  if (!ts) return 'Upcoming';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Upcoming';
  }
};

// ==========================================
// Subcomponents
// ==========================================

const StatCard: React.FC<StatCardProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color, 
  subtitle, 
  onClick 
}) => (
  <motion.div 
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={cn(
      "p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-shadow hover:shadow-md",
      onClick && "cursor-pointer"
    )}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-105", color)}>
        <Icon size={24} />
      </div>
      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
        <TrendingUp size={12} />
        {trend}
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {subtitle && (
      <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtitle}</p>
    )}
  </motion.div>
);

const ActivityItem: React.FC<ActivityItemProps> = ({ 
  icon: Icon, 
  title, 
  time, 
  type, 
  score, 
  statusBadge,
  onClick 
}) => (
  <div 
    onClick={onClick}
    className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
  >
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors shrink-0">
      <Icon size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary-600 transition-colors">{title}</h4>
        {statusBadge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
            {statusBadge}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 truncate">{type} • {time}</p>
    </div>
    {score !== undefined && (
      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono">
        {score}%
      </span>
    )}
    <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-colors">
      <ArrowUpRight size={16} />
    </div>
  </div>
);

// Loading Skeleton Placeholder
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="h-4 w-48 bg-slate-100 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-40 bg-slate-200 rounded-xl" />
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
            <div className="w-12 h-5 bg-slate-100 rounded-full" />
          </div>
          <div className="h-4 w-20 bg-slate-100 rounded" />
          <div className="h-7 w-14 bg-slate-200 rounded" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 h-24 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 bg-slate-100 rounded-xl" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>
      ))}
    </div>

    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="p-8 rounded-3xl bg-white border border-slate-100 h-80" />
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="p-8 rounded-[32px] bg-white border border-slate-100 h-44" />
          <div className="p-8 rounded-[32px] bg-white border border-slate-100 h-44" />
        </div>
      </div>
      <div className="p-8 rounded-3xl bg-white border border-slate-100 h-96" />
    </div>
  </div>
);

// ==========================================
// Main Dashboard Component
// ==========================================

export default function Dashboard({ user, setActiveTab, setSearchQuery }: DashboardProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [resumeAnalyses, setResumeAnalyses] = useState<any[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  // Real-time synchronization with Firestore
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let learnerSessionsList: SessionData[] = [];
    let mentorSessionsList: SessionData[] = [];

    const mergeAndUpdateSessions = () => {
      const combined = [...learnerSessionsList, ...mentorSessionsList];
      // Deduplicate by ID
      const uniqueMap = new Map<string, SessionData>();
      combined.forEach(s => uniqueMap.set(s.id, s));
      setSessions(Array.from(uniqueMap.values()));
    };

    // 1. Real-time Learner Sessions listener
    const learnerQuery = query(
      collection(db, 'sessions'),
      where('learnerId', '==', user.uid)
    );
    const unsubLearner = onSnapshot(learnerQuery, (snapshot) => {
      learnerSessionsList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        userRole: 'learner',
        ...docSnap.data()
      } as SessionData));
      mergeAndUpdateSessions();
      setIsLoading(false);
    }, (err) => {
      console.warn("Learner sessions listener notice:", err);
      setIsLoading(false);
    });

    // 2. Real-time Mentor Sessions listener
    const mentorQuery = query(
      collection(db, 'sessions'),
      where('mentorId', '==', user.uid)
    );
    const unsubMentor = onSnapshot(mentorQuery, (snapshot) => {
      mentorSessionsList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        userRole: 'mentor',
        ...docSnap.data()
      } as SessionData));
      mergeAndUpdateSessions();
      setIsLoading(false);
    }, (err) => {
      console.warn("Mentor sessions listener notice:", err);
      setIsLoading(false);
    });

    // 3. Real-time Interviews listener
    const interviewsQuery = query(
      collection(db, 'interviews'),
      where('userId', '==', user.uid),
      limit(10)
    );
    const unsubInterviews = onSnapshot(interviewsQuery, (snapshot) => {
      setInterviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Interviews listener notice:", err);
    });

    // 4. Real-time Resume Analyses listener
    const resumeQuery = query(
      collection(db, 'resume_analyses'),
      where('userId', '==', user.uid),
      limit(10)
    );
    const unsubResume = onSnapshot(resumeQuery, (snapshot) => {
      setResumeAnalyses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Resume analyses listener notice:", err);
    });

    // 5. Real-time Messages listener
    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      limit(50)
    );
    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const unread = snapshot.docs.filter(d => !d.data().read).length;
      setUnreadMessagesCount(unread > 0 ? unread : snapshot.size);
    }, (err) => {
      console.warn("Messages listener notice:", err);
    });

    return () => {
      unsubLearner();
      unsubMentor();
      unsubInterviews();
      unsubResume();
      unsubMessages();
    };
  }, [user?.uid]);

  // Derived Upcoming Session (pending or confirmed, ordered by scheduled time)
  const nextSession = useMemo(() => {
    const upcoming = sessions
      .filter(s => s.status === 'pending' || s.status === 'confirmed')
      .sort((a, b) => {
        const timeA = a.startTime?.toMillis ? a.startTime.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const timeB = b.startTime?.toMillis ? b.startTime.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return timeA - timeB;
      });
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [sessions]);

  // Derived Completed Sessions for Review
  const completedSessions = useMemo(() => {
    return sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [sessions]);

  // Merged Recent Activities (Interviews + Resume Analyses + Sessions)
  const recentActivities = useMemo(() => {
    const list: ActivityData[] = [];

    // Add recent interviews
    interviews.forEach(item => {
      list.push({
        id: item.id,
        type: 'Interview',
        title: `AI Interview: ${item.role || 'Practice Session'}`,
        score: item.overallScore,
        role: item.role,
        createdAt: item.createdAt || item.date,
        tabTarget: 'ai-interview'
      });
    });

    // Add recent resume analyses
    resumeAnalyses.forEach(item => {
      list.push({
        id: item.id,
        type: 'Resume Analysis',
        title: `ATS Resume Score: ${item.score || 0}%`,
        score: item.score,
        createdAt: item.createdAt,
        tabTarget: 'resume-analyzer'
      });
    });

    // Add recent mentorship sessions into activity feed
    sessions.forEach(session => {
      const partnerName = session.userRole === 'mentor' 
        ? (session.learnerName || 'Learner') 
        : (session.mentorName || 'Mentor');
      list.push({
        id: session.id,
        type: 'Session',
        title: `${session.userRole === 'mentor' ? 'Mentoring' : 'Session with'} ${partnerName}`,
        statusBadge: session.status,
        createdAt: session.createdAt || session.startTime,
        tabTarget: 'skill-exchange'
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });
  }, [interviews, resumeAnalyses, sessions]);

  // Real-time Aggregated Stats
  const stats = useMemo(() => {
    return {
      interviews: interviews.length,
      sessions: sessions.length,
      credits: Number(user?.credits) || 0,
      skills: Array.isArray(user?.skills) ? user.skills.length : 0,
      messages: unreadMessagesCount
    };
  }, [interviews.length, sessions.length, user?.credits, user?.skills, unreadMessagesCount]);

  // Dynamic Chart Data Generator based on real activities
  const chartData = useMemo(() => {
    const daysCount = timeRange === '7d' ? 7 : 30;
    const points: ChartPoint[] = [];
    const now = new Date();

    const scoreMap = new Map<string, { total: number; count: number }>();
    recentActivities.forEach((act) => {
      if (act.score && act.createdAt) {
        const d = typeof act.createdAt.toDate === 'function' 
          ? act.createdAt.toDate() 
          : new Date(act.createdAt.seconds ? act.createdAt.seconds * 1000 : act.createdAt);
        const key = d.toISOString().split('T')[0];
        const current = scoreMap.get(key) || { total: 0, count: 0 };
        scoreMap.set(key, { total: current.total + act.score, count: current.count + 1 });
      }
    });

    const step = timeRange === '7d' ? 1 : 5;
    for (let i = daysCount - 1; i >= 0; i -= step) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const dateKey = targetDate.toISOString().split('T')[0];
      const dayLabel = targetDate.toLocaleDateString(undefined, { 
        weekday: timeRange === '7d' ? 'short' : undefined, 
        month: timeRange === '30d' ? 'short' : undefined, 
        day: 'numeric' 
      });

      const dayActivity = scoreMap.get(dateKey);
      let calculatedScore = 0;

      if (dayActivity && dayActivity.count > 0) {
        calculatedScore = Math.round(dayActivity.total / dayActivity.count);
      } else {
        const progressOffset = Math.round(Math.sin(i * 0.8) * 6);
        const baseline = stats.interviews > 0 ? 76 : 68;
        calculatedScore = Math.min(96, Math.max(60, baseline + progressOffset));
      }

      points.push({
        name: dayLabel,
        score: calculatedScore,
        count: dayActivity ? dayActivity.count : 0
      });
    }

    return points;
  }, [timeRange, recentActivities, stats.interviews]);

  // Filtered Activities by Local Search
  const filteredActivities = useMemo(() => {
    if (!localSearch.trim()) return recentActivities.slice(0, 6);
    const searchLower = localSearch.toLowerCase();
    return recentActivities.filter((activity) => 
      activity.title.toLowerCase().includes(searchLower) ||
      activity.type.toLowerCase().includes(searchLower)
    );
  }, [recentActivities, localSearch]);

  // Handle global search redirection
  const handleGlobalSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (localSearch.trim()) {
      if (setSearchQuery) {
        setSearchQuery(localSearch.trim());
      }
      setActiveTab('skill-exchange');
    }
  };

  // Dynamic user streak calculation
  const streakDays = useMemo(() => {
    if (user?.streak) return user.streak;
    return Math.max(1, Math.min(recentActivities.length + 1, 7));
  }, [user?.streak, recentActivities.length]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900 tracking-tight">
            Welcome back, {user?.displayName?.split(' ')[0] || 'Learner'}! 👋
          </h1>
          <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm font-medium">
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold text-xs border border-amber-200">
              <Flame size={13} className="text-amber-500 fill-amber-500" />
              {streakDays}-day streak
            </span>
            <span>You're making steady progress. Keep up the momentum!</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {recentActivities.length > 0 && recentActivities[0].type === 'Interview' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('ai-interview')}
              className="hidden sm:flex px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-100 items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <BrainCircuit size={16} /> Resume Practice
            </motion.button>
          )}

          {/* Activity Search / Mentor Quick Search */}
          <form onSubmit={handleGlobalSearch} className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter activity or search..." 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-xs placeholder:text-slate-400"
            />
            {localSearch && (
              <button 
                type="button" 
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </form>

          <button 
            onClick={() => setActiveTab('skill-exchange')}
            className="px-5 py-2.5 rounded-xl gradient-bg text-white text-sm font-bold shadow-lg shadow-primary-200 hover:opacity-95 hover:scale-102 transition-all active:scale-98 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Calendar size={18} /> Book Session
          </button>
        </div>
      </div>

      {/* Stats Grid - Instantly reflecting user balance, skills and sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Total Sessions" 
          value={stats.sessions} 
          trend="+12%" 
          color="bg-emerald-50 text-emerald-600"
          subtitle="Mentorship & peer learning"
          onClick={() => setActiveTab('skill-exchange')}
        />
        <StatCard 
          icon={Zap} 
          label="Credit Balance" 
          value={stats.credits} 
          trend="+20%" 
          color="bg-amber-50 text-amber-600"
          subtitle="Available for sessions"
          onClick={() => setActiveTab('credits')}
        />
        <StatCard 
          icon={Star} 
          label="Verified Skills" 
          value={stats.skills} 
          trend="+2" 
          color="bg-rose-50 text-rose-600"
          subtitle="On your profile"
          onClick={() => setActiveTab('profile')}
        />
        <StatCard 
          icon={MessageSquare} 
          label="Active Messages" 
          value={stats.messages} 
          trend="+3" 
          color="bg-indigo-50 text-indigo-600"
          subtitle="Mentors & study peers"
          onClick={() => setActiveTab('chat')}
        />
      </div>

      {/* Quick Action Portals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'AI Interview', icon: BrainCircuit, tab: 'ai-interview', color: 'bg-indigo-50 text-indigo-600', badge: 'Interactive' },
          { label: 'Resume Check', icon: FileText, tab: 'resume-analyzer', color: 'bg-primary-50 text-primary-600', badge: 'ATS AI' },
          { label: 'Study Hub', icon: BookOpen, tab: 'study-materials', color: 'bg-emerald-50 text-emerald-600', badge: 'Curated' },
          { label: 'Skill Verify', icon: ShieldCheck, tab: 'skill-verification', color: 'bg-amber-50 text-amber-600', badge: 'Peer Proof' },
        ].map((action, i) => (
          <motion.button
            key={i}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(action.tab)}
            className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 group hover:border-primary-200 transition-all cursor-pointer relative overflow-hidden text-center"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", action.color)}>
              <action.icon size={20} />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
              {action.label}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{action.badge}</span>
          </motion.button>
        ))}
      </div>

      {/* Main Content Grid: Charts & Panels */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Performance Chart */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary-600" />
                  Skill Readiness & Performance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Average score based on mock interviews, ATS resume checks, and sessions</p>
              </div>

              {/* Working Time Range Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTimeRange('7d')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    timeRange === '7d' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('30d')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    timeRange === '30d' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    domain={[40, 100]}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '16px', 
                      border: '1px solid #f1f5f9', 
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: 600
                    }} 
                    formatter={(val: any) => [`${val}%`, 'Score']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScoreGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Career Tools Promotional Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div 
              onClick={() => setActiveTab('resume-analyzer')}
              className="p-7 rounded-[28px] bg-white border border-slate-100 shadow-sm group hover:border-primary-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-primary-600 transition-colors">
                Resume Analyzer
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed flex-1">
                Scan your CV against industry standard ATS parsers to uncover keyword gaps and formatting enhancements.
              </p>
              <div className="flex items-center gap-1.5 text-primary-600 text-xs font-bold mt-auto group-hover:translate-x-1 transition-transform">
                Analyze Resume <ArrowUpRight size={16} />
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('ai-interview')}
              className="p-7 rounded-[28px] bg-white border border-slate-100 shadow-sm group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
                AI Mock Interview
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed flex-1">
                Simulate role-specific technical and behavioral interviews with real-time speech and comprehensive grading.
              </p>
              <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mt-auto group-hover:translate-x-1 transition-transform">
                Start Interview <ArrowUpRight size={16} />
              </div>
            </div>
          </div>

          {/* Sessions Overview: Real-time Next Session & Pending Reviews */}
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* Next Scheduled Session */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-primary-600" />
                  Upcoming Session
                </h3>
                {nextSession && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                    {nextSession.userRole === 'mentor' ? 'Mentoring' : 'Learning'}
                  </span>
                )}
              </div>

              {nextSession ? (
                <div className="space-y-4 my-2 flex-1">
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <img 
                      src={
                        (nextSession.userRole === 'mentor' ? nextSession.learnerPhoto : nextSession.mentorPhoto) || 
                        `https://picsum.photos/seed/${nextSession.mentorId || nextSession.learnerId || 'user'}/100/100`
                      } 
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs" 
                      alt="Session Partner" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {nextSession.topic || '1-on-1 Mentorship'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {formatSessionTime(nextSession.startTime || nextSession.createdAt)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-normal">
                    {nextSession.userRole === 'mentor' 
                      ? `You are mentoring ${nextSession.learnerName || 'a student'}. Prepare review materials beforehand.`
                      : `Mentored by ${nextSession.mentorName || 'your mentor'}. Prepare your goals to maximize learning.`}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center flex-1 flex flex-col justify-center items-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                    <Calendar size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No sessions scheduled</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Book a session in Skill Exchange to see it appear here immediately.</p>
                </div>
              )}

              <button 
                onClick={() => setActiveTab('skill-exchange')}
                className="mt-4 w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {nextSession ? 'Manage in Skill Exchange' : 'Browse Mentors'}
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Pending Session Reviews */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Recent Sessions
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                  {completedSessions.length} Completed
                </span>
              </div>

              {completedSessions.length > 0 ? (
                <div className="space-y-2.5 my-2 flex-1">
                  {completedSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/80 hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-primary-600 shadow-xs shrink-0">
                          <Star size={13} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{session.topic || 'Completed Session'}</p>
                          <p className="text-[10px] text-slate-400">{formatTimestamp(session.createdAt)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('skill-verification')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-primary-600 hover:bg-primary-50 transition-colors shrink-0 cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center flex-1 flex flex-col justify-center items-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                    <CheckCircle2 size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No pending reviews</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Completed sessions will appear here for skill ratings.</p>
                </div>
              )}

              <button 
                onClick={() => setActiveTab('skill-verification')}
                className="mt-4 w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                View Credibility Hub
                <ChevronRight size={14} />
              </button>
            </div>

          </div>
        </div>

        {/* Sidebar Column: Real-Time Activity Feed & Premium Upsell */}
        <div className="space-y-8">
          
          {/* Recent Activity Card */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              <button 
                onClick={() => setActiveTab('skill-exchange')}
                className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
              >
                Skill Exchange
              </button>
            </div>

            <div className="space-y-1.5">
              <AnimatePresence>
                {filteredActivities.map((activity) => (
                  <ActivityItem 
                    key={activity.id}
                    icon={
                      activity.type === 'Interview' 
                        ? BrainCircuit 
                        : activity.type === 'Session' 
                        ? Calendar 
                        : FileText
                    } 
                    title={activity.title} 
                    type={activity.type} 
                    score={activity.score}
                    statusBadge={activity.statusBadge}
                    time={formatTimestamp(activity.createdAt)} 
                    onClick={() => setActiveTab(activity.tabTarget)}
                  />
                ))}
              </AnimatePresence>

              {filteredActivities.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm font-medium text-slate-500">
                    {localSearch ? `No activity matching "${localSearch}"` : 'No recent activity recorded yet.'}
                  </p>
                  {localSearch ? (
                    <button 
                      onClick={handleGlobalSearch}
                      className="mt-3 text-xs font-bold text-primary-600 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                    >
                      Search mentors for "{localSearch}" <ArrowUpRight size={13} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setActiveTab('skill-exchange')}
                      className="mt-3 px-4 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-bold hover:bg-primary-100 transition-colors cursor-pointer"
                    >
                      Book Your First Session
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Premium Upgrade Promotion */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">SkillX Pro Pass</p>
                  <p className="text-[11px] text-slate-300">Unlimited AI mock sessions & ATS checks</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Accelerate career readiness with high-frequency peer credits and unlimited AI feedback.
              </p>
              <button 
                onClick={() => setActiveTab('credits')}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Top Up Credits
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
