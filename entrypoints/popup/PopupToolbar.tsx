import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../src/shared/Icon';
import { t } from '../../src/shared/i18n';

const projectUrl = 'https://github.com/fenghuashao/FToolset';
const webStoreUpdateUrl = 'https://clients2.google.com/service/update2/crx';

async function getStoreUrl(): Promise<string | null> {
  const { id, installType, updateUrl } = await chrome.management.getSelf();
  // An unpacked extension's local ID may have no corresponding store listing.
  if (installType === 'development' || updateUrl !== webStoreUpdateUrl || !/^[a-p]{32}$/.test(id)) {
    return null;
  }
  return `https://chromewebstore.google.com/detail/${id}`;
}

export function PopupToolbar({
  children,
  searchBar,
}: {
  children: ReactNode;
  searchBar?: ReactNode;
}) {
  // Wait for Chrome to identify the installation before choosing a link to copy.
  const [storeUrl, setStoreUrl] = useState<string | null | undefined>(undefined);
  const [shareStatus, setShareStatus] = useState<'copied' | 'manual'>();
  const copying = useRef(false);
  const shareUrl = storeUrl ?? projectUrl;
  const isSearchMode = searchBar !== undefined && searchBar !== null && searchBar !== false;

  useEffect(() => {
    let mounted = true;
    void getStoreUrl().catch(() => null).then((url) => {
      if (mounted) setStoreUrl(url);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isSearchMode) setShareStatus(undefined);
  }, [isSearchMode]);

  async function shareExtension() {
    if (copying.current) return;
    copying.current = true;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
    } catch {
      setShareStatus('manual');
    } finally {
      copying.current = false;
    }
  }

  return (
    <>
      {isSearchMode ? (
        <div className="flex items-center gap-2 px-4 py-2.5">
          <img alt="" className="shrink-0" width="28" height="28" src="/icon/32.png" />
          {searchBar}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
          <div className="mr-auto flex items-center gap-2.5">
            <img alt="" className="shrink-0" width="28" height="28" src="/icon/32.png" />
            <span className="text-base font-bold tracking-tight">{t('extensionName')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {storeUrl && (
              <a
                aria-label={t('rateExtension')}
                className="button button-plain"
                href={`${storeUrl}/reviews`}
                rel="noopener noreferrer"
                target="_blank"
                title={t('rateExtension')}
              >
                <Icon name="star" size={15} />
                {t('rateExtensionShort')}
              </a>
            )}
            <button
              aria-label={t('shareExtension')}
              className="button button-plain"
              disabled={storeUrl === undefined}
              onClick={() => void shareExtension()}
              title={t('shareExtension')}
              type="button"
            >
              <Icon name="share" size={15} />
              {t('shareExtensionShort')}
            </button>
            {children}
          </div>
        </div>
      )}
      <div className={shareStatus ? 'px-4 pb-2.5' : undefined}>
        <p className="text-right text-xs text-muted" role="status">
          {shareStatus === 'copied' && t('shareLinkCopied')}
          {shareStatus === 'manual' && t('shareLinkManual')}
        </p>
        {shareStatus === 'manual' && (
          <input
            aria-label={t('shareLink')}
            autoFocus
            className="field mt-1"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            type="url"
            value={shareUrl}
          />
        )}
      </div>
    </>
  );
}
