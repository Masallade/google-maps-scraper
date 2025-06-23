import Place from './Place';

// Extended place type to include filter match status
export interface PlaceWithFilter extends Place {
  matchesFilters?: boolean;
}

export default interface ResultTableProps {
  places: PlaceWithFilter[];
  onClear: () => void;
  onExport: (places: PlaceWithFilter[], queryText?: string) => void;
}