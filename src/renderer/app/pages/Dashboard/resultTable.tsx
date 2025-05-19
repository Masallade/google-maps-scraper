import ResultTableProps from '../../../../interface/types/ResultTableProps';
import AeroplaneIcon from '../../img/aeroplane-icon.png';
import Place from '../../../../interfaces/types/Place';

function ResultTable({
  places,
  onClear,
  onExport
}: ResultTableProps) {
  const doExport = (places: Place[]) => {
    // const csvString = [
    //   [
    //     "Nama",
    //     "Kategori",
    //     "Alamat",
    //     "No. HP",
    //     "URL Google",
    //     "Rating",
    //     "Jlh Pemberi Rating",
    //     "Website",
    //   ],
    //   ...places.map(place => [
    //     '"' + place.storeName.replace(/,/g, '\,').replace(/'/g, '\'') + '"',
    //     place.category ? place.category.replace(/"/g, '\"') : '',
    //     place.address ? place.address.replace(/"/g, '\"') : '',
    //     place.phone,
    //     '"' + place.googleUrl + '"',
    //     place.stars,
    //     place.numberOfReviews,
    //     '"' + (place.bizWebsite ? place.bizWebsite : '') + '"'
    //   ])
    // ]
    // .map(e => e.join(";")) 
    // .join("\n");     
    onExport(places);
  }

  return (
    <div id="result-content" className={`select-none`}>
      <div id="result-table" className={`table-wrp`}>
        <table className={`table-fixed w-full`}>
          <thead>
              <tr>
                  <th className={`text-left px-2 py-2 w-1.5 bg-primary w-8 text-center`}></th>
                  <th className={`text-left px-2 py-2 border-r border-light-gray bg-primary w-48`}>Name</th>
                  <th className={`text-left px-2 py-2 border-r border-light-gray bg-primary w-24`}>Category</th>
                  <th className={`text-left px-2 py-2 border-r border-light-gray bg-primary w-52`}>Address</th>
                  <th className={`text-left px-2 py-2 border-r border-light-gray bg-primary w-24`}>Phone</th>
                  {/* <th className={`text-left px-2 py-2 bg-primary`}>Website</th> */}
                  <th className={`text-left px-2 py-2 border-r border-light-gray  bg-primary w-16 text-center`}>Rating</th>
                  <th className={`text-left px-2 py-2 bg-primary w-52`}>Website</th>
              </tr>
          </thead>
          <tbody className={`text-black text-sm align-top bg-light`}>
            {places.map((place, index) =>
              (
              <tr key={index}>
                  <td className={`px-2 py-2 bg-gray border-t border-r border-light-gray w-5 text-center`}>
                    { index + 1 }
                  </td>
                  <td className={`px-2 py-2 border-t border-r border-light-gray`}>
                    { place.storeName }
                  </td>
                  <td className={`px-2 py-2 border-t border-r border-light-gray`}>{
                    place.category
                  }</td>
                  <td className={`px-2 py-2 border-t border-r border-light-gray`}>
                    { place.address }
                  </td>
                  <td className={`px-2 py-2 border-t border-r border-light-gray`}>
                    { place.phone }
                  </td>
                  {/* <td className={`table-cell`}></td> */}
                  <td className={`px-2 py-2 border-t border-r border-light-gray text-center`}>
                    { place.stars }({ place.numberOfReviews })
                  </td>
                  <td className={`px-2 py-2 border-t border-light-gray`}>
                    <span className={`text-ellipsis overflow-hidden block`}>
                    { place.bizWebsite }
                    </span>
                  </td>
              </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      <div className={`w-full flex mt-3`}>
        <div>
            <button disabled={!places.length} className={`bg-gray hover:opacity-90 disabled:opacity-50 px-3 py-1 rounded flex items-center justify-center`} type={`button`} onClick={() => onClear() }>
              Clear Results
            </button>
        </div>
        <div className={`ml-auto`}>
            <button disabled={!places.length} className={`bg-primary font-bold hover:opacity-90 disabled:opacity-50 px-3 py-1 rounded flex items-center text-black justify-center`} type={`button`} onClick={() => doExport(places) }>
                <img src={AeroplaneIcon} width={17}/>&nbsp;Export Results
            </button>
        </div>
      </div>
    </div>
  )
}
  
  export default ResultTable;