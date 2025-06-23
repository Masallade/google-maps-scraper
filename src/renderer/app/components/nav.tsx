// @ts-ignore - image imports
import LogoBopi from '../img/logo-bopi.png';
// @ts-ignore - image imports
import SiBopi from '../img/si-bopi.png';
// @ts-ignore - image imports
import TutorialIcon from '../img/tutorial-icon.png';
// @ts-ignore - image imports
import SupportIcon from '../img/support-icon.png';
import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    api: {
      openDefaultBrowser: (args: { url: string }) => void;
      showErrorAlert: (args: { title: string; content: string }) => void;
      openConfirmDialog: (args: { title: string }) => Promise<boolean>;
      // Add other API methods as needed
    }
  }
}

const openBrowser = (url: string) => {
  window.api.openDefaultBrowser({
    url
  });
}

function Nav() {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const settingsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Check if we have a saved token in localStorage
    const savedToken = localStorage.getItem('whatsapp_api_token');
    if (savedToken) {
      setApiKey(savedToken);
    }
    
    // Close settings when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  }
  
  const saveApiKey = () => {
    // Save API key to localStorage
    localStorage.setItem('whatsapp_api_token', apiKey);
    window.api.showErrorAlert({
      title: "API Key Saved",
      content: "Your WhatsApp API key has been saved. Restart the application for changes to take effect."
    });
    toggleSettings();
  }
  
  return (
    <header className="bg-white shadow-md py-4 px-6 select-none relative z-50">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo and App Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <img className="h-10 w-auto transition-transform hover:scale-105" src={LogoBopi} alt="Logo" />
            <img className="h-8 w-auto ml-2 transition-transform hover:scale-105" src={SiBopi} alt="Secondary Logo" />
          </div>
          <div>
            <h1 className="text-dark text-xl font-bold leading-tight tracking-tight">Google Maps Scraper</h1>
            <p className="text-gray-500 text-xs font-medium">Version 1.0 | Business Intelligence Tool</p>
          </div>
        </div>
        
        {/* Navigation Actions */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => openBrowser('https://botpintar.com/tutorial')} 
            className="flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium px-3 py-2 rounded-lg transition-all group"
          >
            <img width={16} className="mr-2 group-hover:scale-110 transition-transform" src={TutorialIcon} alt="Tutorial" />
            Tutorial
          </button>
          
          <button 
            onClick={() => openBrowser('https://botpintar.com/report')} 
            className="flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 font-medium px-3 py-2 rounded-lg transition-all group"
          >
            <img width={16} className="mr-2 group-hover:scale-110 transition-transform" src={SupportIcon} alt="Support" />
            Support
          </button>
          
          <button 
            onClick={toggleSettings} 
            className="flex items-center justify-center bg-primary text-white hover:bg-blue-600 font-medium px-3 py-2 rounded-lg transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>
      
      {/* Settings Dialog */}
      {showSettings && (
        <div 
          ref={settingsRef}
          className="absolute top-full right-6 mt-4 bg-white p-6 rounded-xl shadow-2xl z-50 border border-gray-200 w-96 transform transition-all origin-top-right"
        >
          <h3 className="text-lg font-bold text-dark mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            WhatsApp API Integration
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Configure WhatsApp Business API for accurate number verification.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <input 
              type="text" 
              value={apiKey || "XTDoYL5rFV7LmneziMEZE3TsWcr31PnVsQXMsoJgedf1ebda"} 
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
            />
            <p className="text-xs text-gray-400 mt-2">
              This key will be used for WhatsApp number verification and analysis.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={toggleSettings} 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={saveApiKey} 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Nav