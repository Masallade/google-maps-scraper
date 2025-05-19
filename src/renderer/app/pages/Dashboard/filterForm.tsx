import { useState, ChangeEvent } from 'react';
import FilterFormProps from '../../../../interfaces/types/FilterFormProps';
import StartIcon from '../../img/start-icon.png';
import StopIcon from '../../img/stop-icon.svg';
import { submitState } from '../../../../enum';

function FilterForm({
    onSubmit,
    processState,
    onCancel
}: FilterFormProps) {
    const [queryType, setQueryType] = useState<string>('keyword');
    const [queryValue, setQueryValue] = useState<string>(null);
    const [queryValueLocation, setQueryValueLocation] = useState<string>(null);

    const handleQueryTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQueryType(e.target.value);
    }

    const startTask = () => {
        if (queryValue) {
            onSubmit({
                queryType,
                queryValue,
                queryValueLocation
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
      <form id="scrapper-form">
        <p className={`select-none`}>Search mode:</p>
        <div className={`flex gap-3 select-none`}>
            <div className={`flex items-center`}>
                <input type="radio" id="keyword_query_type" name="query_type" value="keyword"
                    checked={queryType === 'keyword'}
                    onChange={handleQueryTypeChange}
                />
                <label htmlFor="keyword_query_type">&nbsp;Search by keyword</label>
            </div>
            <div className={`flex items-center`}>
                <input type="radio" id="keyword_url" name="query_type" value="url"
                    checked={queryType === 'url'}
                    onChange={handleQueryTypeChange}
                />
                <label htmlFor="keyword_url">&nbsp;Search by URL</label>
            </div>
        </div>
        <div className={`mt-2 flex ${queryType === 'keyword' ? 'gap-2' : ''}`}>
            <div className={queryType === 'keyword' ? `w-8/12` : `w-full`}>
                <p className={`select-none`}>{queryType === 'keyword' ? 'Keyword' : 'Google Map URL'}*</p>
                <input type="text" required name="query_value" id="query_value" placeholder="Enter keyword" className={`w-full py-1 px-2 text-dark rounded`}
                    onChange={event => setQueryValue(event.target.value)}
                />
            </div>
            {
                queryType === 'keyword' ? (
                    <div className={`w-4/12`}>
                        <p className={`select-none`}>Location</p>
                        <input type="text" name="query_value_location" id="query_value_location" placeholder="Enter location" className={`w-full py-1 px-2 text-dark rounded`}
                        onChange={event => setQueryValueLocation(event.target.value)}
                    />
                    </div>
                ) : ''
            }
        </div>
        <div className={`flex mt-2 gap-2 select-none`}>
            <div>
                <button className={`bg-green hover:opacity-90 disabled:opacity-50 px-3 py-1 rounded flex items-center justify-center`} type={`button`} onClick={() => startTask()} disabled={processState !== submitState.idle}>
                    <img src={StartIcon} width={7}/>&nbsp;Start
                </button>
            </div>
            <div>
                <button className={`bg-red hover:opacity-90 disabled:opacity-50 px-3 py-1 rounded flex items-center justify-center`} type={`button`} onClick={() => stopTask()} disabled={processState !== submitState.scrapping}>
                    <img src={StopIcon} width={7}/>&nbsp;Stop
                </button>
            </div>
        </div>
      </form>
    )
  }
  
  export default FilterForm;