/**
 * @fileoverview CLI entry point for waitlist-pow-solver.
 *
 * Uses Commander.js for argument parsing and ora for friendly spinners —
 * because every family deserves a frictionless sign-up experience.
 */

/** Injected at build time by tsup — matches the version in package.json. */
declare const __PKG_VERSION__: string;

import { program } from 'commander';
import ora from 'ora';
import { solveAndSubmit } from './solver.js';

program
  .name('waitlist-pow-solver')
  .description(
    'Solve a Cloudflare Proof-of-Work challenge and register an email on the waitlist.\n' +
      'Built with care for Michigan MindMend Inc. — helping kids get the support they deserve.',
  )
  .version(__PKG_VERSION__, '-v, --version', 'Output the current version')
  .requiredOption('-u, --url <url>', 'Base URL of the Cloudflare Worker waitlist endpoint')
  .requiredOption('-e, --email <email>', 'Email address to register on the waitlist')
  .option(
    '-t, --timeout <ms>',
    'Maximum milliseconds to wait for each network request',
    (v) => parseInt(v, 10),
    5000,
  )
  .option('--verbose', 'Print step-by-step solver output', false)
  .action(async (opts: { url: string; email: string; timeout: number; verbose: boolean }) => {
    const spinner = ora({
      text: `Fetching challenge from ${opts.url} …`,
      color: 'cyan',
    }).start();

    try {
      // Step 1 — fetch challenge (spinner shows progress)
      spinner.text = `Fetching challenge from ${opts.url} …`;
      await new Promise((r) => setTimeout(r, 0)); // flush spinner frame

      // Step 2 — solve + submit
      spinner.text = 'Solving Proof-of-Work puzzle …';

      const result = await solveAndSubmit({
        url: opts.url,
        email: opts.email,
        timeout: opts.timeout,
        verbose: false, // spinner handles UI feedback
      });

      if (result.success) {
        spinner.succeed(
          `✓ Successfully joined the waitlist${result.position != null ? `  (position #${result.position})` : ''}`,
        );
        if (opts.verbose) {
          console.log('\n[solver] Registration complete for', opts.email);
        }
        process.exit(0);
      } else {
        spinner.fail(`✗ Registration failed: ${result.error}`);
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      spinner.fail(`✗ Unexpected error: ${message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

