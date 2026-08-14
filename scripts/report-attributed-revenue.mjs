import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseReportArgs,
  createNeonAttributedRevenueReport,
  formatReportTable,
  formatReportJson
} = require('../lib/attributed-revenue-report.js');

try {
  const args = parseReportArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  const report = createNeonAttributedRevenueReport(process.env.DATABASE_URL);
  const result = await report.run({ from: args.from, to: args.to });
  console.log(args.format === 'json' ? formatReportJson(result) : formatReportTable(result));
} catch (error) {
  // Only echo messages we know are secret-safe: our own validation errors
  // (ReportUsageError, marked with safeToDisplay) and the fixed
  // "DATABASE_URL is not configured" message. Anything else -- including a
  // driver/query failure that could embed the connection string -- collapses
  // to a generic message so no secret ever reaches stderr.
  const isKnownSafeError = Boolean(error) && (
    error.safeToDisplay === true || error.message === 'DATABASE_URL is not configured'
  );
  console.error(`report-attributed-revenue: ${isKnownSafeError ? error.message : 'failed to generate report'}`);
  process.exit(1);
}
