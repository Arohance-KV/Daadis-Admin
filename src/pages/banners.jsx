// pages/banners.jsx
// Manages the home page promo banner (the strip below the hero on the storefront).
// One banner record of type "home-promo-banner": imageUrl = desktop, bannerElementUrl = mobile.
import React, { useState, useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { bannersAPI } from '../utils/api';

const BANNER_TYPE = 'home-promo-banner';

const inputCls =
  'w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-raised file:px-3 file:py-1.5 file:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';
const labelCls = 'mb-2 block text-sm font-medium text-ink';

const Banners = () => {
  const [banner, setBanner] = useState(null); // existing record, if any
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState('');
  const [mobilePreview, setMobilePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    (async () => {
      try {
        const res = await bannersAPI.getByType(BANNER_TYPE);
        const existing = res.data?.[0] || null;
        setBanner(existing);
        setDesktopPreview(existing?.imageUrl?.url || '');
        setMobilePreview(existing?.bannerElementUrl?.url || '');
      } catch {
        // Fetch failed — treat as first-time setup (no banner yet).
        setBanner(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickDesktop = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDesktopFile(f);
    setDesktopPreview(URL.createObjectURL(f));
  };
  const pickMobile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMobileFile(f);
    setMobilePreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    setStatus(null);
    // Creating for the first time requires the desktop (main) image.
    if (!banner && !desktopFile) {
      setStatus({ type: 'error', text: 'A desktop banner image is required.' });
      return;
    }
    if (!desktopFile && !mobileFile) {
      setStatus({ type: 'error', text: 'Choose a new image to update.' });
      return;
    }

    const fd = new FormData();
    fd.append('bannerName', 'Home Promo Banner');
    fd.append('bannerType', BANNER_TYPE);
    if (desktopFile) fd.append('imageUrl', desktopFile);
    if (mobileFile) fd.append('bannerElementUrl', mobileFile);

    setSaving(true);
    try {
      const res = banner
        ? await bannersAPI.update(banner._id, fd)
        : await bannersAPI.create(fd);
      const saved = res.data || res;
      setBanner(saved);
      setDesktopFile(null);
      setMobileFile(null);
      setDesktopPreview(saved?.imageUrl?.url || desktopPreview);
      setMobilePreview(saved?.bannerElementUrl?.url || mobilePreview);
      setStatus({ type: 'success', text: 'Banner saved. It is now live on the storefront.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Failed to save banner.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Home Promo Banner</h1>
        <p className="mt-1 text-sm text-muted">
          The promotional banner shown below the hero on the storefront home page. Upload a
          desktop and a mobile image; leave a slot empty to keep the current one.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-6 rounded-[14px] border border-border bg-surface p-5">
          {/* Desktop */}
          <div>
            <label className={labelCls}>Desktop image</label>
            <div className="mb-3 flex min-h-[120px] items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-border bg-surface-raised">
              {desktopPreview ? (
                <img src={desktopPreview} alt="Desktop banner preview" className="max-h-[240px] w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-1 py-8 text-muted">
                  <PhotoIcon className="h-8 w-8" />
                  <span className="text-xs">No desktop image</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={pickDesktop} className={inputCls} />
          </div>

          {/* Mobile */}
          <div>
            <label className={labelCls}>Mobile image</label>
            <div className="mb-3 flex min-h-[120px] items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-border bg-surface-raised">
              {mobilePreview ? (
                <img src={mobilePreview} alt="Mobile banner preview" className="max-h-[240px] w-auto max-w-[280px] object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-1 py-8 text-muted">
                  <PhotoIcon className="h-8 w-8" />
                  <span className="text-xs">No mobile image</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={pickMobile} className={inputCls} />
          </div>

          {status && (
            <p className={status.type === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}>
              {status.text}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save banner'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Banners;
