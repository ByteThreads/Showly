'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { Home, Calendar, TrendingUp, Plus, ArrowRight, X, Sparkles, Clock, Bell, AlertCircle, Users, BarChart3, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Property, Showing } from '@/types/database';

interface ShowingWithProperty extends Showing {
  property?: Property;
}

export default function DashboardPage() {
  const { agent } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayShowings, setTodayShowings] = useState(0);
  const [activeProperties, setActiveProperties] = useState(0);
  const [upcomingShowings, setUpcomingShowings] = useState(0);
  const [thisMonthShowings, setThisMonthShowings] = useState(0);
  const [showGettingStarted, setShowGettingStarted] = useState(true);

  // Detailed data for widgets
  const [todayShowingsList, setTodayShowingsList] = useState<ShowingWithProperty[]>([]);
  const [recentBookings, setRecentBookings] = useState<ShowingWithProperty[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<ShowingWithProperty[]>([]);
  const [needsAttention, setNeedsAttention] = useState<Property[]>([]);
  const [hotLeads, setHotLeads] = useState<{clientName: string; clientEmail: string; count: number; properties: string[]}[]>([]);
  const [followUpNeeded, setFollowUpNeeded] = useState<ShowingWithProperty[]>([]);
  const [weeklyData, setWeeklyData] = useState<{day: string; count: number}[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!agent) return;

      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        // Fetch all properties
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('agentId', '==', agent.id)
        );
        const propertiesSnapshot = await getDocs(propertiesQuery);
        const allProperties = propertiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];

        const activeProps = allProperties.filter(p => p.status === 'active');
        setActiveProperties(activeProps.length);

        // Fetch all showings for this agent
        const showingsQuery = query(
          collection(db, 'showings'),
          where('agentId', '==', agent.id),
          orderBy('scheduledAt', 'asc')
        );
        const showingsSnapshot = await getDocs(showingsQuery);
        const showingsData: ShowingWithProperty[] = showingsSnapshot.docs.map(doc => {
          const showing = { id: doc.id, ...doc.data() } as Showing;
          const property = allProperties.find(p => p.id === showing.propertyId);
          return { ...showing, property };
        });

        // Calculate stats
        const todayList = showingsData.filter(s => {
          const date = s.scheduledAt.toDate();
          return date >= startOfToday && date < endOfToday;
        });
        setTodayShowings(todayList.length);
        setTodayShowingsList(todayList);

        const upcoming = showingsData.filter(s => s.scheduledAt.toDate() > now);
        setUpcomingShowings(upcoming.length);

        const thisMonth = showingsData.filter(s => s.scheduledAt.toDate() >= startOfMonth);
        setThisMonthShowings(thisMonth.length);

        // Recent bookings (last 5 showings created in past 7 days)
        const recent = showingsData
          .filter(s => s.createdAt.toDate() >= sevenDaysAgo)
          .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
          .slice(0, 5);
        setRecentBookings(recent);

        // Pending confirmations (status = 'scheduled')
        const pending = upcoming.filter(s => s.status === 'scheduled');
        setPendingConfirmations(pending);

        // Properties needing attention (no showings in 7+ days)
        const propertiesWithRecentShowings = new Set(
          showingsData
            .filter(s => s.scheduledAt.toDate() >= sevenDaysAgo)
            .map(s => s.propertyId)
        );
        const needsAttentionList = activeProps
          .filter(p => !propertiesWithRecentShowings.has(p.id))
          .slice(0, 3);
        setNeedsAttention(needsAttentionList);

        // Hot leads (clients with 2+ showings)
        const clientMap = new Map<string, {name: string; email: string; count: number; properties: Set<string>}>();
        showingsData.forEach(s => {
          const key = s.clientEmail.toLowerCase();
          if (!clientMap.has(key)) {
            clientMap.set(key, {
              name: s.clientName,
              email: s.clientEmail,
              count: 0,
              properties: new Set()
            });
          }
          const client = clientMap.get(key)!;
          client.count++;
          if (s.property) {
            client.properties.add(s.property.address.formatted || s.property.address.street);
          }
        });
        const hotLeadsList = Array.from(clientMap.values())
          .filter(c => c.count >= 2)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(c => ({
            clientName: c.name,
            clientEmail: c.email,
            count: c.count,
            properties: Array.from(c.properties)
          }));
        setHotLeads(hotLeadsList);

        // Follow-up needed (completed showings 3+ days ago, no subsequent showing)
        const completedShowings = showingsData.filter(s =>
          s.status === 'completed' &&
          s.scheduledAt.toDate() >= threeDaysAgo &&
          s.scheduledAt.toDate() <= now
        );
        const clientsWithFollowUp = completedShowings.filter(s => {
          const laterShowings = showingsData.filter(later =>
            later.clientEmail.toLowerCase() === s.clientEmail.toLowerCase() &&
            later.scheduledAt.toDate() > s.scheduledAt.toDate()
          );
          return laterShowings.length === 0;
        }).slice(0, 3);
        setFollowUpNeeded(clientsWithFollowUp);

        // Weekly performance data (last 7 days)
        const weeklyStats: {day: string; count: number}[] = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
          const count = showingsData.filter(s => {
            const date = s.scheduledAt.toDate();
            return date >= dayStart && date < dayEnd;
          }).length;
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          weeklyStats.push({ day: dayNames[dayStart.getDay()], count });
        }
        setWeeklyData(weeklyStats);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [agent]);

  // Check localStorage for getting started preference
  useEffect(() => {
    const dismissed = localStorage.getItem('gettingStartedDismissed');
    if (dismissed === 'true') {
      setShowGettingStarted(false);
    }
  }, []);

  // Reset carousel if we're past the available items
  useEffect(() => {
    if (carouselIndex >= pendingConfirmations.length && carouselIndex > 0) {
      setCarouselIndex(Math.max(0, pendingConfirmations.length - 3));
    }
  }, [pendingConfirmations, carouselIndex]);

  const handleDismissGettingStarted = () => {
    setShowGettingStarted(false);
    localStorage.setItem('gettingStartedDismissed', 'true');
  };

  const handleConfirmShowing = async (showingId: string) => {
    try {
      setConfirmingId(showingId);

      const showingRef = doc(db, 'showings', showingId);
      await updateDoc(showingRef, {
        status: 'confirmed',
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setPendingConfirmations(prev => prev.filter(s => s.id !== showingId));
      setTodayShowingsList(prev => prev.map(s =>
        s.id === showingId ? { ...s, status: 'confirmed' as const } : s
      ));

      // Optional: Send confirmation notification email
      // You could add this later

    } catch (error) {
      console.error('Error confirming showing:', error);
      alert('Failed to confirm showing. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    {
      label: STRINGS.dashboard.stats.activeProperties,
      value: activeProperties.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: Home,
    },
    {
      label: STRINGS.dashboard.stats.upcomingShowings,
      value: upcomingShowings.toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: Calendar,
    },
    {
      label: STRINGS.dashboard.stats.thisMonth,
      value: thisMonthShowings.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className={STYLES.loading.overlay}>
        <div className="text-center">
          <div className={STYLES.loading.spinner}></div>
          <p className={STYLES.loading.text}>{STRINGS.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Personalized Greeting */}
      <div className="mb-8 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{agent?.name?.split(' ')[0] || 'Agent'}</span>!
        </h1>
        {todayShowings > 0 ? (
          <button
            onClick={() => router.push('/dashboard/showings')}
            className="text-base flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-all group bg-gradient-to-r from-blue-50 to-emerald-50 hover:from-blue-100 hover:to-emerald-100 px-4 py-2.5 rounded-lg border-2 border-blue-200 hover:border-blue-300 hover:shadow-md"
          >
            Today you have <span className="font-bold text-xl mx-1 bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{todayShowings}</span>
            {todayShowings === 1 ? 'showing' : 'showings'} booked
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <p className="text-lg text-gray-700">
            No showings scheduled for today. Great time to reach out to potential clients!
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn('p-3 rounded-xl', stat.bgColor)}>
                  <Icon className={cn('w-6 h-6', stat.color)} />
                </div>
                <span className="text-4xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-gray-600 font-medium">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Pending Confirmations - Carousel */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Pending Confirmations</h3>
            <span className="ml-auto bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
              {pendingConfirmations.length}
            </span>
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pendingConfirmations.slice(carouselIndex, carouselIndex + 3).map((showing) => (
                <div key={showing.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                  <div className="text-sm font-semibold text-gray-900">{showing.clientName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {showing.property?.address.street || 'Property'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {showing.scheduledAt.toDate().toLocaleDateString()} at{' '}
                    {showing.scheduledAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleConfirmShowing(showing.id)}
                      disabled={confirmingId === showing.id}
                      className={cn(
                        "flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all border-2",
                        confirmingId === showing.id
                          ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                          : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700"
                      )}
                    >
                      {confirmingId === showing.id ? 'Confirming...' : '✓ Confirm'}
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/showings')}
                      className="px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 border-2 border-gray-200 hover:border-blue-300 rounded-md transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            {pendingConfirmations.length > 3 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 3))}
                  disabled={carouselIndex === 0}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
                    carouselIndex === 0
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Previous</span>
                </button>

                <Link
                  href="/dashboard/showings"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  View all {pendingConfirmations.length} showings →
                </Link>

                <button
                  onClick={() => setCarouselIndex(Math.min(pendingConfirmations.length - 3, carouselIndex + 3))}
                  disabled={carouselIndex + 3 >= pendingConfirmations.length}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
                    carouselIndex + 3 >= pendingConfirmations.length
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <span className="text-sm font-medium">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Follow-Up Reminders */}
        {followUpNeeded.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Follow-Up Needed</h3>
              <span className="ml-auto bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">
                {followUpNeeded.length}
              </span>
            </div>
            <div className="space-y-3">
              {followUpNeeded.map((showing) => (
                <div key={showing.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-sm font-semibold text-gray-900">{showing.clientName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Viewed {showing.property?.address.street || 'property'} •{' '}
                    {Math.floor((Date.now() - showing.scheduledAt.toDate().getTime()) / (1000 * 60 * 60 * 24))} days ago
                  </div>
                  <a
                    href={`mailto:${showing.clientEmail}`}
                    className="mt-2 inline-block text-xs text-purple-700 hover:text-purple-900 font-medium"
                  >
                    Send follow-up →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's Schedule Timeline */}
      {todayShowingsList.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 mb-8 border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Today's Schedule</h3>
            <span className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              {todayShowingsList.length} {todayShowingsList.length === 1 ? 'showing' : 'showings'}
            </span>
          </div>
          <div className="space-y-2">
            {todayShowingsList.map((showing, idx) => {
              const date = showing.scheduledAt.toDate();
              const timeString = date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});
              const [time, period] = timeString.split(' ');

              return (
                <div
                  key={showing.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all"
                >
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {time}
                    </div>
                    <div className="text-xs text-gray-500">
                      {period}
                    </div>
                  </div>
                  <div className="h-12 w-px bg-blue-300" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{showing.clientName}</div>
                    <div className="text-sm text-gray-600">{showing.property?.address.street || 'Property'}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      showing.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      showing.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {showing.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Bookings Feed */}
        {recentBookings.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
            </div>
            <div className="space-y-3">
              {recentBookings.map((showing) => {
                const minutesAgo = Math.floor((Date.now() - showing.createdAt.toDate().getTime()) / 60000);
                const timeAgo = minutesAgo < 60
                  ? `${minutesAgo}m ago`
                  : minutesAgo < 1440
                  ? `${Math.floor(minutesAgo / 60)}h ago`
                  : `${Math.floor(minutesAgo / 1440)}d ago`;
                return (
                  <div key={showing.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{showing.clientName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {showing.property?.address.street || 'Property'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{timeAgo}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Properties Needing Attention */}
        {needsAttention.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">Needs Attention</h3>
              <span className="ml-auto bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                {needsAttention.length}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3">No showings in 7+ days</p>
            <div className="space-y-3">
              {needsAttention.map((property) => (
                <div key={property.id} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-sm font-semibold text-gray-900">{property.address.street}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    ${property.price.toLocaleString()} • {property.bedrooms}bd {property.bathrooms}ba
                  </div>
                  <Link
                    href={`/dashboard/properties`}
                    className="mt-2 inline-block text-xs text-orange-700 hover:text-orange-900 font-medium"
                  >
                    Share link →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Hot Leads Board */}
        {hotLeads.length > 0 && (
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl shadow-md p-6 border border-rose-200">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-rose-600" />
              <h3 className="text-lg font-bold text-gray-900">Hot Leads</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">Clients with multiple showings</p>
            <div className="space-y-3">
              {hotLeads.map((lead, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-rose-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-900">{lead.clientName}</div>
                    <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold">
                      {lead.count} showings
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">{lead.clientEmail}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Viewed: {lead.properties.slice(0, 2).join(', ')}
                    {lead.properties.length > 2 && ` +${lead.properties.length - 2} more`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Performance Chart */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Showing Activity</h3>
              </div>
              <p className="text-sm text-gray-600 ml-7">Showings scheduled over the last 7 days</p>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {weeklyData.map((day, idx) => {
                const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full flex items-end justify-center" style={{height: '120px'}}>
                      <div
                        className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg transition-all hover:from-indigo-600 hover:to-indigo-500"
                        style={{height: `${height}%`, minHeight: day.count > 0 ? '8px' : '0'}}
                      />
                      {day.count > 0 && (
                        <span className="absolute -top-6 text-xs font-bold text-gray-700">
                          {day.count}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{STRINGS.dashboard.quickActions.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/dashboard/properties/new"
            className="group relative bg-gradient-to-br from-blue-50 to-emerald-50 p-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{STRINGS.properties.addNew}</h3>
            <p className="text-sm text-gray-600">
              {STRINGS.dashboard.quickActions.addPropertyDescription}
            </p>
          </Link>

          <Link
            href="/dashboard/properties"
            className="group relative bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform duration-300">
                <Home className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{STRINGS.properties.title}</h3>
            <p className="text-sm text-gray-600">
              {STRINGS.dashboard.quickActions.viewPropertiesDescription}
            </p>
          </Link>
        </div>
      </div>

      {/* Getting Started Guide */}
      {showGettingStarted && (
        <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-md p-6 border border-blue-100">
          <button
            onClick={handleDismissGettingStarted}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-blue-100 transition-colors group"
            aria-label="Dismiss getting started guide"
          >
            <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pr-8">
            <Sparkles className="w-6 h-6 text-blue-600" />
            {STRINGS.dashboard.gettingStarted.title}
          </h3>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span className="text-gray-700 pt-0.5">{STRINGS.dashboard.gettingStarted.step1}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span className="text-gray-700 pt-0.5">{STRINGS.dashboard.gettingStarted.step2}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span className="text-gray-700 pt-0.5">{STRINGS.dashboard.gettingStarted.step3}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span className="text-gray-700 pt-0.5">{STRINGS.dashboard.gettingStarted.step4}</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
