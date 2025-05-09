import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { knex } from '../database';
import { checkIfSessionIdExists } from '../middlewares/check-if-session-id-exists';

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export async function transactionsRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    });

    const body = createTransactionBodySchema.parse(request.body);
    const { title, amount, type } = body;

    let sessionId = request.cookies.sessionId;
    if (!sessionId) {
      sessionId = randomUUID();
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: ONE_WEEK_IN_SECONDS,
      });
    }

    await knex('transactions').insert({
      title,
      id: randomUUID(),
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    });

    return reply.status(201).send();
  });

  app.get('/', { preHandler: [checkIfSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies;

    const transactions = await knex('transactions')
      .where('session_id', sessionId)
      .select();

    return { data: transactions };
  });

  app.get('/:id', { preHandler: [checkIfSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies;

    const getTransactionParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = getTransactionParamsSchema.parse(request.params);

    const transaction = await knex('transactions')
      .where({ id, session_id: sessionId })
      .first();

    return { data: transaction };
  });

  app.get(
    '/summary',
    { preHandler: [checkIfSessionIdExists] },
    async (request) => {
      const { sessionId } = request.cookies;

      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first();

      return { data: summary };
    },
  );
}
