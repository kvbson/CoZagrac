import { embeddingService } from '../../services/embeddings.service.js';
import { gameService } from '../../services/game.service.js';
import { logger } from '../../utils/logger.js';
import { sleep } from '../../utils/retry.js';

export async function syncAllGameEmbeddings({
  batchSize = 2,
  delayBetweenBatchesMs = 2000,
}: {
  batchSize?: number;
  delayBetweenBatchesMs?: number;
} = {}) {
  logger.info('[EMBEDDINGS_SYNC] Starting game embeddings sync');

  const appIds = await gameService.getIdsWithoutEmbeddings();

  logger.info('[EMBEDDINGS_SYNC] Games to process', {
    count: appIds.length,
  });

  // 2. Batch processing
  for (let i = 0; i < appIds.length; i += batchSize) {
    const batch = appIds.slice(i, i + batchSize);

    logger.info('[EMBEDDINGS_SYNC][BATCH]', {
      batchStart: i,
      batchSize: batch.length,
    });

    await Promise.all(
      batch.map(async (steamAppid) => {
        try {
          logger.info('[EMBEDDINGS_SYNC][GAME][START]', { steamAppid });

          await embeddingService.game.generateGameEmbedding(steamAppid);

          logger.info('[EMBEDDINGS_SYNC][GAME][DONE]', { steamAppid });
        } catch (error) {
          logger.error('[EMBEDDINGS_SYNC][GAME][ERROR]', error, { steamAppid });
        }
      }),
    );

    if (i + batchSize < appIds.length) {
      logger.debug('[EMBEDDINGS_SYNC] Sleeping between batches', {
        delayBetweenBatchesMs,
      });
      await sleep(delayBetweenBatchesMs);
    }
  }

  logger.info('[EMBEDDINGS_SYNC] Completed game embeddings sync');
}
