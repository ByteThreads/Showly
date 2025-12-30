'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { uploadImage, validateImageFile } from '@/lib/utils/upload-image';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils/crop-image';
import 'react-easy-crop/react-easy-crop.css';

export default function ProfilePage() {
  const { user, agent, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop dialog state
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    brokerage: '',
    bio: '',
  });

  // Load agent data when available
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        email: agent.email || '',
        phone: agent.phone || '',
        brokerage: agent.brokerage || '',
        bio: agent.bio || '',
      });
      if (agent.photoURL) {
        setPhotoPreview(agent.photoURL);
      }
    }
  }, [agent]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  // Crop callback
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setUploading(true);

    try {
      let fileToShow = file;

      // Convert HEIC to JPEG first if necessary
      const isHeic = file.type === 'image/heic' ||
                     file.type === 'image/heif' ||
                     file.name.toLowerCase().endsWith('.heic') ||
                     file.name.toLowerCase().endsWith('.heif');

      if (isHeic) {
        // Send to server for conversion
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/convert-heic', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to convert HEIC image');
        }

        // Get converted JPEG blob
        const jpegBlob = await response.blob();
        fileToShow = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
        });
      }

      // Convert file to data URL using FileReader
      const reader = new FileReader();
      reader.onload = () => {
        const imageDataUrl = reader.result as string;
        setImageToCrop(imageDataUrl);
        setShowCropDialog(true);
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Failed to load image. Please try again.');
        setUploading(false);
      };
      reader.readAsDataURL(fileToShow);
    } catch (err) {
      console.error('Error loading image:', err);
      setError('Failed to load image. Please try again.');
      setUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleApplyCrop() {
    if (!imageToCrop || !croppedAreaPixels) return;

    setUploading(true);
    setShowCropDialog(false);

    try {
      // Get cropped image as blob
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);

      // Convert blob to file
      const croppedFile = new File([croppedBlob], 'profile-photo.jpg', {
        type: 'image/jpeg',
      });

      // Upload to Firebase Storage
      const photoURL = await uploadImage(croppedFile, 'agents');

      // Update agent document
      if (agent) {
        await updateDoc(doc(db, 'agents', agent.id), {
          photoURL,
          updatedAt: new Date(),
        });
      }

      setPhotoPreview(photoURL);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Clean up
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleCancelCrop() {
    setShowCropDialog(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function handleRemovePhoto() {
    if (!agent) return;

    try {
      await updateDoc(doc(db, 'agents', agent.id), {
        photoURL: null,
        updatedAt: new Date(),
      });

      setPhotoPreview(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error removing photo:', err);
      setError('Failed to remove photo. Please try again.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agent) return;

    setError('');
    setSaving(true);

    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        updatedAt: new Date(),
      };

      // Only include optional fields if they have values
      if (formData.brokerage) {
        updateData.brokerage = formData.brokerage;
      }
      if (formData.bio) {
        updateData.bio = formData.bio;
      }

      await updateDoc(doc(db, 'agents', agent.id), updateData);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(STRINGS.profile.errorMessage);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !agent) {
    return (
      <div className={STYLES.loading.overlay}>
        <div>
          <div className={STYLES.loading.spinner} />
          <p className={STYLES.loading.text}>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Get initials for default avatar
  const initials = agent.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className={STYLES.text.h1}>{STRINGS.profile.title}</h1>
        <p className={STYLES.text.large}>{STRINGS.profile.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Picture Section */}
        <div className={cn(STYLES.card.default, 'space-y-4')}>
          <h2 className={STYLES.text.h3}>{STRINGS.profile.photoLabel}</h2>
          <p className={cn(STYLES.text.small, 'text-gray-600')}>{STRINGS.profile.photoHint}</p>

          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={agent.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-gray-300 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-600">{initials}</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className={cn(STYLES.loading.spinner, '!w-8 !h-8 !border-2')} />
                </div>
              )}
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(STYLES.button.secondary, '!w-auto')}
              >
                {uploading
                  ? STRINGS.profile.uploading
                  : photoPreview
                    ? STRINGS.profile.changePhoto
                    : STRINGS.profile.uploadPhoto}
              </button>
              {photoPreview && !uploading && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className={cn(STYLES.button.secondary, '!w-auto text-red-600 hover:bg-red-50')}
                >
                  {STRINGS.profile.removePhoto}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className={cn(STYLES.card.default, 'space-y-6')}>
          <h2 className={STYLES.text.h3}>Profile Information</h2>

          {error && (
            <div className={STYLES.alert.error}>
              {error}
            </div>
          )}

          {success && (
            <div className={STYLES.alert.success}>
              {STRINGS.profile.successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className={STYLES.label.default}>
                {STRINGS.profile.nameLabel}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={cn(STYLES.input.base, STYLES.input.default)}
                placeholder={STRINGS.profile.namePlaceholder}
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label htmlFor="email" className={STYLES.label.default}>
                {STRINGS.profile.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                disabled
                value={formData.email}
                className={cn(STYLES.input.base, STYLES.input.disabled, 'text-gray-900')}
                placeholder={STRINGS.profile.emailPlaceholder}
              />
              <p className={cn(STYLES.text.small, 'mt-1 text-gray-500')}>
                Email cannot be changed
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={STYLES.label.default}>
                {STRINGS.profile.phoneLabel}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className={cn(STYLES.input.base, STYLES.input.default)}
                placeholder={STRINGS.profile.phonePlaceholder}
              />
            </div>

            {/* Brokerage */}
            <div>
              <label htmlFor="brokerage" className={STYLES.label.default}>
                {STRINGS.profile.brokerageLabel}
              </label>
              <input
                id="brokerage"
                name="brokerage"
                type="text"
                value={formData.brokerage}
                onChange={handleChange}
                className={cn(STYLES.input.base, STYLES.input.default)}
                placeholder={STRINGS.profile.brokeragePlaceholder}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className={STYLES.label.default}>
              {STRINGS.profile.bioLabel}
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              className={cn(STYLES.input.base, STYLES.input.default)}
              placeholder={STRINGS.profile.bioPlaceholder}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={STYLES.button.primary}
            >
              {saving ? STRINGS.profile.savingButton : STRINGS.profile.saveButton}
            </button>
          </div>
        </div>
      </form>

      {/* Crop Dialog */}
      {showCropDialog && imageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
          <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className={STYLES.text.h3}>{STRINGS.profile.cropDialog.title}</h2>
              <p className={cn(STYLES.text.small, 'text-gray-600 mt-1')}>
                {STRINGS.profile.cropDialog.description}
              </p>
            </div>

            {/* Crop Area */}
            <div className="relative bg-gray-900 flex-shrink-0" style={{ height: '500px' }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }
                }}
              />
            </div>

            {/* Controls */}
            <div className="p-6 border-t border-gray-200 space-y-4 flex-shrink-0">
              {/* Zoom Slider */}
              <div>
                <label className={cn(STYLES.label.default, 'mb-2 block')}>
                  {STRINGS.profile.cropDialog.zoomLabel}
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className={STYLES.button.secondary}
                >
                  {STRINGS.profile.cropDialog.cancelButton}
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className={STYLES.button.primary}
                >
                  {STRINGS.profile.cropDialog.applyButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
