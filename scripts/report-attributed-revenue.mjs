import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseReportArgs,
  createNeonAttributedRevenueReport,
  formatReportTable,
  formatReportJson,
  formatCliErrorMessage
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
  console.error(formatCliErrorMessage(error));
  process.exit(1);
}
