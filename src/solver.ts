/**
 * @fileoverview Core Proof-of-Work solver for Cloudflare Worker–powered waitlists.
 *
 * Michigan MindMend Inc. — helping kids get mental-health support without technical barriers.
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the challenge response returned by the waitlist worker. */
export interface ChallengeResponse {
  /** Whether a Proof-of-Work challenge is required. */
  pow_required: boolean;
  /** The hex-encoded challenge string to prepend to the nonce candidate. */
  challenge: string;
  /** Number of leading zero hex-digits required in the SHA-256 hash. */
  difficulty: number;
}

/** Result returned by {@link solveAndSubmit}. */
export interface SolveResult {
  /** `true` when the email was successfully added to the waitlist. */
  success: boolean;
  /** Waitlist position reported by the server (when available). */
  position?: number;
  /** Human-readable error message (only present on failure). */
  error?: string;
}

/** Options accepted by {@link solveAndSubmit}. */
export interface SolveOptions {
  /** Base URL of the Cloudflare Worker waitlist endpoint. */
  url: string;
  /** Email address to register on the waitlist. */
  email: string;
  /** Maximum milliseconds to wait for each network request. Defaults to `5000`. */
  timeout?: number;
  /** Print step-by-step solver output to stdout. Defaults to `false`. */
  verbose?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hex digest of the given string.
 *
 * @param input - The string to hash.
 * @returns The lowercase hex-encoded SHA-256 digest.
 */
function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Log a message to stdout only when verbose mode is enabled.
 *
 * @param verbose - Whether verbose logging is active.
 * @param message - The message to print.
 */
function log(verbose: boolean, message: string): void {
  if (verbose) {
    process.stdout.write(`[solver] ${message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the current Proof-of-Work challenge from the waitlist endpoint.
 *
 * @param url - Base URL of the waitlist worker.
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns The parsed {@link ChallengeResponse}.
 * @throws If the network request fails or the response cannot be parsed.
 */
export async function fetchChallenge(
  url: string,
  signal?: AbortSignal,
): Promise<ChallengeResponse> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`GET ${url} responded with HTTP ${res.status}`);
  }
  const data = (await res.json()) as ChallengeResponse;
  return data;
}

/**
 * Brute-force a nonce such that `SHA256(challenge + nonce)` starts with
 * `difficulty` leading zero hex-digits.
 *
 * @param challenge - The hex-encoded challenge string from the server.
 * @param difficulty - Number of leading zero hex-digits required.
 * @param maxIterations - Upper bound on attempts (default: `10_000_000`).
 * @returns An object containing the winning `nonce` (as a decimal string) and
 *          the resulting `hash` hex string.
 * @throws If no solution is found within `maxIterations` attempts.
 */
export function solveChallenge(
  challenge: string,
  difficulty: number,
  maxIterations = 10_000_000,
): { nonce: string; hash: string } {
  const prefix = '0'.repeat(difficulty);
  for (let nonce = 0; nonce < maxIterations; nonce++) {
    const hash = sha256(`${challenge}${nonce}`);
    if (hash.startsWith(prefix)) {
      return { nonce: String(nonce), hash };
    }
  }
  throw new Error(
    `solveChallenge: no solution found within ${maxIterations} iterations (difficulty ${difficulty})`,
  );
}

/**
 * Fetch the POW challenge, solve it, and POST the registration to the waitlist.
 *
 * @example
 * ```ts
 * const result = await solveAndSubmit({
 *   url: 'https://waitlist.example.com',
 *   email: 'user@example.com',
 * });
 * if (result.success) {
 *   console.log('Registered! Position:', result.position);
 * }
 * ```
 *
 * @param options - {@link SolveOptions}
 * @returns A {@link SolveResult} indicating success or failure.
 */
export async function solveAndSubmit(options: SolveOptions): Promise<SolveResult> {
  const { url, email, timeout = 5000, verbose = false } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    // 1. Fetch challenge
    log(verbose, `Fetching challenge from ${url} …`);
    const challengeData = await fetchChallenge(url, controller.signal);

    if (!challengeData.pow_required) {
      log(verbose, 'No POW challenge required — submitting directly …');
    } else {
      log(verbose, `Difficulty: ${challengeData.difficulty} leading zero(s)`);
    }

    // 2. Solve the proof-of-work
    const startMs = Date.now();
    const { nonce, hash } = solveChallenge(challengeData.challenge, challengeData.difficulty);
    const elapsedMs = Date.now() - startMs;

    log(verbose, `Challenge solved in ${elapsedMs} ms  (nonce: ${nonce}, hash: ${hash})`);

    // 3. Submit registration
    log(verbose, `Submitting entry for ${email} …`);

    const postRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nonce, solution: hash }),
      signal: controller.signal,
    });

    if (!postRes.ok) {
      const text = await postRes.text().catch(() => '');
      return {
        success: false,
        error: `POST ${url} responded with HTTP ${postRes.status}: ${text}`,
      };
    }

    const result = (await postRes.json()) as {
      success?: boolean;
      position?: number;
      error?: string;
    };

    if (result.success === false) {
      return { success: false, error: result.error ?? 'Server returned success: false' };
    }

    log(
      verbose,
      `✓ Successfully joined the waitlist${result.position != null ? ` (position #${result.position})` : ''}`,
    );

    return { success: true, position: result.position };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
