export function isReserveDisabled(opts: {
  stripeConfigured: boolean;
  stripeReady: boolean;
  loading: boolean;
}): boolean {
  return opts.loading || (opts.stripeConfigured && !opts.stripeReady);
}
