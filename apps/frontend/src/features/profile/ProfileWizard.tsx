import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type {
  ProfileSource,
  UserEmbeddingStatusResponse,
} from '@cozagrac/shared/contracts/api';
import type { BuildProfileInput } from '../recommendations/useRecommendations';
import { useProfileWizard, type WizardStep } from './useProfileWizard';

type ProfileWizardProps = {
  steamLinked: boolean;
  /** required mode hides the close button (no profile exists yet) */
  required: boolean;
  building: boolean;
  jobStatus: UserEmbeddingStatusResponse['status'];
  jobError: string | null;
  error: string | null;
  onBuild: (input: BuildProfileInput) => Promise<boolean>;
  onDone: () => void;
  onClose: () => void;
};

const STEP_LABELS: Record<string, string> = {
  'steam-library': 'your Steam library (most played games)',
  'manual-games': 'the games you picked',
};

/** ścieżka Steam pomija krok wyboru gier: build jest tam krokiem 2 z 2 */
function getStepNumber(step: WizardStep, source: ProfileSource | null): number {
  if (step === 'source') return 1;
  if (step === 'games') return 2;
  return source === 'steam-library' ? 2 : 3;
}

export function ProfileWizard({
  steamLinked,
  required,
  building,
  jobStatus,
  jobError,
  error,
  onBuild,
  onDone,
  onClose,
}: ProfileWizardProps) {
  const [starting, setStarting] = useState(false);
  const wizard = useProfileWizard(onBuild);

  async function handleStart() {
    setStarting(true);
    await wizard.startBuild();
    setStarting(false);
  }

  const searchItems = wizard.searchQuery.data?.userData?.items ?? [];
  const searching = wizard.searchQuery.isFetching && wizard.submitted !== '';
  const stepNumber = getStepNumber(wizard.step, wizard.source);
  const totalSteps = wizard.source === 'steam-library' ? 2 : 3;

  return (
    <section className="wizard">
      <div className="page__header">
        <h1>Choose your recommendation basis</h1>
        {!required && (
          <Button onClick={onClose} disabled={wizard.started && building}>
            Close
          </Button>
        )}
      </div>

      <p className="muted">
        Step {stepNumber} of {totalSteps} — your picks and library are only used to compute your
        taste profile.
      </p>

      {wizard.step === 'source' && (
        <div className="wizard__options">
          {steamLinked && (
            <button
              type="button"
              className="wizard__option"
              onClick={() => wizard.pickSource('steam-library')}
            >
              <h3>My Steam library</h3>
              <p>
                We rank your games by playtime and build the profile from your 50 most played
                ones. The library is fetched live from Steam and never stored.
              </p>
            </button>
          )}

          <button
            type="button"
            className="wizard__option"
            onClick={() => wizard.pickSource('manual-games')}
          >
            <h3>Games I pick myself</h3>
            <p>
              Search our catalog and select {wizard.minGames}–{wizard.maxGames} games you love.
              Works with any account — no Steam connection needed.
            </p>
          </button>
        </div>
      )}

      {wizard.step === 'games' && (
        <>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              wizard.submitSearch(wizard.input);
            }}
          >
            <input
              type="search"
              value={wizard.input}
              onChange={(event) => wizard.setInput(event.target.value)}
              placeholder="e.g. witcher, colony sim, roguelike…"
            />
            <button type="submit">Search</button>
          </form>

          <div className="wizard__picked">
            <span className="muted">
              Selected: {wizard.selected.length}/{wizard.maxGames}
            </span>
            {wizard.selected.map((game) => (
              <button
                key={game.steamAppid}
                type="button"
                className="chip chip--active"
                onClick={() => wizard.togglePicked(game)}
                title="Remove from selection"
              >
                {game.name} ×
              </button>
            ))}
          </div>

          {wizard.favoritesLoading && <p className="muted">Loading your saved picks…</p>}

          {searching && <p className="muted">Searching…</p>}

          {wizard.submitted !== '' &&
            wizard.searchQuery.isSuccess &&
            wizard.searchQuery.data?.success &&
            searchItems.length === 0 && <p className="muted">No games found for “{wizard.submitted}”.</p>}

          <div className="rec-grid">
            {searchItems.map((item) => {
              const added = wizard.isSelected(item.steamAppid);

              return (
                <Card key={item.steamAppid}>
                  {item.headerImage ? (
                    <img className="card__img" src={item.headerImage} alt="" loading="lazy" />
                  ) : (
                    <div className="card__img card__img--empty">No image</div>
                  )}

                  <div className="card__body">
                    <h3>{item.name}</h3>
                    <Button onClick={() => wizard.togglePicked(item)}>
                      {added ? 'Remove from selection' : 'Add to selection'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="wizard__nav">
            <Button onClick={wizard.back}>Back</Button>
            <Button
              onClick={wizard.goBuild}
              disabled={!wizard.canBuild}
              title={
                wizard.canBuild
                  ? undefined
                  : `Select ${wizard.minGames}–${wizard.maxGames} games to continue`
              }
            >
              Build profile
            </Button>
          </div>
          {!wizard.canBuild && (
            <p className="muted">Select at least {wizard.minGames} games to continue.</p>
          )}
        </>
      )}

      {wizard.step === 'build' && (
        <div className="center">
          {!wizard.started && (
            <>
              <h2>Ready to build</h2>
              <p>
                We will build your taste profile from{' '}
                {wizard.source ? STEP_LABELS[wizard.source] : 'your selection'}. It takes a
                moment; you can leave this page while it runs.
              </p>
              <div className="wizard__nav">
                <Button onClick={wizard.back} disabled={starting}>
                  Back
                </Button>
                <Button onClick={handleStart} disabled={starting}>
                  {starting ? 'Starting…' : 'Start building'}
                </Button>
              </div>
              {error && <p className="error">{error}</p>}
            </>
          )}

          {wizard.started && (building || jobStatus === 'running') && (
            <>
              <h2>Building your profile…</h2>
              <p className="muted">
                Analysing {wizard.source ? STEP_LABELS[wizard.source] : 'your games'} and matching
                them against the catalog.
              </p>
            </>
          )}

          {wizard.started && jobStatus === 'done' && (
            <>
              <h2>Profile ready</h2>
              <p>Your recommendations are up to date.</p>
              <Button onClick={onDone}>Show recommendations</Button>
            </>
          )}

          {wizard.started && jobStatus === 'failed' && (
            <>
              <h2>Could not build your profile</h2>
              <p className="error">{jobError ?? 'Unknown error.'}</p>
              <div className="wizard__nav">
                <Button onClick={handleStart} disabled={building}>
                  Try again
                </Button>
                <Button onClick={wizard.restart}>Choose another basis</Button>
              </div>
            </>
          )}

          {wizard.started && jobStatus === 'idle' && !building && (
            <>
              <h2>Status unavailable</h2>
              <p className="muted">
                The build job status was lost (server restart). Your profile may still have been
                rebuilt.
              </p>
              <Button onClick={onDone}>Show recommendations</Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
