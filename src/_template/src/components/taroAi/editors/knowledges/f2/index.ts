import Area from "./area.js";
import Funnel from "./funnel.js";
import Column from "./column.js";
import Bar from "./bar.js";
import Line from "./line.js";
import Pie from "./pie.js";
import Heatmap from "./heatmap.js";
import Radar from "./radar.js";

const mdMap = {
  AREA: Area,
  FUNNEL: Funnel,
  COLUMN: Column,
  BAR: Bar,
  LINE: Line,
  PIE: Pie,
  HEATMAP: Heatmap,
  RADAR: Radar,
};

export default function getKnowledge(packageName: string, com: string) {
  if (packageName === "f2-for-taro") {
    const upperCom = com.toUpperCase();
    return mdMap[upperCom];
  }
}
