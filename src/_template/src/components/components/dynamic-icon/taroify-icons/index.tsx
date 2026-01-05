import { Icon } from "@taroify/icons";
import allIcons from "./icons";

export default function ({ name, ...props }) {
  if (!name || !allIcons[name]) {
    return <Icon name={'Plus'} {...props} />;
  }

  return <Icon name={name} {...props} />;
}
