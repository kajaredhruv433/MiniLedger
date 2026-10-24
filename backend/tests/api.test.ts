jest.mock('../src/db', () => ({ pool: { query: jest.fn() } }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { pool } from '../src/db';

const query = pool.query as jest.Mock;
const token = jwt.sign({}, 'test-secret', { subject: '42' });
const auth = { Authorization: `Bearer ${token}` };

beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });
beforeEach(() => { query.mockReset(); });

describe('MiniLedger API', () => {
  it('adds a valid loan', async () => {
    const loan = { id: '1', friendName: 'Asha', amount: 500, dueDate: '2026-12-31', direction: 'lent', repaidAt: null };
    query.mockResolvedValueOnce({ rows: [loan], rowCount: 1 });
    const response = await request(app).post('/api/loans').set(auth).send({ friendName: 'Asha', amount: 500, dueDate: '2026-12-31', direction: 'lent' });
    expect(response.status).toBe(201);
    expect(response.body.loan).toMatchObject({ friendName: 'Asha', amount: 500, direction: 'lent' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects a loan amount of zero without writing to the database', async () => {
    const response = await request(app).post('/api/loans').set(auth).send({ friendName: 'Asha', amount: 0, dueDate: '2026-12-31' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/greater than ₹0/i);
    expect(query).not.toHaveBeenCalled();
  });

  it('marks an outstanding loan as repaid', async () => {
    const loan = { id: '1', friendName: 'Asha', amount: 500, direction: 'lent', repaidAt: '2026-10-24T10:00:00.000Z' };
    query.mockResolvedValueOnce({ rows: [loan], rowCount: 1 });
    const response = await request(app).patch('/api/loans/1/repaid').set(auth);
    expect(response.status).toBe(200);
    expect(response.body.loan.repaidAt).toBeTruthy();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('repaid_at IS NULL'), ['1', '42']);
  });

  it('rejects marking an already-repaid loan a second time', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 }).mockResolvedValueOnce({ rows: [{ repaid_at: '2026-10-24T10:00:00Z' }], rowCount: 1 });
    const response = await request(app).patch('/api/loans/1/repaid').set(auth);
    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already marked as settled/i);
  });

  it('calculates lent, repaid, borrowed, to collect, to repay and overdue totals', async () => {
    const summary = { totalLent: 800, totalRepaid: 300, totalBorrowed: 400, totalPaid: 100, toCollect: 500, toRepay: 300, overdueAmount: 200, overdueToRepay: 50 };
    query.mockResolvedValueOnce({ rows: [summary], rowCount: 1 });
    const response = await request(app).get('/api/loans/summary').set(auth);
    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual(summary);
    expect(query.mock.calls[0][0]).toContain("due_date < CURRENT_DATE");
  });

  it('rejects an incorrect OTP', async () => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    await request(app).post('/api/auth/request-otp').send({ phone: '9876543210' }).expect(200);
    const response = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '000000' });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/incorrect or expired OTP/i);
    expect(query).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('requires exactly ten phone digits', async () => {
    const response = await request(app).post('/api/auth/request-otp').send({ phone: '+919876543210' });
    expect(response.status).toBe(400);
  });
});
