import {
  appDetailsEndpoint,
  mapAppDetailsToCreateGameInput,
} from '../clients/steam/endpoints/global/appDetails.endpoint.js';
import { gameService } from '../services/game.service.js';
import { logger } from '../utils/logger.js';
import { steamRequest } from '../utils/steamRequest.js';
import StreamJson from 'stream-json';
import fs from 'node:fs';
import streamVal from 'stream-json/streamers/StreamObject.js';
import { recommendationsThresholds } from './getReviewTier.js';

export async function* iterateCandidateSteamIds() {
  const stream = fs
    .createReadStream('src/datasets/games.json')
    .pipe(StreamJson.parser())
    .pipe(streamVal.streamObject());

  for await (const { key, value } of stream) {
    const appid = Number(key);
    if (!Number.isInteger(appid)) continue;

    const recs = value.recommendations ?? 0;
    if (recs < recommendationsThresholds.B) continue;

    yield appid;
  }
}

export async function batchSyncCandidatesFromSteamJSON() {
  logger.info('=== START BATCH SYNC ===');

  for await (const appid of iterateCandidateSteamIds()) {
    try {
      logger.checkpoint(appid);

      const res = await steamRequest(() => appDetailsEndpoint.getData(String(appid)));

      const entry = res?.[appid];
      if (!entry?.success || !entry.data) {
        logger.info(`[SKIP] ${appid} – no data`);
        continue;
      }

      const data = entry.data;
      const payload = mapAppDetailsToCreateGameInput(res);

      await gameService.sync(payload);

      logger.info(`[SYNCED] ${appid} – ${data.name} - recommendations: ${payload.game.reviewTier}`);
    } catch (err) {
      logger.error(`[FAILED] ${appid}`);
      logger.failedApp(appid, err);
    }
  }
  logger.info('=== END BATCH SYNC ===');
}
