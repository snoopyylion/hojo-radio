import { Suspense } from 'react';
import SearchResultsPage from '../../../components/SearchResultPage';

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResultsPage />
    </Suspense>
  );
}
