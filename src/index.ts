import type { CartesianScaleTypeRegistry, RadialScaleTypeRegistry } from 'chart.js';
import type { TimestackScaleOptions } from './scale';

import { Chart } from 'chart.js';
import { TimestackScale } from './scale';

declare module 'chart.js' {
  export interface ScaleTypeRegistry extends CartesianScaleTypeRegistry, RadialScaleTypeRegistry {
    timestack: {
      options: TimestackScaleOptions;
    };
  }
}

Chart.register(TimestackScale);

export {
  TimestackScale,
  TimestackScaleOptions,
  DEF_TOOLTIP_FORMAT,
  DEF_TICK_GENERATORS,
  HM,
  HMS,
  MD,
  MDAY,
  MON,
  YEAR,
  YM,
  YMD,
} from './scale';

export { TickGenerator, DaysTickGenerator, YearsTickGenerator, has_bottom } from './ticks';
