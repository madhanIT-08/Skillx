import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Calendar, 
  MessageSquare, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Users,
  SlidersHorizontal,
  ArrowUpDown,
  BookOpen,
  Send,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  onSnapshot 
} from '../lib/firebase';

export interface Mentor {
  id: string;
  uid: string;
  displayName: string;
  role: string;
  skills: string[];
  bio: string;
  rating?: number;
  reviewsCount?: number;
  price?: number;
  isVerified?: boolean;
  verifiedSkills?: string[];
  photoURL?: string;
  credits?: number;
  createdAt?: any;
}

export interface Review {
  id: string;
  mentorId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp?: any;
}

export interface SkillExchangeProps {
  user: any;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setSelectedChatContact: (c: any) => void;
}

const DEFAULT_SEED_MENTORS: Omit<Mentor, 'id'>[] = [
  {
    uid: "seed_sarah_chen",
    displayName: "Sarah Chen",
    role: "mentor",
    skills: ["Frontend", "React", "UI/UX Design"],
    bio: "Senior Frontend Engineer at Google with 8+ years of experience in building scalable web applications and intuitive interfaces.",
    rating: 4.9,
    reviewsCount: 124,
    price: 50,
    isVerified: true,
    verifiedSkills: ["Frontend", "React"],
    photoURL: "https://picsum.photos/seed/sarah/200/200",
    credits: 1000
  },
  {
    uid: "seed_marcus_rodriguez",
    displayName: "Marcus Rodriguez",
    role: "mentor",
    skills: ["Backend", "Node.js", "System Design"],
    bio: "Lead Backend Architect specializing in high-throughput distributed systems, microservices, and cloud infrastructure.",
    rating: 4.8,
    reviewsCount: 89,
    price: 75,
    isVerified: true,
    verifiedSkills: ["Backend", "Node.js"],
    photoURL: "https://picsum.photos/seed/marcus/200/200",
    credits: 1000
  },
  {
    uid: "seed_priya_sharma",
    displayName: "Priya Sharma",
    role: "mentor",
    skills: ["Data Science", "Python", "Machine Learning"],
    bio: "Data Scientist at Meta. Passionate about teaching practical ML pipelines, neural networks, and landing data roles.",
    rating: 5.0,
    reviewsCount: 56,
    price: 60,
    isVerified: true,
    verifiedSkills: ["Python", "Machine Learning"],
    photoURL: "https://picsum.photos/seed/priya/200/200",
    credits: 1000
  },
  {
    uid: "seed_alex_rivera",
    displayName: "Alex Rivera",
    role: "mentor",
    skills: ["Mobile Dev", "React Native", "iOS"],
    bio: "Mobile Tech Lead with 7+ apps on the App Store. Expert in responsive mobile design and performance tuning.",
    rating: 4.7,
    reviewsCount: 42,
    price: 55,
    isVerified: true,
    verifiedSkills: ["Mobile Dev", "React Native"],
    photoURL: "https://picsum.photos/seed/alex/200/200",
    credits: 1000
  },
  {
    uid: "seed_jordan_smith",
    displayName: "Jordan Smith",
    role: "mentor",
    skills: ["Product Management", "Agile", "Strategy"],
    bio: "Product Director at top fintech. Helping aspiring PMs master product discovery, roadmaps, and stakeholder management.",
    rating: 4.9,
    reviewsCount: 78,
    price: 90,
    isVerified: true,
    verifiedSkills: ["Product Management"],
    photoURL: "https://picsum.photos/seed/jordan/200/200",
    credits: 1000
  },
  {
    uid: "seed_elena_volkov",
    displayName: "Elena Volkov",
    role: "mentor",
    skills: ["Cybersecurity", "Ethical Hacking", "Network Security"],
    bio: "Security Researcher & Consultant. Guiding engineers on writing hardened code, vulnerability testing, and defense in depth.",
    rating: 4.9,
    reviewsCount: 63,
    price: 80,
    isVerified: true,
    verifiedSkills: ["Cybersecurity", "Network Security"],
    photoURL: "https://picsum.photos/seed/elena/200/200",
    credits: 1000
  },
  {
    uid: "seed_david_kim",
    displayName: "David Kim",
    role: "mentor",
    skills: ["Cloud Computing", "AWS", "DevOps", "Kubernetes"],
    bio: "Cloud Solutions Architect. Specializing in automated CI/CD pipelines, Kubernetes orchestration, and AWS cost reduction.",
    rating: 4.8,
    reviewsCount: 95,
    price: 70,
    isVerified: true,
    verifiedSkills: ["AWS", "DevOps"],
    photoURL: "https://picsum.photos/seed/david/200/200",
    credits: 1000
  },
  {
    uid: "seed_aisha_bello",
    displayName: "Aisha Bello",
    role: "mentor",
    skills: ["Blockchain", "Solidity", "Web3"],
    bio: "Web3 Developer and Smart Contract Auditor. Practical guidance for decentralized protocols, DeFi, and Solidity best practices.",
    rating: 4.7,
    reviewsCount: 31,
    price: 85,
    isVerified: true,
    verifiedSkills: ["Solidity", "Web3"],
    photoURL: "https://picsum.photos/seed/aisha/200/200",
    credits: 1000
  }
];

export default function SkillExchange({ 
  user, 
  setActiveTab, 
  searchQuery, 
  setSearchQuery, 
  setSelectedChatContact 
}: SkillExchangeProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'price_low' | 'price_high'>('rating');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingTopic, setBookingTopic] = useState('');
  const [expandedBios, setExpandedBios] = useState<Record<string, boolean>>({});
  const [mentorReviews, setMentorReviews] = useState<Review[]>([]);
  const [activeMentorTab, setActiveMentorTab] = useState<'info' | 'reviews'>('info');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const [applicationData, setApplicationData] = useState({
    skills: '',
    bio: '',
    price: 50
  });
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  // Fetch mentors from Firestore with graceful fallback to defaults
  const fetchMentors = async () => {
    setIsLoading(true);
    try {
      const mentorsQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['mentor', 'both'])
      );
      const mentorDocs = await getDocs(mentorsQuery);

      if (!mentorDocs.empty) {
        const fetchedList: Mentor[] = mentorDocs.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid || d.id,
            displayName: data.displayName || 'Mentor',
            role: data.role || 'mentor',
            skills: data.skills || [],
            bio: data.bio || '',
            rating: data.rating ?? 5.0,
            reviewsCount: data.reviewsCount ?? 0,
            price: data.price ?? 50,
            isVerified: !!data.isVerified,
            verifiedSkills: data.verifiedSkills || [],
            photoURL: data.photoURL,
            credits: data.credits ?? 1000,
            createdAt: data.createdAt
          };
        });
        setMentors(fetchedList);
      } else {
        // If Firestore collection is empty, attempt to seed or load fallback
        try {
          for (const mentor of DEFAULT_SEED_MENTORS) {
            await setDoc(doc(db, 'users', mentor.uid), {
              ...mentor,
              createdAt: serverTimestamp()
            });
          }
          const seededDocs = await getDocs(mentorsQuery);
          const seededList: Mentor[] = seededDocs.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid || d.id,
              ...data
            } as Mentor;
          });
          setMentors(seededList.length > 0 ? seededList : DEFAULT_SEED_MENTORS.map(m => ({ id: m.uid, ...m })));
        } catch (seedErr) {
          // If seeding fails due to security rules (non-admin), use fallback in memory
          console.info("Using default mentors array (local fallback)");
          setMentors(DEFAULT_SEED_MENTORS.map(m => ({ id: m.uid, ...m })));
        }
      }
    } catch (error) {
      console.warn("Could not query mentors from Firestore, using offline mentors:", error);
      setMentors(DEFAULT_SEED_MENTORS.map(m => ({ id: m.uid, ...m })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [user?.uid]);

  // Real-time reviews listener for selected mentor
  useEffect(() => {
    if (!selectedMentor) return;

    const mentorId = selectedMentor.uid || selectedMentor.id;
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('mentorId', '==', mentorId)
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const data: Review[] = snapshot.docs.map(d => {
        const item = d.data();
        return {
          id: d.id,
          mentorId: item.mentorId,
          userId: item.userId,
          userName: item.userName || 'Anonymous',
          rating: item.rating ?? 5,
          comment: item.comment || '',
          timestamp: item.timestamp
        };
      });
      // Sort reviews in-memory by timestamp descending
      data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || (a.timestamp?.toMillis ? a.timestamp.toMillis() / 1000 : 0);
        const timeB = b.timestamp?.seconds || (b.timestamp?.toMillis ? b.timestamp.toMillis() / 1000 : 0);
        return timeB - timeA;
      });
      setMentorReviews(data);
    }, (err) => {
      console.warn("Reviews snapshot notice:", err);
    });

    return () => unsubscribe();
  }, [selectedMentor]);

  // Booking a mentorship session
  const handleBookSession = async (mentor: Mentor) => {
    if (!user) return;

    const targetUid = mentor.uid || mentor.id;
    if (user.uid === targetUid) {
      setBookingError("You cannot book a mentorship session with yourself.");
      return;
    }

    const price = mentor.price || 50;
    const userCredits = Number(user.credits) || 0;

    if (userCredits < price) {
      setBookingError(`Insufficient credits! You have ${userCredits} credits, but this session costs ${price} credits.`);
      return;
    }

    setBookingStatus('booking');
    setBookingError(null);

    try {
      // 1. Deduct credits from learner
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: userCredits - price
      });

      // 2. Log transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'spend',
        title: `Mentorship: ${mentor.displayName}`,
        amount: price,
        timestamp: serverTimestamp(),
        status: 'completed'
      });

      // 3. Create active session with rich details
      const sessionTopic = bookingTopic.trim() || '1-on-1 Mentorship & Goal Setting';
      await addDoc(collection(db, 'sessions'), {
        mentorId: targetUid,
        mentorName: mentor.displayName,
        mentorPhoto: mentor.photoURL || `https://picsum.photos/seed/${targetUid}/200/200`,
        learnerId: user.uid,
        learnerName: user.displayName || 'Learner',
        learnerPhoto: user.photoURL || '',
        topic: sessionTopic,
        startTime: serverTimestamp(),
        duration: 60,
        status: 'pending',
        price: price,
        createdAt: serverTimestamp()
      });

      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setSelectedMentor(null);
        setBookingTopic('');
        setActiveTab('dashboard');
      }, 1800);

    } catch (error: any) {
      console.error("Error booking session:", error);
      setBookingError("Failed to book session. Please verify your connection and try again.");
      setBookingStatus('idle');
    }
  };

  // Submitting review for mentor
  const handleAddReview = async () => {
    if (!user || !selectedMentor || !newReview.comment.trim()) return;

    const targetMentorId = selectedMentor.uid || selectedMentor.id;
    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);

    try {
      await addDoc(collection(db, 'reviews'), {
        mentorId: targetMentorId,
        userId: user.uid,
        userName: user.displayName || 'Learner',
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        timestamp: serverTimestamp()
      });

      setNewReview({ rating: 5, comment: '' });
      setReviewSuccessMsg("Thank you! Your review has been recorded.");
      setTimeout(() => setReviewSuccessMsg(null), 3500);

      // Increment review count on mentor if possible
      try {
        const mentorRef = doc(db, 'users', targetMentorId);
        const newCount = (selectedMentor.reviewsCount || 0) + 1;
        const currentRating = selectedMentor.rating || 5.0;
        const calculatedRating = Number(((currentRating * (newCount - 1) + newReview.rating) / newCount).toFixed(1));
        await updateDoc(mentorRef, {
          reviewsCount: newCount,
          rating: calculatedRating
        });
        setSelectedMentor(prev => prev ? { ...prev, reviewsCount: newCount, rating: calculatedRating } : null);
      } catch {
        // Non-critical if user lacks update permissions on mentor doc
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Applying to become a mentor
  const handleApplyMentor = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const newSkills = applicationData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Merge with existing skills if available to prevent overwriting
      const existingSkills: string[] = Array.isArray(user.skills) ? user.skills : [];
      const mergedSkills = Array.from(new Set([...existingSkills, ...newSkills]));

      await updateDoc(userRef, {
        role: user.role === 'mentor' ? 'mentor' : 'both',
        skills: mergedSkills.length > 0 ? mergedSkills : ['General Mentorship'],
        bio: applicationData.bio,
        price: Number(applicationData.price) || 50,
        isVerified: false,
        rating: 5.0,
        reviewsCount: 0
      });

      setApplicationSuccess(true);
      setTimeout(() => {
        setApplicationSuccess(false);
        setIsApplicationModalOpen(false);
        fetchMentors();
      }, 1500);

    } catch (error: any) {
      console.error("Error applying for mentor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initiate direct chat message
  const handleStartChat = (mentor: Mentor) => {
    const normalizedMentor = {
      ...mentor,
      uid: mentor.uid || mentor.id,
      id: mentor.id || mentor.uid
    };
    setSelectedChatContact(normalizedMentor);
    setActiveTab('chat');
  };

  // Available skill categories
  const categories = [
    'All', 
    'Frontend', 
    'Backend', 
    'UI/UX Design', 
    'Data Science', 
    'Product Management', 
    'Mobile Dev', 
    'Cybersecurity', 
    'Cloud Computing', 
    'Blockchain'
  ];

  // Filtered & Sorted Mentors
  const filteredMentors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    const matched = mentors.filter(mentor => {
      const nameMatch = mentor.displayName?.toLowerCase().includes(q);
      const bioMatch = mentor.bio?.toLowerCase().includes(q);
      const skillMatch = mentor.skills?.some(s => s.toLowerCase().includes(q));
      const searchPass = !q || nameMatch || bioMatch || skillMatch;

      const categoryPass = selectedCategory === 'All' || 
        mentor.skills?.some(s => s.toLowerCase() === selectedCategory.toLowerCase());

      return searchPass && categoryPass;
    });

    // Apply sorting
    return matched.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'reviews') return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      return 0;
    });
  }, [mentors, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Skill Exchange</h1>
          <p className="text-slate-500 mt-1">Connect with verified mentors for 1-on-1 practical peer learning sessions.</p>
        </div>

        {/* Balance Card with Top-up Trigger */}
        <div 
          onClick={() => setActiveTab('credits')}
          className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm hover:border-primary-200 transition-all cursor-pointer group"
          title="Click to recharge credits"
        >
          <div className="px-4 py-2 bg-primary-50 rounded-xl group-hover:bg-primary-100 transition-colors">
            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest leading-none mb-1">Your Balance</p>
            <p className="text-lg font-bold text-primary-700 leading-none">
              {user?.credits ?? 0} <span className="text-xs font-medium text-primary-600">Credits</span>
            </p>
          </div>
          <div className="p-2.5 text-primary-600 bg-primary-50/50 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-all">
            <Zap size={20} />
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search mentors by name, tech stack, or expertise..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-xs">
            <ArrowUpDown size={16} className="text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-2"
            >
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviewed</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                selectedCategory === cat 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mentors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-slate-400">Loading top mentors...</p>
          </div>
        ) : filteredMentors.length > 0 ? (
          filteredMentors.map((mentor, i) => (
            <motion.div
              key={mentor.id || mentor.uid}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col"
            >
              <div className="p-7 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-5">
                  <div className="relative">
                    <img 
                      src={mentor.photoURL || `https://picsum.photos/seed/${mentor.uid || mentor.id}/200/200`} 
                      className="w-18 h-18 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform" 
                      alt={mentor.displayName}
                      referrerPolicy="no-referrer"
                    />
                    {mentor.isVerified && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xs" 
                        title="Verified Mentor"
                      >
                        <ShieldCheck size={13} />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-bold justify-end text-sm">
                      <Star size={15} fill="currentColor" />
                      <span>{mentor.rating ? mentor.rating.toFixed(1) : '5.0'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{mentor.reviewsCount || 0} reviews</p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                  {mentor.displayName}
                </h3>
                
                <div className="mt-1 flex-1">
                  <p className={cn(
                    "text-xs text-slate-500 leading-relaxed transition-all duration-200",
                    !expandedBios[mentor.id] && "line-clamp-2"
                  )}>
                    {mentor.bio || 'Experienced engineering mentor ready to assist you.'}
                  </p>
                  {(mentor.bio && mentor.bio.length > 80) && (
                    <button 
                      onClick={() => setExpandedBios(prev => ({ ...prev, [mentor.id]: !prev[mentor.id] }))}
                      className="text-[11px] font-bold text-primary-600 hover:text-primary-700 mt-1 cursor-pointer"
                    >
                      {expandedBios[mentor.id] ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                {/* Skills Badges */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {(mentor.skills || []).slice(0, 3).map((skill: string) => {
                    const isSkillVerified = mentor.verifiedSkills?.includes(skill);
                    return (
                      <span key={skill} className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        isSkillVerified 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-slate-50 text-slate-600 border border-slate-100"
                      )}>
                        {skill}
                        {isSkillVerified && <ShieldCheck size={10} className="text-emerald-600" />}
                      </span>
                    );
                  })}
                  {(mentor.skills?.length || 0) > 3 && (
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                      +{mentor.skills.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Pricing & Action Buttons */}
              <div className="p-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Rate</p>
                  <p className="text-base font-bold text-slate-900 leading-none">
                    {mentor.price || 50} <span className="text-xs font-normal text-slate-500">Credits/hr</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleStartChat(mentor)}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all cursor-pointer shadow-xs"
                    title="Send a message"
                  >
                    <MessageSquare size={17} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedMentor(mentor);
                      setBookingError(null);
                      setBookingTopic('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                  >
                    Book Session
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Users size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">No mentors found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No mentors matched your filter "{searchQuery || selectedCategory}". Try adjusting your filters or search terms.
              </p>
            </div>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                fetchMentors();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Become a Mentor Promo Card */}
        {user?.role !== 'mentor' && user?.role !== 'both' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl bg-gradient-to-br from-primary-600 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-100 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold leading-tight">Become a Verified Mentor</h3>
              <p className="text-indigo-100 text-xs leading-relaxed">
                Empower fellow students, share your skills in coding or design, and earn credits toward advanced AI tools and learning materials.
              </p>
            </div>
            <button 
              onClick={() => setIsApplicationModalOpen(true)}
              className="w-full mt-6 py-3 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-all shadow-md cursor-pointer"
            >
              Apply as Mentor
            </button>
          </motion.div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedMentor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMentor(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedMentor.photoURL || `https://picsum.photos/seed/${selectedMentor.uid || selectedMentor.id}/200/200`} 
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200" 
                    alt={selectedMentor.displayName} 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      {selectedMentor.displayName}
                      {selectedMentor.isVerified && <ShieldCheck size={15} className="text-blue-500" />}
                    </h3>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star size={12} fill="currentColor" />
                      <span>{selectedMentor.rating ? selectedMentor.rating.toFixed(1) : '5.0'}</span>
                      <span className="text-slate-400 font-normal">({selectedMentor.reviewsCount || 0} reviews)</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMentor(null)} 
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold">
                <button 
                  onClick={() => setActiveMentorTab('info')}
                  className={cn(
                    "flex-1 py-2 rounded-xl transition-all cursor-pointer",
                    activeMentorTab === 'info' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Session Details
                </button>
                <button 
                  onClick={() => setActiveMentorTab('reviews')}
                  className={cn(
                    "flex-1 py-2 rounded-xl transition-all cursor-pointer",
                    activeMentorTab === 'reviews' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Reviews ({mentorReviews.length})
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {activeMentorTab === 'info' ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">About Mentor</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{selectedMentor.bio || 'Expert mentor ready to guide you.'}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Verified Skillsets</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedMentor.skills || []).map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Topic Input */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        What would you like to focus on?
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g., React Hooks, System Architecture, Resume Review"
                        value={bookingTopic}
                        onChange={(e) => setBookingTopic(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Cost Summary Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">1-Hour Dedicated Mentorship</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">Video call & tailored code review</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-primary-600">{selectedMentor.price || 50} Credits</p>
                        <p className="text-[10px] text-slate-400">Balance: {user?.credits ?? 0}</p>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {bookingError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold">{bookingError}</p>
                          {(user?.credits || 0) < (selectedMentor.price || 50) && (
                            <button 
                              onClick={() => {
                                setSelectedMentor(null);
                                setActiveTab('credits');
                              }}
                              className="mt-1.5 text-[11px] font-bold text-rose-800 underline hover:text-rose-900 cursor-pointer block"
                            >
                              Top up wallet now →
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Book Button */}
                    <button 
                      onClick={() => handleBookSession(selectedMentor)}
                      disabled={bookingStatus !== 'idle'}
                      className="w-full py-3.5 rounded-xl gradient-bg text-white text-xs font-bold shadow-md shadow-primary-200 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {bookingStatus === 'booking' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : bookingStatus === 'success' ? (
                        <div className="flex items-center gap-1.5 text-white">
                          <CheckCircle2 size={16} className="text-emerald-300" />
                          <span>Session Booked Successfully!</span>
                        </div>
                      ) : (
                        <span>Confirm & Book Session ({selectedMentor.price || 50} Credits)</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Add Review Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800">Leave a Review</h4>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star} 
                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                            className="cursor-pointer p-0.5"
                          >
                            <Star 
                              size={18} 
                              className={star <= newReview.rating ? "text-amber-500" : "text-slate-300"} 
                              fill={star <= newReview.rating ? "currentColor" : "none"} 
                            />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Describe your session experience and takeaways..."
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs h-20 resize-none"
                      />
                      {reviewSuccessMsg && (
                        <p className="text-xs font-bold text-emerald-600">{reviewSuccessMsg}</p>
                      )}
                      <button 
                        onClick={handleAddReview}
                        disabled={isSubmittingReview || !newReview.comment.trim()}
                        className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                      </button>
                    </div>

                    {/* Review Feed */}
                    <div className="space-y-3">
                      {mentorReviews.length === 0 ? (
                        <p className="text-center py-6 text-slate-400 text-xs italic">
                          No reviews yet. Book a session and be the first to share feedback!
                        </p>
                      ) : (
                        mentorReviews.map((rev) => (
                          <div key={rev.id} className="p-3.5 rounded-2xl border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{rev.userName}</span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, idx) => (
                                  <Star 
                                    key={idx} 
                                    size={11} 
                                    className={idx < rev.rating ? "text-amber-500" : "text-slate-200"} 
                                    fill={idx < rev.rating ? "currentColor" : "none"} 
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mentor Application Modal */}
      <AnimatePresence>
        {isApplicationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsApplicationModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Become a Mentor</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Join the network and share your expertise.</p>
                </div>
                <button 
                  onClick={() => setIsApplicationModalOpen(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {applicationSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                  <h4 className="text-base font-bold text-slate-900">Application Approved!</h4>
                  <p className="text-xs text-slate-500">Your mentor profile is now active on the exchange platform.</p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Your Core Skills (comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., React, TypeScript, Python, UI/UX"
                      value={applicationData.skills}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, skills: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Professional Bio & Experience</label>
                    <textarea 
                      placeholder="Share your industry experience, current role, and what you enjoy mentoring..."
                      value={applicationData.bio}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 transition-all h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hourly Mentorship Rate (Credits)</label>
                    <input 
                      type="number" 
                      min={20}
                      max={200}
                      value={applicationData.price}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>

                  <button 
                    onClick={handleApplyMentor}
                    disabled={isLoading || !applicationData.skills.trim() || !applicationData.bio.trim()}
                    className="w-full py-3.5 rounded-xl gradient-bg text-white font-bold shadow-md shadow-primary-200 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isLoading ? 'Saving Profile...' : 'Submit Mentor Application'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
