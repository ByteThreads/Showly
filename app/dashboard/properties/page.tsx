'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { posthog } from '@/lib/posthog';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import type { Property } from '@/types/database';
import { Home, BedDouble, Bath, Ruler, Search, SlidersHorizontal, Plus, ChevronDown } from 'lucide-react';

export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function fetchProperties() {
      if (!user) return;

      // Track properties page view
      posthog.capture('dashboard_section_viewed', {
        section: 'properties',
      });

      try {
        const q = query(
          collection(db, 'properties'),
          where('agentId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const propertiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];

        setProperties(propertiesData);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [user]);

  async function togglePropertyStatus(propertyId: string, currentStatus: string) {
    try {
      setUpdatingId(propertyId);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setProperties(properties.map(p =>
        p.id === propertyId ? { ...p, status: newStatus as any } : p
      ));
    } catch (error) {
      console.error('Error toggling property status:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let result = [...properties];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(p => p.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.address.street.toLowerCase().includes(query) ||
        p.address.city.toLowerCase().includes(query) ||
        p.address.state.toLowerCase().includes(query) ||
        p.address.formatted?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'address':
        result.sort((a, b) => a.address.street.localeCompare(b.address.street));
        break;
    }

    return result;
  }, [properties, filterStatus, searchQuery, sortBy]);

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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={STYLES.text.h2}>{STRINGS.properties.title}</h1>
          <p className={cn(STYLES.text.small, 'mt-2')}>
            {STRINGS.properties.subtitle}
          </p>
        </div>
        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          {STRINGS.properties.addNew}
        </Link>
      </div>

      {/* Filters and Search */}
      {properties.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 pl-9 pr-8 appearance-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 min-w-[180px] cursor-pointer hover:border-gray-400 transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
                <option value="address">Address (A-Z)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="inline-flex rounded-lg border border-gray-300 bg-white h-10">
              <button
                onClick={() => setFilterStatus('all')}
                className={cn(
                  'px-4 rounded-l-lg text-sm font-medium transition-all',
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={cn(
                  'px-4 border-x border-gray-300 text-sm font-medium transition-all',
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={cn(
                  'px-4 rounded-r-lg text-sm font-medium transition-all',
                  filterStatus === 'inactive'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || filterStatus !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredAndSortedProperties.length}</span> of <span className="font-semibold">{properties.length}</span> properties
            </div>
          )}
        </div>
      )}

      {/* Properties List or Empty State */}
      {properties.length === 0 ? (
        <div className={STYLES.card.default}>
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Home className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className={STYLES.text.h3}>{STRINGS.properties.noProperties}</h3>
            <p className={cn(STYLES.text.small, 'mt-2 mb-6')}>
              {STRINGS.properties.createFirst}
            </p>
            <Link
              href="/dashboard/properties/new"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {STRINGS.properties.addNew}
            </Link>
          </div>
        </div>
      ) : filteredAndSortedProperties.length === 0 ? (
        <div className={STYLES.card.default}>
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Search className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className={STYLES.text.h3}>No properties found</h3>
            <p className={cn(STYLES.text.small, 'mt-2')}>
              Try adjusting your filters or search query
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProperties.map((property) => (
            <div key={property.id} className={STYLES.card.hover}>
              {/* Property Image */}
              <img
                src={property.photoURL || '/property-placeholder.svg'}
                alt={property.address.formatted}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />

              {/* Property Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(STYLES.text.h4, 'text-blue-600')}>
                    ${property.price.toLocaleString()}
                  </span>
                  <span className={cn(
                    STYLES.badge.default,
                    property.status === 'active' ? STYLES.badge.success : STYLES.badge.neutral
                  )}>
                    {property.status}
                  </span>
                </div>

                <p className={cn(STYLES.text.body, 'mb-2')}>
                  {property.address.street}
                </p>
                <p className={cn(STYLES.text.small, 'mb-4')}>
                  {property.address.city}, {property.address.state} {property.address.zip}
                </p>

                <div className="flex items-center space-x-4 mb-4">
                  <span className={cn(STYLES.text.small, 'flex items-center gap-1')}>
                    <BedDouble className="w-4 h-4" />
                    {property.bedrooms} bed
                  </span>
                  <span className={cn(STYLES.text.small, 'flex items-center gap-1')}>
                    <Bath className="w-4 h-4" />
                    {property.bathrooms} bath
                  </span>
                  {property.sqft && (
                    <span className={cn(STYLES.text.small, 'flex items-center gap-1')}>
                      <Ruler className="w-4 h-4" />
                      {property.sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>

                {/* Booking Link */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className={cn(STYLES.text.tiny, 'mb-2 text-blue-800 font-medium')}>
                    Booking Link:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className={cn(STYLES.text.small, 'text-blue-600 flex-1 truncate')}>
                      {window.location.origin}/s/{property.bookingSlug}
                    </code>

                    {/* Status Toggle */}
                    <button
                      onClick={() => togglePropertyStatus(property.id, property.status)}
                      disabled={updatingId === property.id}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-all border-2 whitespace-nowrap',
                        updatingId === property.id && 'opacity-50 cursor-not-allowed',
                        property.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      {updatingId === property.id ? 'Updating...' : property.status === 'active' ? 'Active' : 'Inactive'}
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/s/${property.bookingSlug}`;
                        navigator.clipboard.writeText(url);
                        setCopiedId(property.id);
                        setTimeout(() => setCopiedId(null), 2000);

                        // Track booking link copied
                        posthog.capture('booking_link_copied', {
                          property_price: property.price,
                          property_state: property.address.state,
                          property_bedrooms: property.bedrooms,
                          property_status: property.status,
                        });
                      }}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                        copiedId === property.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      {copiedId === property.id ? '✓ Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* Edit Button */}
                <Link
                  href={`/dashboard/properties/${property.id}/edit`}
                  className={cn(
                    'mt-3 block text-center px-4 py-2 text-sm font-medium rounded-md transition-all',
                    'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  )}
                >
                  {STRINGS.properties.edit}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
