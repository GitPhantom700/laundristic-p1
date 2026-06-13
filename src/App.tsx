import React, { useState } from 'react';
import { ToastProvider, Layout, TabId, InstallPrompt } from './components';
import { Wardrobe, DropOffs, Stats, Settings } from './screens';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('wardrobe');

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
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderScreen()}
      </Layout>
      <InstallPrompt />
    </ToastProvider>
  );
}

export default App;
