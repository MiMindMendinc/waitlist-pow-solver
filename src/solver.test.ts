import { describe, it, expect, vi, beforeEach } from 'vitest';
import { solveChallenge, fetchChallenge, solveAndSubmit } from './solver.js';

// ---------------------------------------------------------------------------
// solveChallenge — pure, CPU-bound function
// ---------------------------------------------------------------------------
describe('solveChallenge', () => {
  it('returns a hash that starts with the correct number of zeros (difficulty 1)', () => {
    const { nonce, hash } = solveChallenge('testchallenge', 1);
    expect(hash.startsWith('0')).toBe(true);
    expect(typeof nonce).toBe('string');
  });

  it('returns a hash that starts with the correct number of zeros (difficulty 2)', () => {
    const { hash } = solveChallenge('abc', 2);
    expect(hash.startsWith('00')).toBe(true);
  });

  it('hash is the SHA-256 of challenge + nonce', async () => {
    const challenge = 'hello';
    const { nonce, hash } = solveChallenge(challenge, 1);
    const { createHash } = await import('node:crypto');
    const expected = createHash('sha256')
      .update(`${challenge}${nonce}`, 'utf8')
      .digest('hex');
    expect(hash).toBe(expected);
  });

  it('difficulty 0 always resolves on first attempt', () => {
    const { nonce, hash } = solveChallenge('anything', 0);
    expect(nonce).toBe('0');
    expect(hash).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// fetchChallenge — requires network; we mock global fetch
// ---------------------------------------------------------------------------
describe('fetchChallenge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed challenge data on success', async () => {
    const mockData = { pow_required: true, challenge: 'abc123', difficulty: 3 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    );

    const result = await fetchChallenge('https://example.com');
    expect(result).toEqual(mockData);
  });

  it('throws when the server returns a non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(fetchChallenge('https://example.com')).rejects.toThrow('HTTP 503');
  });
});

// ---------------------------------------------------------------------------
// solveAndSubmit — integration-style test with mocked fetch
// ---------------------------------------------------------------------------
describe('solveAndSubmit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success with position when server responds correctly', async () => {
    const challenge = 'integration';
    const difficulty = 1;
    // Compute expected solution so we know what the POST body will contain
    const { nonce, hash } = solveChallenge(challenge, difficulty);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ pow_required: true, challenge, difficulty }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, position: 7 }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await solveAndSubmit({ url: 'https://example.com', email: 'a@b.com' });

    expect(result.success).toBe(true);
    expect(result.position).toBe(7);

    // Verify POST body
    const postCall = fetchMock.mock.calls[1];
    const body = JSON.parse(postCall[1].body as string);
    expect(body.email).toBe('a@b.com');
    expect(body.nonce).toBe(nonce);
    expect(body.solution).toBe(hash);
  });

  it('returns failure when the GET request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    const result = await solveAndSubmit({ url: 'https://example.com', email: 'a@b.com' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Network error/);
  });

  it('returns failure when POST responds with non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ pow_required: true, challenge: 'x', difficulty: 1 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad Request'),
        }),
    );

    const result = await solveAndSubmit({ url: 'https://example.com', email: 'a@b.com' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/HTTP 400/);
  });

  it('returns failure when server returns success: false', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ pow_required: true, challenge: 'y', difficulty: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: false, error: 'duplicate email' }),
        }),
    );

    const result = await solveAndSubmit({ url: 'https://example.com', email: 'a@b.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('duplicate email');
  });
});
