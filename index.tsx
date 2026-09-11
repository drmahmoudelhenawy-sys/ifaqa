
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FajrWakeSync from './src/components/FajrWakeSync';
import CompanionCheckInPopup from './src/components/CompanionCheckInPopup';

// A production PWA service worker can keep serving an older build on localhost.
// During development, remove only service workers and Cache Storage entries;
// user data stored in IndexedDB/local storage remains untouched.
if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
  }

  if ('caches' in window) {
    void caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
      .catch(() => undefined);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <><App /><FajrWakeSync /><CompanionCheckInPopup /></>
);
