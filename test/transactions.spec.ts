import { execSync } from 'node:child_process';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync('npm run knex -- migrate:rollback --all');
    execSync('pnpm run knex -- migrate:latest');
  });

  it('should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })
      .expect(201);
  });

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      });

    const cookies = createTransactionResponse.get('Set-Cookie');
    if (!cookies) {
      throw new Error('No cookies found in the response');
    }

    const listAllTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200);

    expect(listAllTransactionsResponse.body.data).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ]);
  });

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      });

    const cookies = createTransactionResponse.get('Set-Cookie');
    if (!cookies) {
      throw new Error('No cookies found in the response');
    }

    const listAllTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200);

    const transactionId = listAllTransactionsResponse.body.data[0].id;

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(getTransactionResponse.body.data).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    );
  });

  it('should be able to get the summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'Credit transaction',
        amount: 5000,
        type: 'credit',
      });

    const cookies = createTransactionResponse.get('Set-Cookie');
    if (!cookies) {
      throw new Error('No cookies found in the response');
    }

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'Debit transaction',
        amount: 2000,
        type: 'debit',
      });

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200);

    expect(summaryResponse.body.data).toEqual({
      amount: 3000,
    });
  });
});
