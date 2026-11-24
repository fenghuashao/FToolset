import { createRoot } from 'react-dom/client';
import { t } from '../../src/shared/i18n';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './style.css';

const isTabView = new URLSearchParams(window.location.search).get('view') === 'tab';
document.documentElement.lang = t('localeCode');
document.documentElement.dataset.view = isTabView ? 'tab' : 'popup';
document.title = t('extensionName');

const root = document.getElementById('root');
if (!root) throw new Error('Missing popup root');

createRoot(root).render(
  <ErrorBoundary>
    <App isTabView={isTabView} />
  </ErrorBoundary>,
);
