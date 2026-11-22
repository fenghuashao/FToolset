import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const icons = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  128: 'icon/128.png',
};

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  imports: false,
  manifest: ({ mode }) => ({
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    minimum_chrome_version: '111',
    permissions: ['activeTab', 'storage', 'contextMenus'],
    icons,
    action: {
      default_title: '__MSG_extensionName__',
      default_icon: icons,
    },
    ...(mode === 'production' && {
      content_security_policy: {
        extension_pages: "default-src 'self'; script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' data: blob:; base-uri 'none';",
      },
    }),
  }),
  vite: () => ({
    plugins: [tailwindcss()],
    build: { target: 'chrome111', cssTarget: 'chrome111' },
  }),
});
