import {
  appDetailsEndpoint,
  mapAppDetailsToCreateGameInput,
} from '../clients/steam/endpoints/global/appDetails.endpoint.js';
import { iterateAppList } from '../clients/steam/endpoints/global/appsList.endpoint.js';
import { gameService } from '../services/game.service.js';
import { logger } from '../utils/logger.js';
import { steamRequest } from '../utils/steamRequest.js';
import { recommendationsThresholds } from './getReviewTier.js';

export async function batchSyncCandidatesFromSteam() {
  logger.info('=== START BATCH SYNC ===');

  for await (const apps of iterateAppList()) {
    for (const { appid } of apps) {
      try {
        logger.checkpoint(appid);

        const res = await steamRequest(() => appDetailsEndpoint.getData(String(appid)));

        const entry = res?.[appid];
        if (!entry?.success || !entry.data) {
          logger.info(`[SKIP] ${appid} – no data`);
          continue;
        }

        const data = entry.data;

        if (data.type !== 'game') continue;
        if (data.release_date?.coming_soon) continue;

        const recs = data.recommendations?.total ?? 0;
        if (recs < recommendationsThresholds.B) {
          logger.info(`[SKIP] ${appid} (${data.name}) – low recommendations (${recs})`);
          continue;
        }

        const payload = mapAppDetailsToCreateGameInput(res);

        await gameService.sync(payload);

        logger.info(`[SYNCED] ${appid} – ${data.name} - recommendations: ${recs}`);
      } catch (err) {
        logger.error(`[FAILED] ${appid}`);
        logger.failedApp(appid, err);
      }
    }
  }

  logger.info('=== END BATCH SYNC ===');
}
