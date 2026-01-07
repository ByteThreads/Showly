'use client';

import Link from 'next/link';
import { STRINGS } from '@/lib/constants/strings';
import { useEffect, useState, useRef } from 'react';
import { Link as LinkIcon, Calendar, Bell, Home, Clock, Mail, Smartphone, Palette } from 'lucide-react';

// Hero Rotating Cards Component
function HeroRotatingCards() {
  const [activeCard, setActiveCard] = useState(0);

  const cards = [
    {
      title: 'Share your booking page',
      description: 'Share your scheduling link directly with clients, or embed your availability in an email.',
      icon: LinkIcon,
      bgColor: 'bg-blue-50',
      visual: (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          {/* Property Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80"
              alt="Modern home"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Open House
            </div>
          </div>
          {/* Property Details */}
          <div className="p-6">
            <div className="text-2xl font-bold text-gray-900 mb-3">$649,900</div>
            <div className="text-sm text-gray-600 mb-4">4329 Oak Street, Vancouver</div>
            <div className="flex items-center gap-4 text-sm text-gray-700 mb-5">
              <span className="font-semibold">3 beds</span>
              <span className="font-semibold">2 baths</span>
              <span className="font-semibold">2,100 sqft</span>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-4 py-3 rounded-lg text-center font-semibold">
              Book a Showing →
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Clients book instantly',
      description: 'Clients select their preferred time slot without back-and-forth emails or phone calls.',
      icon: Calendar,
      bgColor: 'bg-emerald-50',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-gray-900">Select a time</div>
              <div className="text-sm text-gray-600">Tuesday, Jan 15</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                9:00 AM
              </button>
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                10:30 AM
              </button>
              <button className="bg-blue-600 text-white border-2 border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg">
                2:00 PM ✓
              </button>
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                3:30 PM
              </button>
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                4:00 PM
              </button>
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                5:30 PM
              </button>
            </div>
            <div className="mt-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-4 py-3 rounded-lg text-center font-semibold">
              Confirm Booking
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Get notified immediately',
      description: 'Receive instant email notifications when a showing is booked, rescheduled, or cancelled.',
      icon: Bell,
      bgColor: 'bg-blue-50',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Booking Confirmed</div>
                <div className="text-xs text-gray-600">Sent to you and client</div>
                <div className="text-xs text-blue-600 mt-1">Just now</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
              <Bell className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">24-Hour Reminder</div>
                <div className="text-xs text-gray-600">Tomorrow at 2:00 PM</div>
                <div className="text-xs text-emerald-600 mt-1">Scheduled</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">1-Hour Reminder</div>
                <div className="text-xs text-gray-600">Today at 1:00 PM</div>
                <div className="text-xs text-blue-600 mt-1">Scheduled</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Auto-rotate through cards
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % cards.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [cards.length]);

  return (
    <div className="relative min-h-[600px]">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-700 ${
            activeCard === index
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-95 z-0 pointer-events-none'
          }`}
        >
          <div className={`${card.bgColor} rounded-3xl p-8 shadow-2xl border-2 border-gray-200`}>
            <div className="mb-6">
              <h4 className="text-2xl font-bold text-gray-900 mb-3">{card.title}</h4>
              <p className="text-lg text-gray-700">{card.description}</p>
            </div>

            {/* Card preview */}
            <div className="transform hover:scale-105 transition-all duration-300">
              {card.visual}
            </div>

            {/* Progress indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCard(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeCard === idx
                      ? 'w-8 bg-blue-600'
                      : 'w-2 bg-gray-400 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vertical Timeline Component with Scroll Animations
function VerticalTimeline() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRef = useRef<HTMLDivElement>(null);

  const steps = [
    {
      number: 1,
      icon: Home,
      title: 'Create Your Property',
      description: 'Add property details, upload photos, and set your location. Get a shareable booking link instantly that you can use anywhere.',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Property Address</label>
              <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900">
                123 Main Street, Austin, TX
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900">$450,000</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Beds</label>
                <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900">3</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-4 py-3 rounded-lg text-center font-semibold">
              Create Booking Link →
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 2,
      icon: Clock,
      title: 'Set Your Availability',
      description: 'Configure your working hours, showing duration, and buffer time between appointments. Your calendar stays under your control.',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">M</div>
              <div className="flex items-center gap-2 flex-1">
                <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">9:00 am</div>
                <span className="text-gray-400">-</span>
                <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">5:00 pm</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">W</div>
              <div className="flex items-center gap-2 flex-1">
                <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">9:00 am</div>
                <span className="text-gray-400">-</span>
                <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">5:00 pm</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">F</div>
              <div className="flex items-center gap-2 flex-1">
                <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">10:00 am</div>
                <span className="text-gray-400">-</span>
                <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">3:00 pm</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 3,
      icon: LinkIcon,
      title: 'Share Your Link',
      description: 'Copy your unique booking link and share it via text, email, social media, or embed it on your website. No app download required.',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Booking Link</label>
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900 flex-1 text-sm font-mono">
                  showly.app/s/abc123
                </div>
                <button className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold whitespace-nowrap">
                  Copy
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-center text-sm font-semibold">Email</div>
              <div className="bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2 text-center text-sm font-semibold">Text</div>
              <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-center text-sm font-semibold">Social</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 4,
      icon: Calendar,
      title: 'Clients Book Instantly',
      description: 'Clients see your real-time availability and pick their preferred time slot. No back-and-forth emails or phone tag required.',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-3">
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-gray-900">Select a time</div>
              <div className="text-sm text-gray-600">Tuesday, Jan 15</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                9:00 AM
              </button>
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                10:00 AM
              </button>
              <button className="bg-blue-600 text-white border-2 border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold">
                2:00 PM ✓
              </button>
              <button className="bg-gray-100 hover:bg-blue-600 hover:text-white border-2 border-transparent hover:border-blue-600 rounded-lg px-4 py-3 text-sm font-semibold transition-all">
                3:30 PM
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 5,
      icon: Mail,
      title: 'Get Notifications',
      description: 'Automatic email and SMS confirmations sent to both you and your client. Plus 24-hour and 1-hour reminders so no one forgets.',
      visual: (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Booking Confirmed</div>
                <div className="text-xs text-gray-600">Sent to you and client</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <Bell className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">24-Hour Reminder</div>
                <div className="text-xs text-gray-600">Tomorrow at 2:00 PM</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">1-Hour Reminder</div>
                <div className="text-xs text-gray-600">Today at 1:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: '-100px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = stepRefs.current.indexOf(entry.target as HTMLDivElement);
        if (entry.isIntersecting && index !== -1) {
          setVisibleSteps((prev) => {
            if (!prev.includes(index)) {
              return [...prev, index].sort((a, b) => a - b);
            }
            return prev;
          });
        }
      });
    }, observerOptions);

    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Calculate line height based on visible steps
  const lineHeight = visibleSteps.length > 0
    ? `${(Math.max(...visibleSteps) + 1) * (100 / steps.length)}%`
    : '0%';

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Vertical connecting line - animated as scroll */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 hidden lg:block" />
      <div
        ref={lineRef}
        className="absolute left-1/2 top-0 w-0.5 bg-gradient-to-b from-blue-600 via-emerald-500 to-blue-600 hidden lg:block transition-all duration-700 ease-out"
        style={{ height: lineHeight }}
      />

      {/* Steps */}
      <div className="space-y-24">
        {steps.map((step, index) => {
          const isVisible = visibleSteps.includes(index);

          return (
            <div
              key={index}
              ref={(el) => { stepRefs.current[index] = el; }}
              className="relative"
            >
              {/* Step number circle on timeline */}
              <div className={`absolute left-1/2 top-8 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl z-10 hidden lg:flex transition-all duration-500 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}>
                {step.number}
              </div>

              {/* Content - alternating left/right */}
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                index % 2 === 0 ? '' : 'lg:flex-row-reverse'
              }`}>
                {/* Text content */}
                <div className={`${index % 2 === 0 ? 'lg:text-right lg:pr-20' : 'lg:pl-20'} transition-all duration-700 delay-300 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}>
                  <div className={`inline-flex items-center gap-3 mb-4 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg lg:hidden">
                      <step.icon className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg hidden lg:flex">
                      <step.icon className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Visual preview */}
                <div className={`${index % 2 === 0 ? 'lg:pl-20' : 'lg:pr-20'} transition-all duration-700 delay-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}>
                  <div className="transform hover:scale-105 transition-all duration-300">
                    {step.visual}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [founderSpotsRemaining, setFounderSpotsRemaining] = useState<number | null>(null);

  // Check founder spots remaining via API
  useEffect(() => {
    const checkFounderSpots = async () => {
      try {
        const response = await fetch('/api/founder-spots');
        const data = await response.json();

        if (data.remaining !== undefined) {
          setFounderSpotsRemaining(data.remaining);
        }
      } catch (error) {
        console.error('Error checking founder spots:', error);
        // Default to showing founder plan if error
        setFounderSpotsRemaining(1);
      }
    };

    checkFounderSpots();
  }, []);

  useEffect(() => {
    setIsVisible(true);

    // Features section scroll animations
    const featuresSection = document.getElementById('features-section');
    const featuresHeader = document.querySelector('.features-header');
    const featureCards = document.querySelectorAll('.feature-card');

    const featuresObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              featuresHeader?.classList.add('fade-in-active');
            }, 100);
            setTimeout(() => {
              featureCards.forEach((card, index) => {
                setTimeout(() => {
                  card.classList.add('fade-in-active');
                }, index * 150);
              });
            }, 300);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (featuresSection) {
      featuresObserver.observe(featuresSection);
    }

    // Pricing section scroll animations
    const pricingSection = document.getElementById('pricing-section');
    const pricingHeader = document.querySelector('.pricing-header');
    const pricingCard = document.querySelector('.pricing-card');
    const pricingBadge = document.querySelector('.pricing-badge');
    const pricingFeatures = document.querySelectorAll('.pricing-feature');
    const pricingCta = document.querySelector('.pricing-cta');
    const pricingDisclaimer = document.querySelector('.pricing-disclaimer');
    const pricingGradient = document.querySelector('.pricing-gradient-overlay') as HTMLElement | null;

    const pricingObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Fade in elements sequentially
            setTimeout(() => {
              pricingHeader?.classList.add('fade-in-active');
            }, 100);
            setTimeout(() => {
              pricingCard?.classList.add('fade-in-active');
            }, 300);
            setTimeout(() => {
              pricingBadge?.classList.add('fade-in-active');
            }, 500);
            setTimeout(() => {
              pricingFeatures.forEach((feature, index) => {
                setTimeout(() => {
                  feature.classList.add('fade-in-active');
                }, index * 100);
              });
            }, 700);
            setTimeout(() => {
              pricingCta?.classList.add('fade-in-active');
            }, 1200);
            setTimeout(() => {
              pricingDisclaimer?.classList.add('fade-in-active');
            }, 1400);

            // Animate gradient background
            if (pricingGradient) {
              pricingGradient.style.background = 'linear-gradient(to bottom right, rgba(219, 234, 254, 0.4), rgba(209, 250, 229, 0.4), rgba(219, 234, 254, 0.4))';
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    if (pricingSection) {
      pricingObserver.observe(pricingSection);
    }

    return () => {
      featuresObserver.disconnect();
      pricingObserver.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-emerald-50 pt-32 pb-48 overflow-hidden">
        {/* Animated background house shapes */}
        <svg className="absolute top-20 left-10 w-72 h-72 mix-blend-multiply filter blur-md opacity-30 animate-blob" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Square base */}
          <rect x="25" y="50" width="50" height="40" fill="#cbd5e1" />
          {/* Triangle roof - wider than base */}
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#94a3b8" />
          {/* Window - left only */}
          <rect x="32" y="58" width="10" height="10" fill="#f0f9ff" />
          {/* Door */}
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>
        <svg className="absolute top-40 right-10 w-72 h-72 mix-blend-multiply filter blur-md opacity-30 animate-blob animation-delay-2000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Square base */}
          <rect x="25" y="50" width="50" height="40" fill="#6ee7b7" />
          {/* Triangle roof - wider than base */}
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#34d399" />
          {/* Window - right only */}
          <rect x="58" y="58" width="10" height="10" fill="#f0f9ff" />
          {/* Door */}
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>
        <svg className="absolute -bottom-8 left-1/2 w-72 h-72 mix-blend-multiply filter blur-md opacity-30 animate-blob animation-delay-4000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Square base */}
          <rect x="25" y="50" width="50" height="40" fill="#cbd5e1" />
          {/* Triangle roof - wider than base */}
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#94a3b8" />
          {/* Windows - both */}
          <rect x="32" y="58" width="10" height="10" fill="#f0f9ff" />
          <rect x="58" y="58" width="10" height="10" fill="#f0f9ff" />
          {/* Door */}
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>
        <svg className="absolute top-1/3 right-1/3 w-64 h-64 mix-blend-multiply filter blur-md opacity-25 animate-blob animation-delay-6000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Square base */}
          <rect x="25" y="50" width="50" height="40" fill="#a7f3d0" />
          {/* Triangle roof - wider than base */}
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#6ee7b7" />
          {/* Window - right only */}
          <rect x="58" y="58" width="10" height="10" fill="#f0f9ff" />
          {/* Door */}
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>
        <svg className="absolute bottom-32 right-20 w-60 h-60 mix-blend-multiply filter blur-md opacity-25 animate-blob animation-delay-7000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Square base */}
          <rect x="25" y="50" width="50" height="40" fill="#cbd5e1" />
          {/* Triangle roof - wider than base */}
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#94a3b8" />
          {/* Window - left only */}
          <rect x="32" y="58" width="10" height="10" fill="#f0f9ff" />
          {/* Door */}
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>

        {/* Floating key shapes */}
        <svg className="absolute top-32 right-1/4 w-40 h-40 mix-blend-multiply filter blur-sm opacity-25 animate-blob animation-delay-1000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Key head (circle) */}
          <circle cx="30" cy="30" r="15" fill="#fbbf24" />
          {/* Key head hole */}
          <circle cx="30" cy="30" r="6" fill="#f0f9ff" />
          {/* Key shaft */}
          <rect x="42" y="27" width="35" height="6" fill="#fbbf24" />
          {/* Key teeth */}
          <rect x="70" y="33" width="3" height="8" fill="#fbbf24" />
          <rect x="75" y="33" width="3" height="5" fill="#fbbf24" />
        </svg>

        <svg className="absolute bottom-20 left-1/4 w-32 h-32 mix-blend-multiply filter blur-sm opacity-25 animate-blob animation-delay-3000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Key head (circle) */}
          <circle cx="30" cy="30" r="12" fill="#f59e0b" />
          {/* Key head hole */}
          <circle cx="30" cy="30" r="5" fill="#f0f9ff" />
          {/* Key shaft */}
          <rect x="40" y="27" width="30" height="6" fill="#f59e0b" />
          {/* Key teeth */}
          <rect x="63" y="33" width="3" height="7" fill="#f59e0b" />
          <rect x="68" y="33" width="3" height="4" fill="#f59e0b" />
        </svg>

        <svg className="absolute top-1/2 left-16 w-36 h-36 mix-blend-multiply filter blur-sm opacity-20 animate-blob animation-delay-5000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Key head (circle) */}
          <circle cx="30" cy="30" r="13" fill="#fb923c" />
          {/* Key head hole */}
          <circle cx="30" cy="30" r="5" fill="#f0f9ff" />
          {/* Key shaft */}
          <rect x="41" y="27" width="32" height="6" fill="#fb923c" />
          {/* Key teeth */}
          <rect x="66" y="33" width="3" height="6" fill="#fb923c" />
          <rect x="71" y="33" width="3" height="9" fill="#fb923c" />
        </svg>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Text content */}
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                {STRINGS.landing.hero.headline}
              </h1>
              <p className={`text-xl md:text-2xl text-gray-600 mb-10 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {STRINGS.landing.hero.subheadline}
              </p>
              <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <Link
                  href="/signup"
                  className="relative bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {STRINGS.landing.hero.cta}
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </Link>
                <a
                  href="#how-it-works"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-all hover:scale-105 transform"
                >
                  {STRINGS.landing.hero.secondaryCta}
                </a>
              </div>
              <p className={`mt-6 text-gray-500 text-sm transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                {STRINGS.landing.hero.trustBadge}
              </p>
            </div>

            {/* Right side - Rotating feature cards */}
            <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <HeroRotatingCards />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Vertical Timeline */}
      <section id="how-it-works" className="py-40 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-32 opacity-0 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {STRINGS.landing.howItWorks.title}
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              {STRINGS.landing.howItWorks.subtitle}
            </p>
          </div>

          <VerticalTimeline />
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-40 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 opacity-0 features-header">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {STRINGS.landing.features.title}
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              {STRINGS.landing.features.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 feature-card">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6 transform transition-transform group-hover:rotate-12">
                <LinkIcon className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {STRINGS.landing.features.feature1.title}
              </h3>
              <p className="text-gray-600">
                {STRINGS.landing.features.feature1.description}
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 feature-card">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {STRINGS.landing.features.feature2.title}
              </h3>
              <p className="text-gray-600">
                {STRINGS.landing.features.feature2.description}
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 feature-card">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Mail className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {STRINGS.landing.features.feature3.title}
              </h3>
              <p className="text-gray-600">
                {STRINGS.landing.features.feature3.description}
              </p>
            </div>
            {/* Feature 4 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 feature-card">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {STRINGS.landing.features.feature4.title}
              </h3>
              <p className="text-gray-600">
                {STRINGS.landing.features.feature4.description}
              </p>
            </div>
            {/* Feature 5 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 feature-card">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Palette className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {STRINGS.landing.features.feature5.title}
              </h3>
              <p className="text-gray-600">
                {STRINGS.landing.features.feature5.description}
              </p>
            </div>
            {/* Feature 6 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 feature-card">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {STRINGS.landing.features.feature6.title}
              </h3>
              <p className="text-gray-600">
                {STRINGS.landing.features.feature6.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="py-40 bg-gray-50 relative overflow-hidden transition-all duration-1000">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/0 via-emerald-100/0 to-blue-100/0 transition-all duration-1000 pricing-gradient-overlay"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 opacity-0 pricing-header">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {STRINGS.landing.pricing.title}
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              {STRINGS.landing.pricing.subtitle}
            </p>
          </div>
          <div className="max-w-lg mx-auto opacity-0 pricing-card">
            <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center mb-8 opacity-0 pricing-badge">
                {founderSpotsRemaining && founderSpotsRemaining > 0 ? (
                  <>
                    <div className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4 animate-pulse">
                      {STRINGS.pricing.founderBadge}
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      {STRINGS.pricing.founder.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-2 mb-4">
                      <span className="text-5xl font-bold text-gray-900">
                        {STRINGS.pricing.founder.price}
                      </span>
                      <span className="text-xl text-gray-600">
                        {STRINGS.pricing.founder.period}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {STRINGS.pricing.founder.description}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      {STRINGS.pricing.standard.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-2 mb-4">
                      <span className="text-5xl font-bold text-gray-900">
                        {STRINGS.pricing.standard.price}
                      </span>
                      <span className="text-xl text-gray-600">
                        {STRINGS.pricing.standard.period}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {STRINGS.pricing.standard.description}
                    </p>
                  </>
                )}
              </div>
              <ul className="space-y-4 mb-8">
                {(founderSpotsRemaining && founderSpotsRemaining > 0
                  ? STRINGS.pricing.founder.features
                  : STRINGS.pricing.standard.features
                ).map((feature, index) => (
                  <li key={index} className="flex items-start hover:translate-x-2 transition-transform duration-200 opacity-0 pricing-feature" style={{ transitionDelay: `${index * 100}ms` }}>
                    <span className="text-emerald-500 mr-3 mt-1 text-xl">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="relative block w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-center px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all hover:scale-105 transform shadow-xl hover:shadow-2xl group overflow-hidden opacity-0 pricing-cta"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {STRINGS.landing.pricing.cta}
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Link>
              <p className="text-center text-sm text-gray-500 mt-4 opacity-0 pricing-disclaimer">
                {STRINGS.pricing.trial.noCreditCard}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-40 bg-gradient-to-br from-blue-600 to-emerald-600 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 opacity-0 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            {STRINGS.landing.finalCta.title}
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
            {STRINGS.landing.finalCta.subtitle}
          </p>
          <Link
            href="/signup"
            className="relative inline-block bg-white text-blue-600 px-10 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:scale-110 transform group overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {STRINGS.landing.finalCta.cta}
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </Link>
          <p className="mt-6 text-blue-100 text-sm">
            {STRINGS.landing.finalCta.trustBadge}
          </p>
        </div>
      </section>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          14% {
            transform: translate(45px, -70px) scale(1.05) rotate(3deg);
          }
          28% {
            transform: translate(80px, -30px) scale(0.95) rotate(-2deg);
          }
          42% {
            transform: translate(60px, 50px) scale(1.08) rotate(4deg);
          }
          57% {
            transform: translate(-20px, 80px) scale(0.92) rotate(-3deg);
          }
          71% {
            transform: translate(-70px, 40px) scale(1.03) rotate(2deg);
          }
          85% {
            transform: translate(-50px, -40px) scale(0.98) rotate(-1deg);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 12s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        /* Features and Pricing sections fade-in animations */
        .features-header,
        .feature-card,
        .pricing-header,
        .pricing-card,
        .pricing-badge,
        .pricing-feature,
        .pricing-cta,
        .pricing-disclaimer {
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .fade-in-active {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .features-header:not(.fade-in-active),
        .feature-card:not(.fade-in-active),
        .pricing-header:not(.fade-in-active),
        .pricing-card:not(.fade-in-active),
        .pricing-badge:not(.fade-in-active),
        .pricing-feature:not(.fade-in-active),
        .pricing-cta:not(.fade-in-active),
        .pricing-disclaimer:not(.fade-in-active) {
          transform: translateY(20px);
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-500 {
          animation-delay: 0.5s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-700 {
          animation-delay: 0.7s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-3000 {
          animation-delay: 3s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-5000 {
          animation-delay: 5s;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }

        .animation-delay-7000 {
          animation-delay: 7s;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
