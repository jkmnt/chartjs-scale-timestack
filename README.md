# chartjs-scale-timestack

## Overview

This custom scale adds the new timestack axis to Chart.js.

Timestack formats time in two stacked rows. Top row shows the fine ticks while bottom row
shows the context.
Timestack tries hard to choose the ticks looking _nice for humans_, i.e. `14:00`, `14:30`, `15:00`, `15:30` in hourly view and `1`, `5`, `10`, `15`, `25` days of the month in daily view.

|                      |                      |
| -------------------- | -------------------- |
| ![](images/cap2.png) | ![](images/cap1.png) |
| ![](images/cap3.png) | ![](images/cap4.png) |
| ![](images/cap5.png) | ![](images/cap6.png) |

[Demo](https://raw.githubusercontent.com/jkmnt/chartjs-scale-timestack/main/demo/index.html)

## Installation

Timestack uses [Luxon](https://moment.github.io/luxon/) for locale-aware time formatting.
You **do not** need to include [chartjs-adapter-luxon](https://github.com/chartjs/chartjs-adapter-luxon) for it to work.

### npm

```
npm install luxon chartjs-scale-timestack --save
```

```javascript
import { Chart } from 'chart.js';
import 'chartjs-scale-timestack';
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-scale-timestack/dist/chartjs-scale-timestack.min.js"></script>
```

Timestack functions are exposed via global `_timestack` object.

## Usage

```javascript
new Chart(ctx, {
  options: {
    scales: {
      x: {
        type: 'timestack',
      },
    },
  },
  ...
});
```

Note:

- The dataset points must be in `{x, y}` format with millisecond timestamps. X-values are not parsed.

  ```javascript
  const dataset = {
    data: [
        {x: 1711537965000, y: 1},
        {x: 1711537973000, y: 2},
        ...
    ]
  }
  ```

- X-values as labels are not supported. Use stock `time` scale for these.
- Bar charts with offset gridlines are not supported. Use `time` scale for these too.
- Custom tick formatting `callback` is ignored.
- Using rotated ticks is not recommended. Timestack sets `maxTickRotation` = 0 by default.
- Ticks `autoSkip` options are not respected. Timestack bypasses the autoSkip algorithm.
- `ticks.maxTicksLimit` is respected. Timestack will ignore the ticks sequences violating it.

## Options

Namespace: `options.scales[id].timescale`

| Name                      | Default                         | Description                                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| datetime                  | {}                              | Luxon DateTime creation options (zone, locale, etc)                                                                                                                                                                                                                                   |
| density                   | 0.5                             | Desired labels density _(total labels width / scale width)_                                                                                                                                                                                                                           |
| max_density               | 0.75                            | Maximum labels density                                                                                                                                                                                                                                                                |
| tooltip_format            | something sane                  | Tooltip format options _(Intl.DateTimeFormatOptions)_                                                                                                                                                                                                                                 |
| left_floating_tick_thres  | 0.33 (first 1/3 of scale width) | Add extra bottom tick at min boundary if first _[thres * axis_width]_ part of scale has no bottom ticks. Set false to completely disable the feature                                                                                                                                  |
| right_floating_tick_thres | false                           | Add extra bottom tick at max boundary if last _[thres * axis_width]_ part of scale has no bottom ticks. Set false to completely disable the feature                                                                                                                                   |
| make_tick_generators      |                                 | Factory function returning array of tick generators to replace the default ones. Would be called just once at chart creation                                                                                                                                                          |
| format_style              |                                 | Formatting options _(Intl.DateTimeFormatOptions)_ to customize the tick generators format style. i.e. `{hour12: true, month: 'long', minute: '2-digit'}` etc. Use it if stock generators are ok except these changes, otherwise define make_tick_generators() for complete customization |
