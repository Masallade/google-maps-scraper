import { useState, ChangeEvent } from 'react';
import FilterFormProps from '../../../../interfaces/types/FilterFormProps';
// @ts-ignore - image imports
import StartIcon from '../../img/start-icon.png';
// @ts-ignore - image imports
import StopIcon from '../../img/stop-icon.svg';
import { submitState } from '../../../../enum';

// Extend Window interface to include our API
declare global {
  interface Window {
    api: {
      showErrorAlert: (args: { title: string; content: string }) => void;
      openConfirmDialog: (args: { title: string }) => Promise<boolean>;
    };
  }
}

function FilterForm({
    onSubmit,
    processState,
    onCancel
}: FilterFormProps) {
    const [queryType, setQueryType] = useState<string>('keyword');
    const [queryValue, setQueryValue] = useState<string>(null);
    const [queryValueLocation, setQueryValueLocation] = useState<string>(null);
    
    // New location fields
    const [country, setCountry] = useState<string>(null);
    const [city, setCity] = useState<string>(null);
    
    // New filter fields
    const [minRating, setMinRating] = useState<string>(null);
    const [maxRating, setMaxRating] = useState<string>(null);
    const [maxReviews, setMaxReviews] = useState<string>(null);
    const [excludeVerified, setExcludeVerified] = useState<boolean>(false);
    const [checkWhatsApp, setCheckWhatsApp] = useState<boolean>(false);
    const [detectChatbot, setDetectChatbot] = useState<boolean>(false);
    const [strictWhatsAppMode, setStrictWhatsAppMode] = useState<boolean>(true);
    
    // Show advanced filters toggle
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

    const handleQueryTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQueryType(e.target.value);
    }

    const startTask = () => {
        if (queryValue) {
            onSubmit({
                queryType,
                queryValue,
                queryValueLocation,
                // New fields
                country,
                city,
                minRating,
                maxRating,
                maxReviews,
                excludeVerified,
                checkWhatsApp,
                detectChatbot,
                strictWhatsAppMode
            });
        } else {
            window.api.showErrorAlert({
                title: 'Complete the Form!',
                content: `${queryType === 'keyword' ? 'Keyword' : 'Google Map URL'} is required`,
            });
        }
    }

    const stopTask = async () => {
        try {
            const response: boolean = await window.api.openConfirmDialog({
                title: 'Are you sure you want to stop the scraping process?'
            });
            if (response) {
                onCancel()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
      <form id="scrapper-form" className="space-y-4">
        <p className="font-medium">Search mode:</p>
        <div className="flex gap-6 select-none mb-4">
          <div className="flex items-center">
            <input 
              type="radio" 
              id="keyword_query_type" 
              name="query_type" 
              value="keyword"
                    checked={queryType === 'keyword'}
                    onChange={handleQueryTypeChange}
              className="mr-2"
                />
            <label htmlFor="keyword_query_type" className="cursor-pointer">Search by keyword</label>
            </div>
          <div className="flex items-center">
            <input 
              type="radio" 
              id="keyword_url" 
              name="query_type" 
              value="url"
                    checked={queryType === 'url'}
                    onChange={handleQueryTypeChange}
              className="mr-2"
                />
            <label htmlFor="keyword_url" className="cursor-pointer">Search by URL</label>
            </div>
        </div>
        
        {queryType === 'keyword' && (
          <div className="mb-4">
            <div className="flex gap-4 mb-4">
              <div className="w-8/12">
                <label className="block mb-2 font-medium">Keyword*</label>
                <input 
                  type="text" 
                  required 
                  name="query_value" 
                  id="query_value" 
                  placeholder="Enter keyword" 
                  className="w-full py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    onChange={event => setQueryValue(event.target.value)}
                />
            </div>
              <div className="w-4/12">
                <label className="block mb-2 font-medium">Location</label>
                <input 
                  type="text" 
                  name="query_value_location" 
                  id="query_value_location" 
                  placeholder="Enter location" 
                  className="w-full py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        onChange={event => setQueryValueLocation(event.target.value)}
                    />
                    </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block mb-2 font-medium">Country</label>
                <input 
                  type="text" 
                  name="country" 
                  id="country" 
                  placeholder="Enter country" 
                  className="w-full py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  onChange={event => setCountry(event.target.value)}
                />
              </div>
              <div className="w-1/2">
                <label className="block mb-2 font-medium">City</label>
                <input 
                  type="text" 
                  name="city" 
                  id="city" 
                  placeholder="Enter city" 
                  className="w-full py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  onChange={event => setCity(event.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        
        {queryType === 'url' && (
          <div className="mb-4">
            <label className="block mb-2 font-medium">Google Map URL*</label>
            <input 
              type="text" 
              required 
              name="query_value" 
              id="query_value" 
              placeholder="Enter Google Maps URL" 
              className="w-full py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
              onChange={event => setQueryValue(event.target.value)}
            />
          </div>
        )}
        
        <div 
          className="cursor-pointer select-none mb-3 font-semibold text-primary flex items-center" 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <span className="mr-2">{showAdvancedFilters ? '▼' : '►'}</span>
          Advanced Filters
        </div>
        
        {showAdvancedFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">Rating Range</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    step="0.1" 
                    placeholder="Min" 
                    className="w-1/2 py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    onChange={event => setMinRating(event.target.value)}
                  />
                  <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    step="0.1" 
                    placeholder="Max" 
                    className="w-1/2 py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    onChange={event => setMaxRating(event.target.value)}
                  />
                </div>
              </div>
              
            <div>
                <label className="block mb-2 font-medium">Max Reviews</label>
                <input 
                  type="number" 
                  min="0" 
                  placeholder="Maximum reviews" 
                  className="w-full py-2 px-3 text-dark rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  onChange={event => setMaxReviews(event.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="exclude_verified" 
                  onChange={event => setExcludeVerified(event.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="exclude_verified" className="cursor-pointer">Exclude Google Verified businesses</label>
              </div>
            
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="whatsapp_check" 
                  onChange={event => setCheckWhatsApp(event.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="whatsapp_check" className="cursor-pointer">Check for WhatsApp presence</label>
              </div>
            
              {checkWhatsApp && (
                <div className="ml-6 mt-2">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="strict_whatsapp_mode" 
                      checked={strictWhatsAppMode}
                      onChange={event => setStrictWhatsAppMode(event.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="strict_whatsapp_mode" className="cursor-pointer">Strict WhatsApp detection (no false positives)</label>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-6">
                    When enabled, only businesses confirmed to have WhatsApp will be marked. 
                    When disabled, more businesses will be flagged but with potential false positives.
                  </div>
                </div>
              )}
            
              <div className={`${checkWhatsApp ? '' : 'opacity-50'}`}>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="chatbot_check" 
                    disabled={!checkWhatsApp}
                    onChange={event => setDetectChatbot(event.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="chatbot_check" className="cursor-pointer">Detect WhatsApp chatbots</label>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex mt-6 gap-2">
          <button 
            className="bg-green hover:bg-opacity-80 transition-all px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center" 
            type="button" 
            onClick={() => startTask()} 
            disabled={processState !== submitState.idle}
          >
            <img src={StartIcon} width={12} className="mr-2"/> Start
          </button>
          <button 
            className="bg-red hover:bg-opacity-80 transition-all px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center"
            type="button" 
            onClick={() => stopTask()} 
            disabled={processState !== submitState.scrapping}
          >
            <img src={StopIcon} width={12} className="mr-2"/> Stop
          </button>
        </div>
      </form>
    )
  }
  
  export default FilterForm;