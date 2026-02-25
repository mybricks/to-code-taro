import SystemIcons from "./icons";
import { View } from "@tarojs/components";
import css from "./index.less";

type DynamicIconProps = {
  name: string;
  size?: number;
  color?: string;
  className?: string;
};

export default function (props: DynamicIconProps) {
  const { size = 24, color = "#000", name = "HM_plus", className = "" } = props;
  return (
    <View
      className={`${css.hmIcon} ${className}`}
      style={{ fontSize: size, color }}
    >
      {SystemIcons[name] || SystemIcons["HM_plus"]}
    </View>
  );
}
