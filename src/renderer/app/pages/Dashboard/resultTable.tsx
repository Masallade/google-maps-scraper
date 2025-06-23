import ResultTableProps from '../../../../interfaces/types/ResultTableProps';
// @ts-ignore - image imports
import AeroplaneIcon from '../../img/aeroplane-icon.png';
import Place from '../../../../interfaces/types/Place';
import { useState, useEffect } from 'react';
import { FaWhatsapp, FaCheckCircle, FaRobot, FaGlobe, FaTimesCircle } from 'react-icons/fa';

// Extended place type to include filter match status
interface PlaceWithFilter extends Place {
  matchesFilters?: boolean;
}

function ResultTable({
  places,
  onClear,
  onExport
}: ResultTableProps) {
  // Track filter stats
  const [showOnlyMatching, setShowOnlyMatching] = useState<boolean>(false);
  const [filterStats, setFilterStats] = useState({ total: 0, matching: 0 });
  
  // Update stats whenever places changes
  useEffect(() => {
    const total = places.length;
    // Count places that explicitly match filters or don't have the property (for backward compatibility)
    const matching = places.filter(p => (p as PlaceWithFilter).matchesFilters !== false).length;
    setFilterStats({ total, matching });
  }, [places]);

  const doExport = (places: Place[]) => {
    const inputElement = document.getElementById('query_value') as HTMLInputElement;
    const searchQuery = inputElement?.value || 'export';
    const placesToExport = showOnlyMatching 
      ? places.filter(p => (p as PlaceWithFilter).matchesFilters !== false)
      : places;
    onExport(placesToExport, searchQuery);
  }

  const displayPlaces = showOnlyMatching 
    ? places.filter(p => (p as PlaceWithFilter).matchesFilters !== false) 
    : places;

  const renderRating = (rating: string) => {
    const numRating = parseFloat(rating);
    let colorClass = 'text-red-600';
    if (numRating >= 4.0) colorClass = 'text-green-600';
    else if (numRating >= 3.0) colorClass = 'text-yellow-600';
    return <span className={`font-bold ${colorClass}`}>{rating}</span>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 mt-2">
      {/* Results Header */}
      <div className="w-full flex flex-col md:flex-row justify-between mb-4 items-center bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-xl border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="text-base">
            <span className="font-semibold text-blue-700">Found</span> 
            <span className="mx-2 bg-blue-200 px-3 py-1 rounded-full text-blue-800 font-bold">
              {filterStats.total}
            </span> 
            <span className="text-gray-600">businesses</span>
            {filterStats.total > 0 && filterStats.matching !== filterStats.total && (
              <span className="ml-3">
                <span className="font-semibold text-green-700">Matching</span>
                <span className="mx-2 bg-green-200 px-3 py-1 rounded-full text-green-800 font-bold">
                  {filterStats.matching}
                </span>
              </span>
            )}
          </div>
        </div>
        {filterStats.total > 0 && filterStats.matching !== filterStats.total && (
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <input 
              type="checkbox" 
              id="show_matching" 
              checked={showOnlyMatching}
              onChange={e => setShowOnlyMatching(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label 
              htmlFor="show_matching" 
              className="text-sm text-gray-700 select-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              Show only matching results
            </label>
          </div>
        )}
      </div>
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-blue-400 shadow text-white">
              <th className="px-4 py-3 text-left text-sm font-bold rounded-tl-xl">#</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Name</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Category</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Address</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Phone</th>
              <th className="px-4 py-3 text-center text-sm font-bold">Rating</th>
              <th className="px-4 py-3 text-center text-sm font-bold">WhatsApp</th>
              <th className="px-4 py-3 text-left text-sm font-bold rounded-tr-xl">Website</th>
            </tr>
          </thead>
          <tbody>
            {displayPlaces.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-6 text-center text-gray-500 bg-white rounded-b-xl">
                  {filterStats.total > 0 ? 
                    "No results match your filter criteria" : 
                    "No results yet. Start the search to see data here."}
                </td>
              </tr>
            ) : displayPlaces.map((place, index) => {
              const placeWithFilter = place as PlaceWithFilter;
              const rowClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
              return (
                <tr key={index} className={`${rowClass} hover:bg-blue-50 transition-all`} style={{height: '64px'}}>
                  <td className="px-4 py-3 text-center text-gray-400 font-semibold align-middle">{index + 1}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold text-base ${placeWithFilter.matchesFilters ? 'text-blue-800' : 'text-gray-700'}`}>{place.storeName}</span>
                      {place.isVerified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700" title="Google Verified Business">
                          <FaCheckCircle className="mr-1 text-blue-500" />Verified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 align-middle">{place.category}</td>
                  <td className="px-4 py-3 text-gray-600 align-middle max-w-xs truncate" title={place.address}>{place.address}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">{place.phone}</span>
                      {place.hasWhatsApp && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700" title="WhatsApp Available">
                          <FaWhatsapp className="mr-1 text-green-500" />WhatsApp
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <div className="flex flex-col items-center">
                      {renderRating(place.stars)}
                      <span className="text-xs text-gray-400">({place.numberOfReviews})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    {/* WhatsApp tick/cross icon */}
                    {place.hasWhatsApp ? (
                      <span title="WhatsApp Available" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 mx-auto">
                        <FaCheckCircle className="text-lg" />
                      </span>
                    ) : (
                      <span title="No WhatsApp" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-500 mx-auto">
                        <FaTimesCircle className="text-lg" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {place.bizWebsite ? (
                      <a 
                        href={place.bizWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium text-xs hover:bg-blue-200 transition-all"
                        title={place.bizWebsite}
                      >
                        <FaGlobe className="mr-1 text-blue-500" />Website
                      </a>
                    ) : (
                      <span className="text-gray-400">No website</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between mt-6 space-y-2 md:space-y-0 md:space-x-4">
        <button 
          disabled={!places.length} 
          className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 px-4 py-3 rounded-lg flex items-center justify-center transition-all font-semibold" 
          onClick={() => onClear()}
        >
          Clear Results
        </button>
        <button 
          disabled={!places.length} 
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 px-4 py-3 rounded-lg flex items-center justify-center transition-all font-semibold" 
          onClick={() => doExport(places)}
        >
          <img src={AeroplaneIcon} width={18} className="mr-2 filter brightness-0 invert"/>
          Export Results
          {showOnlyMatching && filterStats.matching !== filterStats.total && (
            <span className="ml-2 bg-blue-500 text-xs px-2 py-0.5 rounded-full">
              {filterStats.matching}
            </span>
          )}
        </button>
      </div>
      {places.length > 0 && (
        <div className="text-xs text-gray-500 mt-4 bg-blue-50 p-3 rounded-lg">
          <strong>Note:</strong> WhatsApp detection depends on the selected mode. In strict mode, only confirmed numbers are flagged. For absolute verification, manually check numbers.
        </div>
      )}
    </div>
  )
}

export default ResultTable;