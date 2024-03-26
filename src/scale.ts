import { CartesianScaleOptions, Chart, Scale, Tick } from 'chart.js';
import { DeepPartial } from 'chart.js/dist/types/utils';

import { DateTime, DateTimeJSOptions, DateObjectUnits } from 'luxon';

import { DaysTickGenerator, has_bottom, MonoTickGenerator, TickGenerator, YearsTickGenerator } from './ticks';

export interface TimestackScaleOptions extends CartesianScaleOptions {
  timestack: {
    /** Luxon DateTime creation options (zone, locale, etc) */
    datetime: DateTimeJSOptions;

    /** Desired labels density
     * @default 0.5 (total labels width / scale width = 50%)
     */
    density: number;

    /** Maximum labels density
     * @default 0.75 (total labels width / scale width = 75%)
     */
    max_density: number;

    /** Tooltip format options */
    tooltip_format: Intl.DateTimeFormatOptions;

    /** Stick extra bottom tick at min if first [thres * axis_width] part of scale have no bottom ticks.
     * Set false to completely disable the feature
     *
     * @default 0.33 (1/3 of scale width)
     */
    extra_tick_thres: number | false;
    /**
     * Array of ticks generators to override the default ones.
     * NOTE: would be called just once at chart creation
     */
    get_tick_generators: () => TickGenerator[];

    /** Default formatting options to customize the tick generators format style.
     *
     * i.e. {hour12: true, minute: '2-digit'} etc
     *
     * Use if stock generators are ok except these changes,
     * otherwise define get_tick_generators() for complete customization.
     *
     * @default undefined
     */
    format_style: Intl.DateTimeFormatOptions;
  };
}

export const DEF_TOOLTIP_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

export const HMS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};
export const HM: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
};
export const MDAY: Intl.DateTimeFormatOptions = {
  day: 'numeric',
};
export const MON: Intl.DateTimeFormatOptions = {
  month: 'short',
};
export const YEAR: Intl.DateTimeFormatOptions = {
  year: 'numeric',
};

export const YMD: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};
export const YM: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
};
export const MD: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
};

export const DEF_TICK_GENERATORS: TickGenerator[] = [
  // seconds
  new MonoTickGenerator(
    { second: 1, align: 'second', maj_unit: 'minute', fmt: HMS, maj_fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { second: 5, align: 'minute', maj_unit: 'minute', fmt: HMS, maj_fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { second: 10, align: 'minute', maj_unit: 'minute', fmt: HMS, maj_fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { second: 30, align: 'minute', maj_unit: 'minute', fmt: HMS, maj_fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  // minutes
  new MonoTickGenerator(
    { minute: 1, align: 'minute', maj_unit: 'hour', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { minute: 5, align: 'hour', maj_unit: 'hour', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { minute: 10, align: 'hour', maj_unit: 'hour', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { minute: 15, align: 'hour', maj_unit: 'hour', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { minute: 30, align: 'hour', maj_unit: 'hour', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  // hours
  new MonoTickGenerator(
    { hour: 1, align: 'hour', maj_unit: 'day', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { hour: 3, align: 'day', maj_unit: 'day', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { hour: 6, align: 'day', maj_unit: 'day', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  new MonoTickGenerator(
    { hour: 12, align: 'day', maj_unit: 'day', fmt: HM },
    { unit: 'day', short_fmt: MD, long_fmt: YMD }
  ),
  // days
  new MonoTickGenerator(
    { day: 1, align: 'day', maj_unit: 'month', fmt: MDAY },
    { unit: 'month', short_fmt: MON, long_fmt: YM }
  ),
  new DaysTickGenerator({ days: [1, 5, 10, 15, 20, 25], step: 5, fmt: MDAY }, { short_fmt: MON, long_fmt: YM }),
  new DaysTickGenerator({ days: [1, 10, 20], step: 10, fmt: MDAY }, { short_fmt: MON, long_fmt: YM }),
  new DaysTickGenerator({ days: [1, 15], step: 15, fmt: MDAY }, { short_fmt: MON, long_fmt: YM }),
  // months. luxon threats month duration as 30 days in default 'casual' mode
  new MonoTickGenerator({ month: 1, align: 'month', maj_unit: 'year', fmt: MON }, { unit: 'year', short_fmt: YEAR }),
  new MonoTickGenerator({ month: 3, align: 'year', maj_unit: 'year', fmt: MON }, { unit: 'year', short_fmt: YEAR }),
  new MonoTickGenerator({ month: 6, align: 'year', maj_unit: 'year', fmt: MON }, { unit: 'year', short_fmt: YEAR }),
  // years. year duration is 365 days by default
  new YearsTickGenerator(1, { fmt: YEAR }),
  new YearsTickGenerator(5, { fmt: YEAR }),
  new YearsTickGenerator(10, { fmt: YEAR }),
  new YearsTickGenerator(25, { fmt: YEAR }),
  new YearsTickGenerator(50, { fmt: YEAR }),
  new YearsTickGenerator(100, { fmt: YEAR }),
  // fallback )
  new YearsTickGenerator(1000, { fmt: YEAR }),
];

export class TimestackScale extends Scale<TimestackScaleOptions> {
  static id = 'timestack';
  static defaults: DeepPartial<TimestackScaleOptions> = {
    timestack: {
      tooltip_format: DEF_TOOLTIP_FORMAT,
      density: 0.5,
      max_density: 0.75,
      extra_tick_thres: 0.33,
    },
    ticks: {
      // @ts-ignore : this one is needed to prevent the autoSkip purging our ticks.
      // otherwise autoSkip=false is ignored by the core Scale class
      source: '',

      maxRotation: 0,
      autoSkip: false,
    },
  };

  _gens: TickGenerator[];
  _dt_opts: DateTimeJSOptions;

  constructor(cfg: { id: string; type: string; ctx: CanvasRenderingContext2D; chart: Chart }) {
    super(cfg);

    // Init the generators just once taking it from raw config object to workaround the chart.js proxies magic.
    // Chart.js assumes the options are promitive objects and doing some wrong proxy transforms upon our array of classes.
    const opts: TimestackScaleOptions | undefined = cfg.chart?.config.options?.scales?.[cfg.id] as any;
    const gens = opts?.timestack?.get_tick_generators ? opts?.timestack?.get_tick_generators() : DEF_TICK_GENERATORS;
    this._gens = gens;

    if (opts?.timestack.format_style) {
      for (const gen of gens) {
        gen.patch_formats(opts?.timestack.format_style);
      }
    }
  }

  init(options: TimestackScaleOptions) {
    // the proxies resolving likely have a perfomance hit for creating many datetime object, so cache it here
    this._dt_opts = options.timestack.datetime ?? {};

    super.init(options);
  }

  determineDataLimits() {
    let { min, max } = this.getMinMax(false);

    // fallback, shouldnt't happen
    min = isFinite(min) ? min : this._dt_now().startOf('day').toMillis();
    max = isFinite(max) ? max : this._dt_now().endOf('day').toMillis() + 1;
    // copy from the TimeScale. won't hurt to have it
    this.min = Math.min(min, max - 1);
    this.max = Math.max(min + 1, max);
  }

  _dt_from_ts(ts: number) {
    return DateTime.fromMillis(ts, this._dt_opts);
  }

  _dt_from_object(obj: DateObjectUnits) {
    return DateTime.fromObject(obj, this._dt_opts);
  }

  _dt_now() {
    return DateTime.local(this._dt_opts);
  }

  // Choosing the generator with density < max density and closest to the wanted one.
  // Then number of ticks is checked against the maxTicksLimit too
  _choose_gen(range: number) {
    const gens = this._gens;

    const density_limit = this.options.timestack.max_density;
    const want_density = this.options.timestack.density;
    const nticks_limit = this.options.ticks.maxTicksLimit ?? +Infinity;

    const candidates: [TickGenerator, number][] = [];

    for (const gen of gens) {
      const { top, bottom } = gen.estimate(range, this.ctx, this._dt_opts);

      const max_nticks = Math.max(top.nticks, bottom?.nticks ?? 0);

      const top_density = (top.nticks * top.label_width) / this.width;
      const bottom_density = bottom ? (bottom.nticks * bottom.label_width) / this.width : 0;
      const max_density = Math.max(top_density, bottom_density);

      if (max_density <= density_limit && max_nticks <= nticks_limit) {
        candidates.push([gen, Math.abs(max_density - want_density)]);
      }
    }

    if (!candidates.length) return undefined;

    const best = candidates.reduce((prev, cur) => (cur[1] < prev[1] ? cur : prev));
    return best[0];
  }

  _build_ticks() {
    const { min, max } = this;
    const options = this.options.timestack;

    const gen = this._choose_gen(max - min);

    if (!gen) {
      console.warn('Failed to choose the tick generator');
      return [];
    }

    const min_dt = this._dt_from_ts(min);
    const max_dt = this._dt_from_ts(max);
    const now_dt = this._dt_now();

    const prefer_long_bottom = (dt: DateTime) => !dt.hasSame(now_dt, 'year');

    const ticks = gen.create(min_dt, max_dt, prefer_long_bottom);

    if (!gen.bottom || options.extra_tick_thres === false) return ticks;

    // Q&D and a little messy floating label generation.
    // fb stands for the 'first bottom'
    const fb = ticks.find(has_bottom);
    const fb_rel = fb ? (fb.value - min) / (max - min) : undefined;

    if (fb_rel === undefined || fb_rel >= options.extra_tick_thres) {
      const label = gen.format(min_dt, false, true, prefer_long_bottom(min_dt));
      const text = '\u2026' + label[1];
      // need to measure the fit to avoid collision with first_with_bottom
      if (fb_rel === undefined || this.ctx.measureText(text).width * 2 < this.getPixelForDecimal(fb_rel)) {
        ticks.unshift({ value: min, label: ['', text] });
      }
    }

    return ticks;
  }

  buildTicks() {
    // The estimation process involves rendering the sample labels and measuring pixel widths,
    // so the actual canvas font is activated to make the measurements more accurate.
    // Because _resolveTickFontOptions is private method of Scale, it's wrapped in try/catch.
    let font: string | undefined;
    try {
      font = (this as any)._resolveTickFontOptions(0).string;
    } catch {
      console.warn('failed to resolve the font');
    }

    this.ctx.save();
    if (font) this.ctx.font = font;

    const ticks = this._build_ticks();

    this.ctx.restore();
    return ticks;
  }

  getLabelForValue(value: number) {
    return this._dt_from_ts(value).toLocaleString(this.options.timestack.tooltip_format);
  }

  // noop. ticks are already generated in single pass
  generateTickLabels(ticks: Tick[]) {}

  // took these from timescale w/o offsets
  getPixelForValue(value: number | null) {
    const pos = value === null ? NaN : (value - this.min) / (this.max - this.min);
    return this.getPixelForDecimal(pos);
  }
  getValueForPixel(pixel: number) {
    const pos = this.getDecimalForPixel(pixel);
    return this.min + pos * (this.max - this.min);
  }
}
