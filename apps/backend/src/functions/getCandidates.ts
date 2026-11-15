import { iterateAppList } from '../clients/steam/endpoints/global/appsList.endpoint.js';
import { logger } from '../utils/logger.js';
import { syncGameInfo } from './sync/syncGameInfo.js';

export async function batchSyncCandidatesFromSteam() {
  logger.info('=== START BATCH SYNC ===');

  for await (const apps of iterateAppList()) {
    for (const { appid } of apps) {
      try {
        logger.checkpoint(appid);

        await syncGameInfo(appid);
      } catch (err) {
        logger.error(`[FAILED] ${appid}`);
        logger.failedApp(appid, err);
      }
    }
  }

  logger.info('=== END BATCH SYNC ===');
}
