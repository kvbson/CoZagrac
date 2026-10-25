import { model, openAiClient } from './index.js';
import { usageService } from '../../services/usage.service.js';
import { QuotaError } from '../../utils/usage.helpers.js';

/**
 * The single chokepoint for all OpenAI embedding calls (web jobs and admin
 * batch scripts alike). Checks the remaining daily budgets before the call
 * and books the exact response.usage.total_tokens afterwards, so the global
 * cap doubles as a hard spend ceiling (~limit * $0.02/1M per day).
 */
export async function createEmbeddings(
  input: string | string[],
  ctx: { userId: string | null },
) {
  const problem = await usageService.tokenBudgetProblem(ctx.userId);
  if (problem) {
    throw new QuotaError(
      problem === 'global'
        ? 'Daily AI quota for the whole service is exhausted. Try again tomorrow.'
        : 'Daily AI quota for your account is exhausted. Try again tomorrow.',
    );
  }

  const response = await openAiClient.embeddings.create({ model, input });
  await usageService.addTokens(ctx.userId, response.usage?.total_tokens ?? 0);

  return response;
}
