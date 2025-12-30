'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTimezoneForState } from '@/lib/utils/timezone';
import { uploadImage, validateImageFile } from '@/lib/utils/upload-image';
import { useGooglePlaces } from '@/lib/hooks/useGooglePlaces';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { US_STATES } from '@/lib/constants/us-states';
import type { Property } from '@/types/database';

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const propertyId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [fetchingProperty, setFetchingProperty] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState<Property | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([]);

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
    photoURL: '',
  });

  // Fetch property data
  useEffect(() => {
    async function fetchProperty() {
      if (!user || !propertyId) return;

      try {
        const propertyRef = doc(db, 'properties', propertyId);
        const propertySnap = await getDoc(propertyRef);

        if (!propertySnap.exists()) {
          setError('Property not found');
          return;
        }

        const propertyData = { id: propertySnap.id, ...propertySnap.data() } as Property;

        // Check if property belongs to current user
        if (propertyData.agentId !== user.uid) {
          setError('You do not have permission to edit this property');
          return;
        }

        setProperty(propertyData);

        // Load existing photos
        if (propertyData.photos && propertyData.photos.length > 0) {
          setExistingPhotos(propertyData.photos);
        } else if (propertyData.photoURL) {
          // Backward compatibility: convert single photo to array
          setExistingPhotos([propertyData.photoURL]);
        }

        // Pre-fill form
        setFormData({
          street: propertyData.address.street,
          city: propertyData.address.city,
          state: propertyData.address.state,
          zip: propertyData.address.zip,
          price: String(propertyData.price),
          bedrooms: String(propertyData.bedrooms),
          bathrooms: String(propertyData.bathrooms),
          sqft: propertyData.sqft ? String(propertyData.sqft) : '',
          description: propertyData.description || '',
          mlsNumber: propertyData.mlsNumber || '',
          photoURL: propertyData.photoURL || '',
        });
      } catch (err: any) {
        console.error('Error fetching property:', err);
        setError(err.message || 'Failed to load property');
      } finally {
        setFetchingProperty(false);
      }
    }

    fetchProperty();
  }, [user, propertyId]);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
      setNewPhotoUrls((prev) => [...prev, ...newPreviewUrls]);
    } catch (err) {
      setError('Failed to load photo previews');
    } finally {
      setLoadingPreviews(false);
    }

    // Reset file input
    e.target.value = '';
  }

  function handleRemoveExistingPhoto(index: number) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveNewPhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMovePhotoUp(index: number, isExisting: boolean) {
    if (index === 0) return;

    if (isExisting) {
      setExistingPhotos((prev) => {
        const newPhotos = [...prev];
        [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
        return newPhotos;
      });
    } else {
      const adjustedIndex = index - existingPhotos.length;
      setPhotoFiles((prev) => {
        const newFiles = [...prev];
        [newFiles[adjustedIndex - 1], newFiles[adjustedIndex]] = [newFiles[adjustedIndex], newFiles[adjustedIndex - 1]];
        return newFiles;
      });
      setNewPhotoUrls((prev) => {
        const newUrls = [...prev];
        [newUrls[adjustedIndex - 1], newUrls[adjustedIndex]] = [newUrls[adjustedIndex], newUrls[adjustedIndex - 1]];
        return newUrls;
      });
    }
  }

  function handleMovePhotoDown(index: number, isExisting: boolean, totalPhotos: number) {
    if (index === totalPhotos - 1) return;

    if (isExisting && index < existingPhotos.length - 1) {
      setExistingPhotos((prev) => {
        const newPhotos = [...prev];
        [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]];
        return newPhotos;
      });
    } else if (!isExisting) {
      const adjustedIndex = index - existingPhotos.length;
      setPhotoFiles((prev) => {
        const newFiles = [...prev];
        [newFiles[adjustedIndex], newFiles[adjustedIndex + 1]] = [newFiles[adjustedIndex + 1], newFiles[adjustedIndex]];
        return newFiles;
      });
      setNewPhotoUrls((prev) => {
        const newUrls = [...prev];
        [newUrls[adjustedIndex], newUrls[adjustedIndex + 1]] = [newUrls[adjustedIndex + 1], newUrls[adjustedIndex]];
        return newUrls;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user || !property) {
        throw new Error('You must be logged in to edit a property');
      }

      // Upload new photo files
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

      // Combine existing photos with newly uploaded photos
      const allPhotos = [...existingPhotos, ...uploadedPhotoURLs];

      // Update property document
      const propertyData: any = {
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
        timezone: getTimezoneForState(formData.state), // Update timezone if state changed
        updatedAt: Timestamp.now(),
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
      if (allPhotos.length > 0) {
        propertyData.photos = allPhotos;
        propertyData.photoURL = allPhotos[0]; // First photo for backward compatibility
      }

      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, propertyData);

      // Redirect to properties list
      router.push('/dashboard/properties');
    } catch (err: any) {
      console.error('Error updating property:', err);
      setError(err.message || 'Failed to update property. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (fetchingProperty) {
    return (
      <div className={STYLES.loading.overlay}>
        <div className="text-center">
          <div className={STYLES.loading.spinner}></div>
          <p className={STYLES.loading.text}>{STRINGS.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div>
        <div className={STYLES.alert.error}>
          {error}
        </div>
        <button
          onClick={() => router.push('/dashboard/properties')}
          className={cn(STYLES.button.secondary, 'mt-4')}
        >
          {STRINGS.common.back}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className={STYLES.text.h2}>{STRINGS.properties.form.editTitle}</h1>
        <p className={cn(STYLES.text.small, 'mt-2')}>
          Update the details for this property listing
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
                    step="1000"
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

              {/* Description (Full width) */}
              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
                <label className={STYLES.label.default}>
                  {STRINGS.properties.form.photoLabel}
                  {(existingPhotos.length + newPhotoUrls.length) > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({STRINGS.properties.form.photoCount(existingPhotos.length + newPhotoUrls.length)})
                    </span>
                  )}
                </label>

                {/* Photos Grid */}
                {(existingPhotos.length > 0 || newPhotoUrls.length > 0) && (
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Existing photos */}
                    {existingPhotos.map((url, index) => (
                      <div key={`existing-${index}`} className="relative group">
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
                        <div className="absolute top-2 right-2 flex gap-1">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMovePhotoUp(index, true)}
                              className="p-1.5 bg-gray-800 bg-opacity-70 text-white rounded hover:bg-opacity-90"
                              title="Move up"
                            >
                              {STRINGS.properties.form.photoMoveUp}
                            </button>
                          )}
                          {index < (existingPhotos.length + newPhotoUrls.length) - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMovePhotoDown(index, true, existingPhotos.length + newPhotoUrls.length)}
                              className="p-1.5 bg-gray-800 bg-opacity-70 text-white rounded hover:bg-opacity-90"
                              title="Move down"
                            >
                              {STRINGS.properties.form.photoMoveDown}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingPhoto(index)}
                            className="p-1.5 bg-red-600 bg-opacity-70 text-white rounded hover:bg-opacity-90"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* New photos */}
                    {newPhotoUrls.map((url, index) => (
                      <div key={`new-${index}`} className="relative group">
                        <img
                          src={url}
                          alt={`New property photo ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border-2 border-blue-300"
                        />
                        <span className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                          NEW
                        </span>

                        {/* Photo Controls */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {(existingPhotos.length + index) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMovePhotoUp(existingPhotos.length + index, false)}
                              className="p-1.5 bg-gray-800 bg-opacity-70 text-white rounded hover:bg-opacity-90"
                              title="Move up"
                            >
                              {STRINGS.properties.form.photoMoveUp}
                            </button>
                          )}
                          {index < newPhotoUrls.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMovePhotoDown(existingPhotos.length + index, false, existingPhotos.length + newPhotoUrls.length)}
                              className="p-1.5 bg-gray-800 bg-opacity-70 text-white rounded hover:bg-opacity-90"
                              title="Move down"
                            >
                              {STRINGS.properties.form.photoMoveDown}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveNewPhoto(index)}
                            className="p-1.5 bg-red-600 bg-opacity-70 text-white rounded hover:bg-opacity-90"
                            title="Remove"
                          >
                            ✕
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
              disabled={loading || uploading || loadingPreviews}
              className={STYLES.button.primary}
            >
              {loadingPreviews
                ? 'Loading previews...'
                : uploading
                ? STRINGS.properties.form.photoUploading
                : loading
                ? STRINGS.properties.form.updatingButton
                : STRINGS.properties.form.updateButton
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
