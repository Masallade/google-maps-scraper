import { useState, useEffect } from 'react';
import Nav from './components/nav';
import DashboardPage from './pages/Dashboard';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-2xl">
          <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-dark mb-2">Google Maps Scraper</h2>
          <p className="text-gray-500">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Nav />
      <div id="content" className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="container mx-auto px-4 py-6">
          <DashboardPage />
        </div>
      </div>
      <footer className="py-4 px-6 text-center text-sm text-gray-600 bg-white border-t border-gray-200">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} Google Maps Scraper | Powered by BotPintar
        </div>
      </footer>
    </div>
  );
}

export default App