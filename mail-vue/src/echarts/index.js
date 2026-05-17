
import * as echarts from 'echarts/core';

import { BarChart,PieChart,LineChart,GaugeChart} from 'echarts/charts';
// Import tooltip, grid and other components (suffix: Component)
import {
    TooltipComponent,
    GridComponent,
} from 'echarts/components';
// Label auto layout, global transition animations, etc.
// Import Canvas renderer — either CanvasRenderer or SVGRenderer is required
import { CanvasRenderer } from 'echarts/renderers';
import { LegendComponent } from 'echarts/components';
// Register required components
echarts.use([
    GaugeChart,
    LegendComponent,
    PieChart,
    TooltipComponent,
    GridComponent,
    BarChart,
    LineChart,
    CanvasRenderer
]);

export default echarts