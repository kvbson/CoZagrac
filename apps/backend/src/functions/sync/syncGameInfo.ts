import {
  appDetailsEndpoint,
  mapAppDetailsToCreateGameInput,
} from '../../clients/steam/endpoints/global/appDetails.endpoint.js';
import { gameService } from '../../services/game.service.js';
import { logger } from '../../utils/logger.js';
import { steamRequest } from '../../utils/steamRequest.js';
import { recommendationsThresholds } from '../getReviewTier.js';

export async function syncGameInfo(
  appId: string | number,
  force?: boolean,
): Promise<{ success: boolean; reason?: string }> {
  const res = await steamRequest(() => appDetailsEndpoint.getData(String(appId)));

  const entry = res?.[appId];
  if (!entry?.success || !entry.data) {
    logger.info(`[SKIP] ${appId} – no data`);
    return { success: false, reason: 'No data from Steam' };
  }

  const data = entry.data;

  // omit not games, games without name and unreleased games
  if (data.type !== 'game' || !data.name || data.release_date?.coming_soon) {
    logger.info(
      `[SKIP] Game missing criteria: ${appId} – type: ${data.type}, name: ${data.name}, release_date: ${data.release_date?.date}`,
    );
    return { success: false, reason: 'Not a released game' };
  }

  const recs = data.recommendations?.total ?? 0;
  if (!force && recs < recommendationsThresholds.B) {
    logger.info(`[SKIP] ${appId} (${data.name}) – low recommendations (${recs})`);
    return { success: false, reason: 'Low recommendations' };
  }

  const payload = mapAppDetailsToCreateGameInput(res);

  await gameService.sync(payload);
  logger.info(`[SYNCED] ${appId} – ${data.name} - recommendations: ${recs}`);
  return { success: true };
}
