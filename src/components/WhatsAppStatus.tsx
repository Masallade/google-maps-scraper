import React from 'react';

interface WhatsAppStatusProps {
  hasWhatsApp: boolean;
  isChatbot?: boolean;
  phone: string;
  onClick?: () => void;
}

/**
 * WhatsApp status indicator component
 * Shows whether a business has WhatsApp and provides click functionality
 */
const WhatsAppStatus: React.FC<WhatsAppStatusProps> = ({ 
  hasWhatsApp, 
  isChatbot = false, 
  phone,
  onClick 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      // Open WhatsApp web by default when clicked
      const url = `https://web.whatsapp.com/send?phone=${phone.replace('+', '')}`;
      window.open(url, '_blank');
    }
  };

  if (!hasWhatsApp) {
    return (
      <div 
        className="flex items-center justify-center text-gray-400" 
        title="No WhatsApp available"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-center text-green-500 cursor-pointer hover:text-green-600"
      title="Open in WhatsApp"
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.72.045.419-.1.823zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
      </svg>
      {isChatbot && (
        <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-2">Bot</span>
      )}
    </div>
  );
};

export default WhatsAppStatus; 