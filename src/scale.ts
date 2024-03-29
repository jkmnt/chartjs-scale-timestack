import type { CartesianScaleOptions, Tick, Chart } from 'chart.js';
import type { DeepPartial } from 'chart.js/dist/types/utils';
import type { DateTimeJSOptions, DateObjectUnits } from 'luxon';
import type { TickGenerator } from './ticks';

import { Scale } from 'chart.js';
import { DateTime } from 'luxon';

import { DEF_TICK_GENERATORS } from './defgens';

export interface TimestackScaleOptions extends CartesianScaleOptions {
  timestack: {
    /**
     Luxon DateTime creation options (zone, locale, etc)
     */
    datetime: DateTimeJSOptions;

    /**
      Desired labels density _(total labels width / scale width)_
      @default 0.5 (50 %)
     */
    density: number;

    /**
      Maximum labels density
      @default 0.75 (total labels width / scale width = 75%)
     */
    max_density: number;

    /**
      Tooltip format options
      */
    tooltip_format: Intl.DateTimeFormatOptions;

    /**
      Add extra bottom tick at min boundary if first _[thres * axis_width]_ part of scale has no bottom ticks. Set false to completely disable the feature
      @default 0.33 (first 1/3 of scale width)
     */
    left_floating_tick_thres: number | false;

    /**
      Add extra bottom tick at max boundary if last _[thres * axis_width]_ part of scale has no bottom ticks. Set false to completely disable the feature
      @default false
     */
    right_floating_tick_thres: number | false;
    /**
      Factory function returning array of tick generators to replace the default ones. Would be called just once at chart creation
     */
    make_tick_generators: () => TickGenerator[];

    /**
      Formatting options _(Intl.DateTimeFormatOptions)_ to customize the tick generators format style. i.e. `{hour12: true, month: 'long', minute: '2-digit'}` etc. Use if stock generators are ok except these changes, otherwise define make_tick_generators() for complete customization
      @default undefined
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

export class TimestackScale extends Scale<TimestackScaleOptions> {
  static id = 'timestack';
  static defaults: DeepPartial<TimestackScaleOptions> = {
    timestack: {
      tooltip_format: DEF_TOOLTIP_FORMAT,
      density: 0.5,
      max_density: 0.75,
      left_floating_tick_thres: 0.33,
      right_floating_tick_thres: false,
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
    const gens = opts?.timestack?.make_tick_generators ? opts?.timestack?.make_tick_generators() : DEF_TICK_GENERATORS;
    this._gens = gens;

    if (opts?.timestack.format_style) {
      for (const gen of gens) {
        gen.patch_formats(opts?.timestack.format_style);
      }
    }
  }

  init(options: TimestackScaleOptions) {
    // the proxies resolving likely has a perfomance hit for creating many datetime object, so cache it here
    this._dt_opts = options.timestack.datetime ?? {};

    super.init(options);
  }

  determineDataLimits() {
    let { min, max } = this.getMinMax(false);

    // fallback, shouldnt't happen
    min = isFinite(min) ? min : this._dt_now().startOf('day').toMillis();
    max = isFinite(max) ? max : this._dt_now().endOf('day').toMillis() + 1;
    // copy from the TimeScale. won't hurt to have range well-defined
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

  _need_floating_left_tick(ticks_with_bottoms: Tick[]) {
    const thres = this.options.timestack.left_floating_tick_thres;
    if (thres === false) return false;
    if (!ticks_with_bottoms.length) return true;
    const neigh_rel = (ticks_with_bottoms[0].value - this.min) / (this.max - this.min);
    return neigh_rel > thres;
  }

  _need_floating_right_tick(ticks_with_bottoms: Tick[]) {
    const thres = this.options.timestack.right_floating_tick_thres;
    if (thres === false) return false;
    if (!ticks_with_bottoms.length) return true;
    const neigh_rel = (this.max - ticks_with_bottoms[ticks_with_bottoms.length - 1].value) / (this.max - this.min);
    return neigh_rel > thres;
  }

  _build_ticks() {
    const { min, max } = this;

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

    if (!gen.bottom) return ticks;

    const ticks_with_bottoms = ticks.filter((t) => Array.isArray(t) && t.label.length > 1);

    if (this._need_floating_left_tick(ticks_with_bottoms)) {
      let tick;
      tick = gen.create_floating(min_dt, 'left', prefer_long_bottom);

      if (ticks_with_bottoms.length) {
        // need to check the fit with neighbour
        const neigh = ticks_with_bottoms[0];
        const width = this.ctx.measureText(tick.label[1]).width;
        // can't use the getPixelForValue here, the margins are not configured yet.
        // estimating the range manually with x2 safe factor
        const space = ((neigh.value - this.min) * this.width) / (this.max - this.min);
        if (width * 2 > space) tick = undefined;
      }

      if (tick) ticks.unshift(tick);
    }

    if (this._need_floating_right_tick(ticks_with_bottoms)) {
      let tick;
      tick = gen.create_floating(max_dt, 'right', prefer_long_bottom);

      if (ticks_with_bottoms.length) {
        const neigh = ticks_with_bottoms[ticks_with_bottoms.length - 1];
        const width = this.ctx.measureText(tick.label[1]).width;
        const space = ((this.max - neigh.value) * this.width) / (this.max - this.min);
        if (width * 2 > space) tick = undefined;
      }

      if (tick) ticks.push(tick);
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
