import { useEffect } from 'react';
import FilterForm from './filterForm';
import ResultTable from './resultTable';
import OnSubmitReturnForm from '../../../../interfaces/types/OnSubmitReturnForm';
import { useState } from 'react';
import { submitState } from '../../../../enum';
import Place from '../../../../interfaces/types/Place';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    api: {
      startGoogleMapScrappingTask: (form: any) => void;
      stopGoogleMapScrappingTask: () => void;
      receiveGoogleMapScrappingTaskState: (callback: (value: any[]) => void) => void;
      receiveGoogleMapScrappingResult: (callback: (value: any[]) => void) => void;
      removeGoogleMapScrappingTaskState: () => void;
      removeGoogleMapScrappingResultEvent: () => void;
      showNotification: (title: string, message: string) => void;
      showSaveXlsxDialog: (places: Place[], queryText: string) => Promise<any>;
      showErrorAlert: (args: { title: string; content: string }) => void;
      openConfirmDialog: (args: { title: string }) => Promise<boolean>;
      openDefaultBrowser: (args: { url: string }) => void;
    }
  }
}

// Suppress TypeScript errors for api
// @ts-ignore
const api = window.api;

function DashboardPage() {
  let [processState, setProcessState] = useState<submitState>(submitState.idle);
  let [queryText, setQueryText] = useState<string>(null);
  let [places, setPlaces] = useState<Place[]>([]);

  // Initialize with default API token if not already set
  useEffect(() => {
    // Check if WhatsApp API token is already stored
    if (!localStorage.getItem('whatsapp_api_token')) {
      // If not, initialize with default token
      localStorage.setItem('whatsapp_api_token', 'XTDoYL5rFV7LmneziMEZE3TsWcr31PnVsQXMsoJgedf1ebda');
      console.log('Initialized WhatsApp API token with default value');
    }
  }, []);

  const onSubmit = (form: OnSubmitReturnForm) => {
    setProcessState(submitState.submitting);
    setQueryText(form.queryValue + (form.queryValueLocation? ' di ' + form.queryValueLocation : ''))
    // @ts-ignore
    window.api.startGoogleMapScrappingTask(form);
  }

  const onCancel = () => {
    setProcessState(submitState.submitting);
    // @ts-ignore
    window.api.stopGoogleMapScrappingTask();
    // setProcessState(submitState.idle)
  }

  const handleMainEvent = () => {
    // @ts-ignore
    window.api.receiveGoogleMapScrappingTaskState((value: any[]) => {
      setProcessState(value[0])
    });
    // @ts-ignore
    window.api.receiveGoogleMapScrappingResult((value: any[]) => {
      // console.log(value ? value[0] : null)
      if (value) {
        addNewPlace(value[0])
      }
    });
  }

  const removeMainEvent = () => {
    // @ts-ignore
    window.api.removeGoogleMapScrappingTaskState();
    // @ts-ignore
    window.api.removeGoogleMapScrappingResultEvent();
  }

  const addNewPlace = (place: Place) => {
    setPlaces(current => [...current, place]);
  }

  const clearPlaces = () => {
    setPlaces([]);
  }

  const doExport = async (places: Place[], customQueryText?: string) => {
    try {
      // Use custom query text if provided, otherwise use the stored one
      const exportQueryText = customQueryText || queryText || 'export';
      // @ts-ignore
      window.api.showNotification('Export File', 'Processing export file...');
      // @ts-ignore
      const response = await window.api.showSaveXlsxDialog(places, exportQueryText);
      if (!response.canceled) {
        // @ts-ignore
        window.api.showNotification('Export File', 'File successfully saved as xlsx');
      }
    } catch (e) {
      // @ts-ignore
      window.api.showErrorAlert({
        title: 'Error!',
        content: 'Failed to save file'
      });
      console.error(e)
    }
  }

  useEffect(() => {
    handleMainEvent();
    return () => {
      removeMainEvent();
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 h-full flex flex-col">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-dark mb-4">Search Configuration</h2>
      <FilterForm onSubmit={onSubmit} processState={processState} onCancel={onCancel}/>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 flex-1 min-h-0 flex flex-col">
        <h2 className="text-lg font-bold text-dark mb-4">Search Results</h2>
        <ResultTable places={places} onClear={clearPlaces} onExport={doExport}/>
      </div>
    </div>
  )
}

export default DashboardPage;