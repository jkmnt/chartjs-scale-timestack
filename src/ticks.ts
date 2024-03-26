import { Tick } from 'chart.js';
import { DateTime, DateTimeUnit, DurationLike, Duration, DurationLikeObject, DateTimeJSOptions } from 'luxon';
import { measure_max_label_width } from './measure';

export interface TopTickSpec {
  fmt: Intl.DateTimeFormatOptions;
  maj_fmt?: Intl.DateTimeFormatOptions;
}

export interface BottomTickSpec {
  short_fmt: Intl.DateTimeFormatOptions;
  long_fmt?: Intl.DateTimeFormatOptions;
}

interface _SeqTick {
  dt: DateTime;
  is_major: boolean;
  with_bottom: boolean;
}

export function has_bottom(tick: Tick) {
  return Array.isArray(tick.label) && tick.label.length > 1;
}

/**
  Base tick generator class.
  Concrete tick generators must implement the *seq method
*/
export class TickGenerator {
  top: TopTickSpec & { size: number };
  bottom?: BottomTickSpec & { size: number };

  /** Generator yielding (possibly infinite) sequence of _SeqTick-s. It's ok to return the ticks
   * before the 'from'
   */
  *seq(from: DateTime): Generator<_SeqTick> {}

  constructor(top: TopTickSpec & { size: number }, bottom?: BottomTickSpec & { size: number }) {
    this.top = top;
    this.bottom = bottom;
  }

  estimate(range: number, ctx: CanvasRenderingContext2D, opts: DateTimeJSOptions, may_be_long: boolean = true) {
    const top = this.top;
    const bottom = this.bottom;

    const normal = measure_max_label_width(top.fmt, ctx, opts);
    const major = top.maj_fmt ? measure_max_label_width(top.maj_fmt, ctx, opts) : 0;
    const top_est = { nticks: range / top.size, label_width: Math.max(normal, major) };

    let bottom_est;

    if (bottom) {
      const short = measure_max_label_width(bottom.short_fmt, ctx, opts);
      const long = may_be_long && bottom.long_fmt ? measure_max_label_width(bottom.long_fmt, ctx, opts) : 0;

      bottom_est = { nticks: range / bottom.size, label_width: Math.max(short, long) };
    }

    return { top: top_est, bottom: bottom_est };
  }

  format(dt: DateTime, is_major: boolean, with_bottom: boolean, prefer_long_bottom: boolean) {
    const top = dt.toLocaleString(is_major && this.top.maj_fmt ? this.top.maj_fmt : this.top.fmt);

    if (!with_bottom || !this.bottom) return top;

    const bottom = dt.toLocaleString(
      prefer_long_bottom && this.bottom.long_fmt ? this.bottom.long_fmt : this.bottom.short_fmt
    );
    return [top, bottom];
  }

  create(from: DateTime, to: DateTime, prefer_long_bottom: (dt: DateTime) => boolean): Tick[] {
    const ticks: Tick[] = [];

    for (const { dt, is_major, with_bottom } of this.seq(from)) {
      if (dt < from) continue;
      if (dt >= to) break;
      ticks.push({
        value: dt.toMillis(),
        major: is_major,
        label: this.format(dt, is_major, with_bottom, prefer_long_bottom(dt)),
      });
    }

    return ticks;
  }

  create_floating(dt: DateTime, pos: 'left' | 'right', prefer_long_bottom: (dt: DateTime) => boolean) {
    const bottom = this.bottom;
    const fmt = bottom ? (prefer_long_bottom(dt) && bottom.long_fmt ? bottom.long_fmt : bottom.short_fmt) : undefined;
    const text = fmt ? dt.toLocaleString(fmt) : '';

    return { value: dt.toMillis(), label: ['', pos === 'left' ? '\u2026' + text : text + '\u2026'] };
  }

  // Convenience method to apply some global changes to formats.
  // Intended to override hour12, numeric => 2-digit etc
  patch_formats(patch: Intl.DateTimeFormatOptions) {
    function apply(dst: any) {
      for (const e of Object.entries(patch)) {
        const k = e[0];
        const v = e[1];
        if (k === 'hour12' && dst.hour) dst.hour12 = v;
        if (dst[k]) dst[k] = e[1];
      }
    }

    apply(this.top.fmt);
    this.top.maj_fmt && apply(this.top.maj_fmt);
    this.bottom?.short_fmt && apply(this.bottom.short_fmt);
    this.bottom?.long_fmt && apply(this.bottom.long_fmt);
  }
}

export class MonoTickGenerator extends TickGenerator {
  step: DurationLike;
  align: DateTimeUnit;
  bottom_unit?: DateTimeUnit;
  maj_unit?: DateTimeUnit;

  constructor(
    top: TopTickSpec & DurationLikeObject & { align: DateTimeUnit; maj_unit?: DateTimeUnit },
    bottom: (BottomTickSpec & { unit: DateTimeUnit }) | undefined
  ) {
    const { fmt, maj_fmt, align, maj_unit, ...top_duration } = top;
    super(
      {
        fmt,
        maj_fmt,
        size: Duration.fromDurationLike(top_duration).toMillis(),
      },
      bottom && {
        ...bottom,
        size: Duration.fromObject({ [bottom.unit]: 1 }).toMillis(),
      }
    );

    this.step = top_duration;
    this.bottom_unit = bottom?.unit;
    this.align = align;
    this.maj_unit = maj_unit;
  }

  *seq(from: DateTime) {
    let dt = from.startOf(this.align);
    while (true) {
      const with_bottom = this.bottom_unit ? dt.startOf(this.bottom_unit).equals(dt) : false;
      const is_major = this.maj_unit ? dt.startOf(this.maj_unit).equals(dt) : false;
      yield { dt, is_major, with_bottom };
      dt = dt.plus(this.step);
    }
  }
}

export class DaysTickGenerator extends TickGenerator {
  days: number[];
  maj_days: number[];
  bottom_days: number[];

  constructor(
    top: TopTickSpec & { days: number[]; step: number; maj_days?: number[] },
    bottom?: BottomTickSpec & { days?: number[] }
  ) {
    super(
      {
        ...top,
        size: top.step * 86400 * 1000,
      },
      bottom && {
        ...bottom,
        size: 30 * 86400 * 1000,
      }
    );

    this.days = top.days;
    this.maj_days = top.maj_days ?? [1];
    this.bottom_days = bottom ? bottom.days ?? [1] : [];
  }

  *seq(from: DateTime) {
    let mdt = from.startOf('month');
    while (true) {
      for (const day of this.days) {
        const dt = mdt.set({ day });
        const is_major = this.maj_days.includes(day);
        const with_bottom = this.bottom_days.includes(day);
        yield { dt, is_major, with_bottom };
      }
      mdt = mdt.plus({ month: 1 });
    }
  }
}

export class YearsTickGenerator extends TickGenerator {
  by_years: number;

  constructor(by_years: number, top: TopTickSpec) {
    super({
      ...top,
      size: by_years * 365 * 86400 * 1000,
    });
    this.by_years = by_years;
  }

  *seq(from: DateTime) {
    const start = ((from.year / this.by_years) | 0) * this.by_years;
    let dt = from.startOf('year').set({ year: start });

    while (true) {
      yield { dt, is_major: false, with_bottom: false };
      dt = dt.plus({ year: this.by_years });
    }
  }
}
