'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { posthog } from '@/lib/posthog';
import { generateUniqueSlug } from '@/lib/utils/slug-generator';
import { getTimezoneForState } from '@/lib/utils/timezone';
import { uploadImage, validateImageFile } from '@/lib/utils/upload-image';
import { useGooglePlaces } from '@/lib/hooks/useGooglePlaces';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { US_STATES } from '@/lib/constants/us-states';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { CreatePropertyInput } from '@/types/database';

export default function NewPropertyPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [error, setError] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    description: '',
    mlsNumber: '',
  });

  // Google Places autocomplete
  const handlePlaceSelected = useCallback((place: any) => {
    setFormData((prev) => ({
      ...prev,
      street: place.street || prev.street,
      city: place.city || prev.city,
      state: place.state || prev.state,
      zip: place.zip || prev.zip,
    }));
  }, []);

  const { inputRef: streetInputRef } = useGooglePlaces(handlePlaceSelected);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(`${file.name}: ${validationError}`);
        return;
      }
    }

    setError('');
    setLoadingPreviews(true);

    try {
      // Create preview URLs for all files
      const newPreviewUrls: string[] = [];
      for (const file of files) {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newPreviewUrls.push(url);
      }

      // Update state with all new files and URLs at once
      setPhotoFiles((prev) => [...prev, ...files]);
      setPhotoUrls((prev) => [...prev, ...newPreviewUrls]);
    } catch (err) {
      setError('Failed to load photo previews');
    } finally {
      setLoadingPreviews(false);
    }

    // Reset file input
    e.target.value = '';
  }

  function handleRemovePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMovePhotoUp(index: number) {
    if (index === 0) return;
    setPhotoFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles;
    });
    setPhotoUrls((prev) => {
      const newUrls = [...prev];
      [newUrls[index - 1], newUrls[index]] = [newUrls[index], newUrls[index - 1]];
      return newUrls;
    });
  }

  function handleMovePhotoDown(index: number) {
    if (index === photoUrls.length - 1) return;
    setPhotoFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      return newFiles;
    });
    setPhotoUrls((prev) => {
      const newUrls = [...prev];
      [newUrls[index], newUrls[index + 1]] = [newUrls[index + 1], newUrls[index]];
      return newUrls;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to create a property');
      }

      // Upload all photo files
      const uploadedPhotoURLs: string[] = [];
      if (photoFiles.length > 0) {
        setUploading(true);
        try {
          for (const file of photoFiles) {
            const url = await uploadImage(file, 'properties');
            uploadedPhotoURLs.push(url);
          }
        } catch (uploadError: any) {
          throw new Error(uploadError.message || 'Failed to upload images');
        } finally {
          setUploading(false);
        }
      }

      // Generate unique booking slug
      const bookingSlug = await generateUniqueSlug();

      // Create property document (only include optional fields if they have values)
      const propertyData: any = {
        agentId: user.uid,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          formatted: `${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}`,
        },
        price: Number(formData.price),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        bookingSlug,
        isBookingEnabled: true,
        status: 'active' as const,
        // Note: showingDuration and bufferTime now come from agent.settings globally
        timezone: getTimezoneForState(formData.state), // Auto-detect timezone from state
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Only add optional fields if they have values
      if (formData.sqft) {
        propertyData.sqft = Number(formData.sqft);
      }
      if (formData.description.trim()) {
        propertyData.description = formData.description.trim();
      }
      if (formData.mlsNumber) {
        propertyData.mlsNumber = formData.mlsNumber;
      }
      if (uploadedPhotoURLs.length > 0) {
        propertyData.photos = uploadedPhotoURLs;
        propertyData.photoURL = uploadedPhotoURLs[0]; // First photo for backward compatibility
      }

      await addDoc(collection(db, 'properties'), propertyData);

      // Track property creation
      posthog.capture('property_created', {
        property_price: propertyData.price,
        property_bedrooms: propertyData.bedrooms,
        property_bathrooms: propertyData.bathrooms,
        property_state: propertyData.address.state,
        has_photos: uploadedPhotoURLs.length > 0,
        photo_count: uploadedPhotoURLs.length,
        has_description: !!propertyData.description,
        has_mls: !!propertyData.mlsNumber,
      });

      // Track feature discovery - photo upload
      if (uploadedPhotoURLs.length > 0) {
        posthog.capture('feature_discovered_photo_upload', {
          photo_count: uploadedPhotoURLs.length,
        });
      }

      // Redirect to properties list
      router.push('/dashboard/properties');
    } catch (err: any) {
      console.error('Error creating property:', err);
      setError(err.message || 'Failed to create property. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className={STYLES.text.h2}>{STRINGS.properties.form.title}</h1>
        <p className={cn(STYLES.text.small, 'mt-2')}>
          Fill in the details below to create a new property listing
        </p>
      </div>

      {/* Form */}
      <div className={STYLES.card.default}>
        <form onSubmit={handleSubmit} className={STYLES.form.section}>
          {error && (
            <div className={STYLES.alert.error}>
              {error}
            </div>
          )}

          {/* Address Section */}
          <div>
            <h3 className={cn(STYLES.text.h4, 'mb-4')}>Property Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="street" className={STYLES.label.default}>
                  {STRINGS.properties.form.addressLabel}
                </label>
                <input
                  ref={streetInputRef}
                  id="street"
                  name="street"
                  type="text"
                  required
                  value={formData.street}
                  onChange={handleChange}
                  className={cn(STYLES.input.base, STYLES.input.default)}
                  placeholder={STRINGS.properties.form.addressPlaceholder}
                  autoComplete="off"
                />
                <p className={cn(STYLES.text.tiny, 'mt-1')}>
                  Start typing and select from suggestions to auto-fill address details
                </p>
              </div>

              <div>
                <label htmlFor="city" className={STYLES.label.default}>
                  {STRINGS.properties.form.cityLabel}
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className={cn(STYLES.input.base, STYLES.input.default)}
                  placeholder={STRINGS.properties.form.cityPlaceholder}
                />
              </div>

              <div>
                <label htmlFor="state" className={STYLES.label.default}>
                  {STRINGS.properties.form.stateLabel}
                </label>
                <select
                  id="state"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className={cn(STYLES.select.base, STYLES.select.default)}
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="zip" className={STYLES.label.default}>
                  {STRINGS.properties.form.zipLabel}
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  required
                  value={formData.zip}
                  onChange={handleChange}
                  className={cn(STYLES.input.base, STYLES.input.default)}
                  placeholder={STRINGS.properties.form.zipPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className={cn(STYLES.text.h4, 'mb-4')}>Property Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className={STYLES.label.default}>
                  {STRINGS.properties.form.priceLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.price}
                    onChange={handleChange}
                    className={cn(STYLES.input.base, STYLES.input.default, 'pl-7')}
                    placeholder={STRINGS.properties.form.pricePlaceholder}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bedrooms" className={STYLES.label.default}>
                  {STRINGS.properties.form.bedroomsLabel}
                </label>
                <input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  required
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className={cn(STYLES.input.base, STYLES.input.default)}
                />
              </div>

              <div>
                <label htmlFor="bathrooms" className={STYLES.label.default}>
                  {STRINGS.properties.form.bathroomsLabel}
                </label>
                <input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className={cn(STYLES.input.base, STYLES.input.default)}
                />
              </div>

              <div>
                <label htmlFor="sqft" className={STYLES.label.default}>
                  {STRINGS.properties.form.sqftLabel}
                </label>
                <input
                  id="sqft"
                  name="sqft"
                  type="number"
                  min="0"
                  value={formData.sqft}
                  onChange={handleChange}
                  className={cn(STYLES.input.base, STYLES.input.default)}
                  placeholder={STRINGS.properties.form.sqftPlaceholder}
                />
              </div>
            </div>

            {/* Description (Full width) */}
            <div className="col-span-2 mt-6 mb-6">
              <label htmlFor="description" className={STYLES.label.default}>
                Property Description <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={1000}
                value={formData.description}
                onChange={handleChange}
                className={cn(STYLES.input.base, STYLES.input.default, 'resize-none')}
                placeholder="Highlight unique features, recent updates, or neighborhood perks..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* MLS Number */}
            <div>
              <label htmlFor="mlsNumber" className={STYLES.label.default}>
                {STRINGS.properties.form.mlsLabel}
              </label>
              <input
                id="mlsNumber"
                name="mlsNumber"
                type="text"
                value={formData.mlsNumber}
                onChange={handleChange}
                className={cn(STYLES.input.base, STYLES.input.default)}
                placeholder={STRINGS.properties.form.mlsPlaceholder}
              />
            </div>

            {/* Property Photos */}
            <div className="mt-6">
              <label className={STYLES.label.default}>
                {STRINGS.properties.form.photoLabel}
                {photoUrls.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({STRINGS.properties.form.photoCount(photoUrls.length)})
                  </span>
                )}
              </label>

              {/* Photos Grid */}
              {photoUrls.length > 0 && (
                <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Property photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                          {STRINGS.properties.form.photoPrimary}
                        </span>
                      )}

                      {/* Photo Controls */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMovePhotoUp(index)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-50 active:scale-95 md:hover:scale-110 transition-all border border-gray-200"
                            title="Move left"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {index < photoUrls.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMovePhotoDown(index)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-50 active:scale-95 md:hover:scale-110 transition-all border border-gray-200"
                            title="Move right"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 active:scale-95 md:hover:scale-110 transition-all"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <input
                    id="photoFile"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="photoFile"
                    className={cn(
                      'cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium',
                      'text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                      (uploading || loadingPreviews) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {loadingPreviews
                      ? 'Loading previews...'
                      : uploading
                      ? STRINGS.properties.form.photoUploading
                      : STRINGS.properties.form.photoUploadButton
                    }
                  </label>
                  <p className={cn(STYLES.text.tiny, 'mt-1')}>
                    JPG, PNG, or WebP (max 5MB each). Select multiple files to upload at once.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/properties')}
              className={STYLES.button.secondary}
            >
              {STRINGS.properties.form.cancelButton}
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className={STYLES.button.primary}
            >
              {uploading
                ? STRINGS.properties.form.photoUploading
                : loading
                ? STRINGS.properties.form.submittingButton
                : STRINGS.properties.form.submitButton
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
