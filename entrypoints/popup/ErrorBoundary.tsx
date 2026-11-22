import { Component, type ReactNode } from 'react';
import { Icon } from '../../src/shared/Icon';
import { t } from '../../src/shared/i18n';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="m-4 grid justify-items-center gap-3 rounded-lg border border-line bg-surface p-5 text-center">
        <Icon name="alert" size={22} />
        <p role="alert">{t('toolError')}</p>
        <button className="button button-primary" type="button" onClick={() => window.location.reload()}>
          {t('reload')}
        </button>
      </div>
    );
  }
}
