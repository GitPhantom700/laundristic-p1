import React, { useState } from 'react';
import { ToastProvider, Layout, TabId, InstallPrompt } from './components';
import { Wardrobe, DropOffs, Stats } from './screens';

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
