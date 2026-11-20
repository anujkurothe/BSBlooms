import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  type AvailabilityStatus,
  type Flower,
  type FlowerDraft,
  type StoreSettings,
} from '../types/flower.ts';
import {
  validateFlowerDraft,
  validatePasswordChange,
  validateStoreSettings,
} from '../utils/catalog.ts';
import { compressImageFile } from '../utils/imageCompress.ts';
import type { CatalogState } from '../hooks/useFlowerCatalog.ts';

interface AdminPanelProps {
  catalog: CatalogState;
  onBackToStore: () => void;
}

const createEmptyDraft = (nextOrderIndex: number): FlowerDraft => ({
  orderIndex: nextOrderIndex,
  nameEn: '',
  color: '',
  cropEn: 'Gerbera',
  typeEn: 'Standard',
  breederCode: '',
  stemLength: '60 – 65 cm',
  extraSpecEn: '',
  availability: 'in_stock',
  photos: [],
});

export function AdminPanel({ catalog, onBackToStore }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings' | 'security'>('catalog');

  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<FlowerDraft>(() => createEmptyDraft(0));
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [savingFlower, setSavingFlower] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [settingsForm, setSettingsForm] = useState<StoreSettings>(catalog.storeSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    setSettingsForm(catalog.storeSettings);
  }, [catalog.storeSettings]);

  const showToastNotice = (message: string) => {
    setStatusNotice(message);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordInput) {
      setAuthError('Please enter the merchant password.');
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      await catalog.login(passwordInput);
      setPasswordInput('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Incorrect password.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await catalog.logout();
  };

  const openAddForm = () => {
    setDraft(createEmptyDraft(catalog.flowers.length));
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (flower: Flower) => {
    setDraft({
      id: flower.id,
      orderIndex: flower.orderIndex,
      nameEn: flower.nameEn,
      color: flower.color,
      cropEn: flower.cropEn,
      typeEn: flower.typeEn,
      breederCode: flower.breederCode,
      stemLength: flower.stemLength,
      extraSpecEn: flower.extraSpecEn,
      availability: flower.availability,
      photos: [...flower.photos],
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    const remainingSlots = 5 - draft.photos.length;
    if (remainingSlots <= 0) {
      setFormError('Maximum 5 photos allowed per variety.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setProcessingPhotos(true);
    setFormError(null);

    try {
      const compressed = await Promise.all(filesToProcess.map((file) => compressImageFile(file)));
      setDraft((prev) => ({
        ...prev,
        photos: [...prev.photos, ...compressed].slice(0, 5),
      }));
      if (files.length > remainingSlots) {
        setFormError('Maximum 5 photos allowed per variety.');
      }
    } catch {
      setFormError('One of the selected files could not be processed as an image.');
    } finally {
      setProcessingPhotos(false);
    }
  };

  const handleSetPrimaryPhoto = (index: number) => {
    setDraft((prev) => {
      if (index <= 0 || index >= prev.photos.length) return prev;
      const next = [...prev.photos];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      return { ...prev, photos: next };
    });
  };

  const handleRemovePhoto = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmitFlower = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFlowerDraft(draft);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSavingFlower(true);
    setFormError(null);
    try {
      await catalog.saveFlower(draft);
      setFormOpen(false);
      showToastNotice('Saved live');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save changes.');
    } finally {
      setSavingFlower(false);
    }
  };

  const handleConfirmDelete = async (flowerId: string) => {
    try {
      await catalog.removeFlower(flowerId);
      setConfirmDeleteId(null);
      showToastNotice('Variety removed');
    } catch {
      showToastNotice('Could not delete variety');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    try {
      await catalog.reorderFlower(index, direction);
      showToastNotice('Order updated');
    } catch {
      showToastNotice('Could not reorder');
    }
  };

  const handleRestoreDefaults = async () => {
    setSeeding(true);
    try {
      await catalog.seedInitialCatalog();
      showToastNotice('Restored default varieties');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveSettings = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateStoreSettings(settingsForm);
    if (validationError) {
      setSettingsError(validationError);
      return;
    }
    setSavingSettings(true);
    setSettingsError(null);
    try {
      await catalog.saveStoreSettings(settingsForm);
      showToastNotice('Contact settings saved');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setSavingPassword(true);
    try {
      await catalog.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Admin password updated successfully.');
      showToastNotice('Password updated');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!catalog.authReady) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  if (!catalog.isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="w-11 h-11 rounded-xl bg-[#637F04]/10 text-[#4F6603] flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">
            BSBlooms Admin
          </h1>
          <p className="text-sm text-zinc-600 leading-relaxed mt-2 mb-6">
            Enter your merchant password to manage flower varieties, display order, photos, and contact settings.
          </p>

          {authError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-login-password" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Merchant Password
              </label>
              <div className="relative">
                <input
                  id="admin-login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-3.5 pr-11 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="submit"
                disabled={signingIn}
                className="w-full min-h-[44px] px-5 py-2.5 bg-[#637F04] hover:bg-[#516803] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {signingIn ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={onBackToStore}
                className="w-full min-h-[44px] px-5 py-2.5 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium border border-zinc-200 rounded-lg transition-colors"
              >
                View Live Site
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-200/80">
          <div>
            <p className="text-xs text-[#4F6603] font-medium mb-1">
              Merchant Catalog
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900">
              BSBlooms Admin
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Changes reflect automatically on the public swipe showcase.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {statusNotice && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4F6603] mr-1"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{statusNotice}</span>
              </span>
            )}

            <button
              type="button"
              onClick={onBackToStore}
              className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              View Live Site
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tabs + Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
          <div
            role="tablist"
            aria-label="BSBlooms Admin Sections"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFEFE9] rounded-lg self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'catalog'}
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Varieties &amp; Order
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Contact Settings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Password &amp; Security
            </button>
          </div>

          {activeTab === 'catalog' && (
            <div className="flex flex-wrap items-center gap-2.5">
              {catalog.flowers.length === 0 && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  disabled={seeding}
                  className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-medium border border-zinc-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4 text-[#637F04]" aria-hidden="true" />
                  <span>{seeding ? 'Loading...' : 'Restore Default Varieties'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2.5 bg-[#637F04] hover:bg-[#516803] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Variety</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Varieties & Order */}
        {activeTab === 'catalog' && (
          <section>
            {catalog.flowers.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
                <h2 className="font-display text-2xl font-semibold text-zinc-900">
                  No varieties in catalog
                </h2>
                <p className="text-sm text-zinc-600 mt-2 max-w-md mx-auto">
                  Restore the 8 curated BSBlooms varieties or add a new variety to publish it live.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    disabled={seeding}
                    className="min-h-[44px] px-5 py-2.5 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-medium border border-zinc-200 rounded-lg transition-colors"
                  >
                    {seeding ? 'Loading...' : 'Restore Default Varieties'}
                  </button>
                  <button
                    type="button"
                    onClick={openAddForm}
                    className="min-h-[44px] px-5 py-2.5 bg-[#637F04] hover:bg-[#516803] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Add Variety
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500 bg-[#FAFAF8]">
                        <th className="py-3.5 px-4">Order</th>
                        <th className="py-3.5 px-4">Variety</th>
                        <th className="py-3.5 px-4">Specifications</th>
                        <th className="py-3.5 px-4">Availability</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {catalog.flowers.map((flower, idx) => {
                        const isConfirming = confirmDeleteId === flower.id;

                        return (
                          <tr key={flower.id} className="hover:bg-[#FAFAF8]/70 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <span className="w-5 text-xs text-zinc-500 tabular-nums">
                                  {idx + 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMove(idx, 'up')}
                                  aria-label={`Move up ${flower.nameEn}`}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-zinc-200 text-zinc-600 hover:text-zinc-900 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === catalog.flowers.length - 1}
                                  onClick={() => handleMove(idx, 'down')}
                                  aria-label={`Move down ${flower.nameEn}`}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-zinc-200 text-zinc-600 hover:text-zinc-900 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {flower.photos[0] && (
                                  <img
                                    src={flower.photos[0]}
                                    alt={flower.nameEn}
                                    referrerPolicy="no-referrer"
                                    className="w-11 h-11 rounded-lg object-contain bg-white border border-zinc-100 shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-zinc-900 truncate">
                                    {flower.nameEn}
                                  </p>
                                  {flower.color && (
                                    <p className="text-xs text-zinc-500 truncate">{flower.color}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-zinc-600">
                              {[flower.cropEn, flower.typeEn, flower.breederCode, flower.stemLength]
                                .filter(Boolean)
                                .join(' · ')}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={
                                  flower.availability === 'in_stock'
                                    ? 'text-[#4F6603] font-medium'
                                    : flower.availability === 'limited'
                                      ? 'text-amber-700 font-medium'
                                      : 'text-zinc-500'
                                }
                              >
                                {AVAILABILITY_LABELS[flower.availability]}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {isConfirming ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDelete(flower.id)}
                                    className="px-3 py-1.5 text-xs font-medium bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(flower)}
                                    aria-label={`Edit ${flower.nameEn}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(flower.id)}
                                    aria-label={`Delete ${flower.nameEn}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-zinc-200 rounded-md hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Contact Settings */}
        {activeTab === 'settings' && (
          <section className="max-w-2xl bg-white border border-zinc-200 rounded-xl p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-zinc-900">
              Contact &amp; Shop Settings
            </h2>
            <p className="text-sm text-zinc-600 mt-1 mb-6">
              Phone and WhatsApp numbers used on Call Now and WhatsApp Inquiry buttons on the final screen.
            </p>

            {settingsError && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {settingsError}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label htmlFor="shop-name-en" className="block text-xs font-medium text-zinc-700 mb-1">
                  Brand Name
                </label>
                <input
                  id="shop-name-en"
                  type="text"
                  required
                  value={settingsForm.shopNameEn}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, shopNameEn: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shop-phone" className="block text-xs font-medium text-zinc-700 mb-1">
                    Phone Number (Call Now)
                  </label>
                  <input
                    id="shop-phone"
                    type="tel"
                    required
                    value={settingsForm.phone}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg tabular-nums focus:outline-none focus:border-[#637F04]"
                  />
                </div>
                <div>
                  <label htmlFor="shop-whatsapp" className="block text-xs font-medium text-zinc-700 mb-1">
                    WhatsApp Number (digits with country code)
                  </label>
                  <input
                    id="shop-whatsapp"
                    type="text"
                    required
                    value={settingsForm.whatsapp}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        whatsapp: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg tabular-nums focus:outline-none focus:border-[#637F04]"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Example: 919876543210 (no + or spaces)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shop-loc-en" className="block text-xs font-medium text-zinc-700 mb-1">
                    Dispatch / Location
                  </label>
                  <input
                    id="shop-loc-en"
                    type="text"
                    value={settingsForm.locationEn}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, locationEn: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                  />
                </div>
                <div>
                  <label htmlFor="shop-hours-en" className="block text-xs font-medium text-zinc-700 mb-1">
                    Business Hours
                  </label>
                  <input
                    id="shop-hours-en"
                    type="text"
                    value={settingsForm.hoursEn}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, hoursEn: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="min-h-[44px] px-6 py-2.5 bg-[#637F04] hover:bg-[#516803] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Tab 3: Password & Security */}
        {activeTab === 'security' && (
          <section className="max-w-lg bg-white border border-zinc-200 rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-2">
              <KeyRound className="w-5 h-5 text-[#637F04]" aria-hidden="true" />
              <h2 className="font-display text-2xl font-semibold text-zinc-900">
                Change Admin Password
              </h2>
            </div>
            <p className="text-sm text-zinc-600 mb-6">
              Update the password used to sign in to the BSBlooms merchant dashboard.
            </p>

            {passwordError && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                role="status"
                className="mb-5 p-3 rounded-lg bg-[#F7FAEE] border border-[#637F04]/30 text-xs font-medium text-[#3F5202]"
              >
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-xs font-medium text-zinc-700 mb-1">
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs font-medium text-zinc-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-medium text-zinc-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="min-h-[44px] px-6 py-2.5 bg-[#637F04] hover:bg-[#516803] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Add / Edit Variety Modal */}
        {formOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 backdrop-blur-[2px]"
            onClick={() => setFormOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="variety-form-title"
          >
            <div
              className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-[#FAFAF8] rounded-2xl border border-zinc-200 shadow-2xl p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 mb-6">
                <h2 id="variety-form-title" className="font-display text-2xl font-semibold text-zinc-900">
                  {draft.id ? 'Edit Flower Variety' : 'Add Flower Variety'}
                </h2>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Cancel"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitFlower} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="flower-name-en" className="block text-xs font-medium text-zinc-700 mb-1">
                      Variety Name
                    </label>
                    <input
                      id="flower-name-en"
                      type="text"
                      required
                      value={draft.nameEn}
                      onChange={(e) => setDraft((prev) => ({ ...prev, nameEn: e.target.value }))}
                      placeholder="e.g. Shimmer"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    />
                  </div>
                  <div>
                    <label htmlFor="flower-color" className="block text-xs font-medium text-zinc-700 mb-1">
                      Color
                    </label>
                    <input
                      id="flower-color"
                      type="text"
                      value={draft.color}
                      onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))}
                      placeholder="e.g. White-Pink, Red, Yellow"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="flower-crop-en" className="block text-xs font-medium text-zinc-700 mb-1">
                      Crop
                    </label>
                    <input
                      id="flower-crop-en"
                      type="text"
                      value={draft.cropEn}
                      onChange={(e) => setDraft((prev) => ({ ...prev, cropEn: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    />
                  </div>
                  <div>
                    <label htmlFor="flower-type-en" className="block text-xs font-medium text-zinc-700 mb-1">
                      Type
                    </label>
                    <input
                      id="flower-type-en"
                      type="text"
                      value={draft.typeEn}
                      onChange={(e) => setDraft((prev) => ({ ...prev, typeEn: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    />
                  </div>
                  <div>
                    <label htmlFor="flower-availability" className="block text-xs font-medium text-zinc-700 mb-1">
                      Availability
                    </label>
                    <select
                      id="flower-availability"
                      value={draft.availability}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          availability: e.target.value as AvailabilityStatus,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    >
                      {AVAILABILITY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {AVAILABILITY_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="flower-breeder" className="block text-xs font-medium text-zinc-700 mb-1">
                      Breeder&apos;s Code / VBN
                    </label>
                    <input
                      id="flower-breeder"
                      type="text"
                      value={draft.breederCode}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, breederCode: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    />
                  </div>
                  <div>
                    <label htmlFor="flower-stem" className="block text-xs font-medium text-zinc-700 mb-1">
                      Stem Length
                    </label>
                    <input
                      id="flower-stem"
                      type="text"
                      value={draft.stemLength}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, stemLength: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="flower-spec-en" className="block text-xs font-medium text-zinc-700 mb-1">
                    Cultivar Details (Diameter, Vase Life, Center Trait)
                  </label>
                  <input
                    id="flower-spec-en"
                    type="text"
                    value={draft.extraSpecEn}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, extraSpecEn: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                  />
                </div>

                {/* Multi-Photo Upload */}
                <div>
                  <label htmlFor="flower-photos-input" className="block text-xs font-medium text-zinc-700 mb-1">
                    Flower Photos (1 to 5)
                  </label>
                  <p className="text-xs text-zinc-500 mb-3">
                    Upload one or more photos. Optimized automatically.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    {draft.photos.map((photoUrl, idx) => (
                      <div
                        key={`draft-photo-${idx}`}
                        className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 bg-white"
                      >
                        <img
                          src={photoUrl}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                        {idx === 0 ? (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-zinc-900/80 text-white rounded">
                            Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPhoto(idx)}
                            aria-label={`Set photo ${idx + 1} as cover`}
                            className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-white/95 text-zinc-800 rounded hover:bg-white border border-zinc-200"
                          >
                            Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          aria-label={`Remove photo ${idx + 1}`}
                          className="absolute top-1 right-1 w-6 h-6 inline-flex items-center justify-center rounded bg-zinc-900/75 text-white hover:bg-red-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}

                    {draft.photos.length < 5 && (
                      <label className="w-28 h-24 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 bg-white hover:border-[#637F04] text-xs font-medium text-zinc-700 cursor-pointer transition-colors px-2 text-center">
                        <ImagePlus className="w-4 h-4 text-[#637F04]" aria-hidden="true" />
                        <span>{processingPhotos ? 'Optimizing...' : 'Upload Photos'}</span>
                        <input
                          id="flower-photos-input"
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={processingPhotos}
                          onChange={handlePhotoUpload}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200/80">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFlower || processingPhotos}
                    className="min-h-[44px] px-6 py-2.5 text-sm font-medium text-white bg-[#637F04] hover:bg-[#516803] disabled:opacity-60 rounded-lg transition-colors"
                  >
                    {savingFlower ? 'Saving...' : 'Save Variety'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
