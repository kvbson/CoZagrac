import { useContext, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RecommendationFilters } from '@cozagrac/shared/contracts/api';
import { Button } from '../components/ui/Button';
import { AuthContext } from '../context/AuthContext';
import { RecommendationList } from '../features/recommendations/RecommendationList';
import { useRecommendations } from '../features/recommendations/useRecommendations';
import { ProfileWizard } from '../features/profile/ProfileWizard';

/** grupowe chipy filtrów; value '' znaczy "wyłącz filtr" */
const FILTER_CONTROLS: { key: string; label: string; options: { value: string; label: string }[] }[] =
  [
    {
      key: 'minDiscount',
      label: 'Discount',
      options: [
        { value: '', label: 'Any' },
        { value: '25', label: '25%+' },
        { value: '50', label: '50%+' },
        { value: '75', label: '75%+' },
      ],
    },
    {
      key: 'minReviewTier',
      label: 'Popularity',
      options: [
        { value: '', label: 'Any' },
        { value: 'B', label: '1k+ reviews' },
        { value: 'A', label: '5k+ reviews' },
        { value: 'S', label: '10k+ reviews' },
      ],
    },
    {
      key: 'yearFrom',
      label: 'Released',
      options: [
        { value: '', label: 'Any time' },
        { value: '2015', label: '2015+' },
        { value: '2020', label: '2020+' },
        { value: '2023', label: '2023+' },
      ],
    },
    {
      key: 'platform',
      label: 'Platform',
      options: [
        { value: '', label: 'All' },
        { value: 'windows', label: 'Windows' },
        { value: 'mac', label: 'macOS' },
        { value: 'linux', label: 'Linux' },
      ],
    },
  ];

function readFilters(params: URLSearchParams): RecommendationFilters {
  const filters: RecommendationFilters = {};

  if (params.get('isFree') === 'true') filters.isFree = true;

  const minDiscount = Number(params.get('minDiscount'));
  if (params.get('minDiscount') && Number.isInteger(minDiscount)) filters.minDiscount = minDiscount;

  const minReviewTier = params.get('minReviewTier');
  if (minReviewTier === 'B' || minReviewTier === 'A' || minReviewTier === 'S')
    filters.minReviewTier = minReviewTier;

  const yearFrom = Number(params.get('yearFrom'));
  if (params.get('yearFrom') && Number.isInteger(yearFrom)) filters.yearFrom = yearFrom;

  const platform = params.get('platform');
  if (platform === 'windows' || platform === 'mac' || platform === 'linux')
    filters.platform = platform;

  return filters;
}

export function RecommendationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const [wizardOpen, setWizardOpen] = useState(false);
  const filters = readFilters(searchParams);

  const {
    items,
    status,
    error,
    building,
    gamesUsed,
    jobStatus,
    jobError,
    jobSource,
    loadingMore,
    refreshing,
    hasEmbedding,
    hasMore,
    load,
    loadMore,
    buildProfile,
  } = useRecommendations(filters);

  function setFilterParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  if (status === 'loading') {
    return (
      <div className="center">
        <p>Loading recommendations…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="center">
        <p className="error">{error}</p>
        <Button onClick={load} disabled={refreshing}>
          {refreshing ? 'Loading…' : 'Try again'}
        </Button>
      </div>
    );
  }

  // no profile yet -> the wizard is mandatory; otherwise it opens on demand
  if (!hasEmbedding || wizardOpen) {
    return (
      <ProfileWizard
        steamLinked={user?.steamLinked === true}
        required={!hasEmbedding}
        building={building}
        jobStatus={jobStatus}
        jobError={jobError}
        error={error}
        onBuild={buildProfile}
        onDone={() => {
          setWizardOpen(false);
          void load();
        }}
        onClose={() => setWizardOpen(false)}
      />
    );
  }

  return (
    <section>
      <div className="page__header">
        <h1>Your recommendations</h1>

        <Button onClick={() => setWizardOpen(true)} disabled={building}>
          {building ? 'Recalculating profile…' : 'Recalculate profile'}
        </Button>
      </div>

      <div className="filters">
        <button
          type="button"
          className={`chip${filters.isFree === true ? ' chip--active' : ''}`}
          onClick={() => setFilterParam('isFree', filters.isFree === true ? '' : 'true')}
        >
          Free to Play
        </button>

        {FILTER_CONTROLS.map((control) => {
          const activeValue = searchParams.get(control.key) ?? '';

          return (
            <div key={control.key} className="filters__group">
              <span className="filters__label">{control.label}:</span>
              {control.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip${activeValue === option.value ? ' chip--active' : ''}`}
                  onClick={() => setFilterParam(control.key, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {error && <p className="error">{error}</p>}

      {gamesUsed !== null && !building && (
        <p className="muted">
          Profile built from {gamesUsed}{' '}
          {jobSource === 'manual-games' ? 'games you picked' : 'of your most played games'}.
        </p>
      )}

      {items.length === 0 && !building ? (
        <p>No games match these filters. Try recalculating your profile or loosening the filters.</p>
      ) : (
        <RecommendationList items={items} />
      )}

      {hasMore && (
        <div className="center">
          <Button onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}
