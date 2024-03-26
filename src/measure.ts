import { DateObjectUnits, DateTime, DateTimeJSOptions, Settings } from 'luxon';

const _widest_dates_cache = new Map<string, Record<string, DateObjectUnits>>();
const _widest_labels_cache = new Map<string, number>();

function _pick_widest_sample(
  ctx: CanvasRenderingContext2D,
  samples: Generator<DateTime>,
  format: Intl.DateTimeFormatOptions
) {
  let longest: [DateTime, number, string?] = [{} as any, 0];

  for (const dt of samples) {
    if (!dt.isValid) throw 'invalid datetime';
    const text = dt.toLocaleString(format);
    const width = ctx.measureText(text).width;

    if (width > longest[1]) longest = [dt, width, text];
  }

  return longest[0];
}

// The trick is: widest locals dates depends on months and weeks names only.
// For the time part let's choose the daytime with two digits at each unit. These digits are better contain no narrow 1's.
// Then the widest months (short and long) are found looping thru all 12 months.
// The dates with widest weekdays ((short, long and narrow) are found in 20ths of these months. Then these dates are guaranteed to be the widest
// even if month is rendered as number.
export function find_widest_local_date(
  key: string,
  format: Intl.DateTimeFormatOptions,
  ctx: CanvasRenderingContext2D,
  opts: DateTimeJSOptions
): DateObjectUnits {
  const id = `${format.month}/${format.weekday}`;

  const cached = _widest_dates_cache.get(key);
  if (cached) return cached[id];

  const widest_numeric_date = { year: 2024, month: 12, day: 22, hour: 23, minute: 59, second: 59 };
  const num = DateTime.fromObject(widest_numeric_date, opts);

  function* months_candidates(base: DateTime) {
    for (let i = 1; i <= 12; i++) yield base.set({ month: i });
  }

  const sm = _pick_widest_sample(ctx, months_candidates(num), { month: 'short' });
  const lm = _pick_widest_sample(ctx, months_candidates(num), { month: 'long' });

  function* weekdays_candidates(base: DateTime) {
    for (let i = 22; i < 29; i++) yield base.set({ day: i });
  }

  const sm_sw = _pick_widest_sample(ctx, weekdays_candidates(sm), { weekday: 'short' });
  const sm_lw = _pick_widest_sample(ctx, weekdays_candidates(sm), { weekday: 'long' });
  const sm_nw = _pick_widest_sample(ctx, weekdays_candidates(sm), { weekday: 'narrow' });

  const lm_sw = _pick_widest_sample(ctx, weekdays_candidates(lm), { weekday: 'short' });
  const lm_lw = _pick_widest_sample(ctx, weekdays_candidates(lm), { weekday: 'long' });
  const lm_nw = _pick_widest_sample(ctx, weekdays_candidates(lm), { weekday: 'narrow' });

  // ok now form the month/weekday permutations manually.
  // it's simpler than looping
  const perms: Record<string, DateTime> = {
    'undefined/undefined': num,
    'undefined/short': sm_sw,
    'undefined/long': sm_lw,
    'undefined/narrow': sm_nw,

    'numeric/undefined': num,
    'numeric/short': sm_sw,
    'numeric/long': sm_lw,
    'numeric/narrow': sm_nw,

    '2-digit/undefined': num,
    '2-digit/short': sm_sw,
    '2-digit/long': sm_lw,
    '2-digit/narrow': sm_nw,

    'short/undefined': sm,
    'short/short': sm_sw,
    'short/long': sm_lw,
    'short/narrow': sm_nw,

    'long/undefined': lm,
    'long/short': lm_sw,
    'long/long': lm_lw,
    'long/narrow': lm_nw,
  };

  const result = Object.fromEntries(Object.entries(perms).map(([k, v]) => [k, v.toObject()]));

  _widest_dates_cache.set(key, result);

  return result[id];
}

export function measure_max_label_width(
  format: Intl.DateTimeFormatOptions,
  ctx: CanvasRenderingContext2D,
  opts: DateTimeJSOptions
) {
  const format_key = JSON.stringify(format);

  const dt_key = `${opts.locale || Settings.defaultLocale}/${ctx.font}`;
  const label_key = `${dt_key}/${format_key}`;

  const cached = _widest_labels_cache.get(label_key);
  if (cached) return cached;

  const widest_date = find_widest_local_date(dt_key, format, ctx, opts);

  const dt = DateTime.fromObject(widest_date, opts);
  const label = dt.toLocaleString(format);
  const res = ctx.measureText(label).width;

  _widest_labels_cache.set(label_key, res);
  return res;
}
