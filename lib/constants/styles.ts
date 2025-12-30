// Centralized style constants for consistent UI
// Using Tailwind classes for easy customization

// Color System
// Primary (Blue): Trust, professionalism - 60% of design
// Success (Emerald): Action, growth - 30% of design
// Accent (Amber): Urgency, highlights - 10% of design
const COLORS = {
  primary: {
    main: 'blue-600',      // #2563EB
    light: 'blue-500',     // #3B82F6
    dark: 'blue-700',      // #1D4ED8
    bg: 'blue-50',         // Light backgrounds
  },
  success: {
    main: 'emerald-500',   // #10B981
    light: 'emerald-400',  // #34D399
    dark: 'emerald-600',   // #059669
    bg: 'emerald-50',      // Light backgrounds
  },
  accent: {
    main: 'amber-500',     // #F59E0B
    light: 'amber-400',    // #FBBF24
    dark: 'amber-600',     // #D97706
    bg: 'amber-50',        // Light backgrounds
  },
} as const;

export const STYLES = {
  // Layout
  container: {
    centered: 'min-h-screen flex items-center justify-center bg-gray-50 px-4',
    page: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
    card: 'bg-white shadow rounded-lg p-6',
  },

  // Forms
  form: {
    wrapper: 'max-w-md w-full space-y-8',
    section: 'space-y-4',
    group: 'space-y-1',
  },

  // Input fields
  input: {
    base: 'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none bg-white appearance-none',
    default: 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500',
    error: 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500',
    disabled: 'bg-gray-100 cursor-not-allowed opacity-50',
  },

  // Select dropdown (same as input but with dropdown arrow)
  select: {
    base: 'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none bg-white appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10',
    default: 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500',
    error: 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500',
    disabled: 'bg-gray-100 cursor-not-allowed opacity-50',
  },

  // Labels
  label: {
    default: 'block text-sm font-medium text-gray-700',
    required: 'block text-sm font-medium text-gray-700 after:content-["*"] after:ml-0.5 after:text-red-500',
  },

  // Buttons
  button: {
    // Primary button (main actions)
    primary: 'w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',

    // Secondary button (alternative actions)
    secondary: 'w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',

    // Danger button (destructive actions)
    danger: 'w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',

    // Text button (low emphasis)
    text: 'text-blue-600 hover:text-blue-500 font-medium transition-colors',

    // Showing action buttons (soft colors)
    action: {
      base: 'px-3 py-1.5 text-sm font-medium text-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      confirm: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200',
      complete: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200',
      cancel: 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200',
      noShow: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200',
      reschedule: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200',
      contact: 'text-blue-600 hover:text-blue-700 border border-blue-600 hover:bg-blue-50',
    },
  },

  // Typography
  text: {
    h1: 'text-4xl font-bold text-gray-900',
    h2: 'text-3xl font-semibold text-gray-900',
    h3: 'text-2xl font-semibold text-gray-900',
    h4: 'text-xl font-semibold text-gray-900',
    large: 'text-lg text-gray-700',
    base: 'text-base text-gray-700',
    body: 'text-base text-gray-700',
    small: 'text-sm text-gray-600',
    tiny: 'text-xs text-gray-500',
    muted: 'text-gray-500',
    error: 'text-red-600',
    success: 'text-green-600',
  },

  // Links
  link: {
    default: 'font-medium text-blue-600 hover:text-blue-500 transition-colors',
    muted: 'text-gray-600 hover:text-gray-900 transition-colors',
  },

  // Alerts/Messages
  alert: {
    error: 'bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded',
    success: 'bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded',
    warning: 'bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded',
    info: 'bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded',
  },

  // Loading states
  loading: {
    spinner: 'w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto',
    overlay: 'min-h-screen flex items-center justify-center',
    text: 'mt-4 text-gray-600',
  },

  // Cards
  card: {
    default: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
    hover: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer',
    selected: 'bg-blue-50 rounded-lg shadow-sm border-2 border-blue-500 p-6',
  },

  // Navigation
  nav: {
    link: 'px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors',
    linkActive: 'px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700',
  },

  // Dashboard
  dashboard: {
    layout: 'min-h-screen bg-gray-50',
    sidebar: 'fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col',
    sidebarHeader: 'p-6 border-b border-gray-200',
    sidebarNav: 'flex-1 px-4 py-6 space-y-1',
    sidebarFooter: 'p-4 border-t border-gray-200',
    main: 'ml-64 min-h-screen',
    content: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
    header: 'mb-8',
    stats: 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8',
    statCard: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
  },

  // Badges
  badge: {
    default: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
  },

  // Booking Page
  booking: {
    hero: 'w-full h-[400px] md:h-[600px] object-cover',
    container: 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
    propertyPrice: 'text-3xl md:text-4xl font-bold text-gray-900',
    propertyAddress: 'text-lg md:text-xl text-gray-600 mt-2',
    propertyDetails: 'flex gap-6 mt-4 text-gray-700',
    propertyDetail: 'flex items-center gap-2',
    agentCard: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
    agentPhoto: 'w-16 h-16 rounded-full object-cover',
    agentName: 'text-lg font-semibold text-gray-900',
    agentContact: 'text-sm text-gray-600',
    timeSlot: 'bg-white border-2 border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all font-semibold text-gray-900 shadow-sm',
    timeSlotSelected: 'bg-blue-600 border-2 border-blue-700 rounded-lg p-4 text-center cursor-pointer text-white font-semibold shadow-md',
    timeSlotDisabled: 'bg-gray-100 border-2 border-gray-200 rounded-lg p-4 text-center cursor-not-allowed opacity-50 text-gray-500',
    timeSlotGrid: 'grid grid-cols-2 md:grid-cols-4 gap-3 mt-4',
    sectionTitle: 'text-2xl font-bold text-gray-900 mb-4',
    dayHeader: 'text-lg font-semibold text-gray-900 mt-6 mb-3',
    bookButton: 'w-full flex justify-center py-4 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
    socialProof: 'text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 inline-block',
  },
} as const;

// Helper function to combine classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
