// The app writes JSON logs to stdout (spec 010). Keep test output clean unless a test opts in
// (observability tests set LOG_LEVEL themselves).
process.env.LOG_LEVEL ??= 'silent';
