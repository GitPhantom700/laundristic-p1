import React, { useState, useEffect } from 'react';
import {
  ToastProvider,
  Layout,
  TabId,
  InstallPrompt,
  WelcomeScreen,
} from './components';
import { Wardrobe, DropOffs, Stats, Settings } from './screens';
import { getSetting } from './lib';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('wardrobe');
  // null = still reading the flag from IndexedDB; false = show welcome; true = show app.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getSetting('onboarded')
      .then((v) => setOnboarded(v === 1))
      // Fail open: never trap the user behind a storage error.
      .catch(() => setOnboarded(true));
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'wardrobe':
        return <Wardrobe />;
      case 'dropoffs':
        return <DropOffs />;
      case 'stats':
        return <Stats />;
      case 'settings':
        return <Settings />;
      default:
        return <Wardrobe />;
    }
  };

  return (
    <ToastProvider>
      {onboarded === null ? null : onboarded ? (
        <>
          <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderScreen()}
          </Layout>
          <InstallPrompt />
        </>
      ) : (
        <WelcomeScreen onDone={() => setOnboarded(true)} />
      )}
    </ToastProvider>
  );
}

export default App;
