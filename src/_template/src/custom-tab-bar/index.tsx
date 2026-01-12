import React, { useCallback, useMemo, useState, useEffect } from "react";
import cx from "classnames";
import * as Taro from "@tarojs/taro";
import { View, Image } from "@tarojs/components";
import DynamicIcon from "../components/components/dynamic-icon";
import css from "./style.less";

import tabBarJson from "./mybricks/tabbar-config";
import { tabbarIns } from "./utils/tabbar";

tabbarIns.initWithLength(tabBarJson.length);

function CustomTabBar() {
  const [configList, setConfigList] = useState(tabbarIns.list);

  const switchTab = useCallback((url) => {
    Taro.switchTab({ url: `/${url}` });
  }, []);

  useEffect(() => {
    tabbarIns.eventEmitter.addEventListner("change", (list) => {
      setConfigList(list.map((t) => t));
    });
  }, []);

  const tabList = useMemo(() => {
    return tabBarJson.map((item, index) => {
      const config = configList?.[index] ?? {};
      return {
        ...item,
        ...config,
      };
    });
  }, [tabBarJson, configList]);

  // 故意的只渲染一次，只在加载的时候渲染，符合预期
  const currentRoute = useMemo(() => {
    let pages = Taro.getCurrentPages();
    return pages[pages.length - 1].route;
  }, []);

  const iconRender = (itemData, isSelected) => {
    let useImgIcon = isSelected
      ? itemData.selectedIconUseImg !== false
      : itemData.normalIconUseImg !== false;
    let icon = isSelected ? itemData.selectedIcon : itemData.normalIcon;

    let iconStyle = isSelected
      ? itemData.selectedFontIconStyle
      : itemData.normalFontIconStyle;

    let imgIcon = isSelected
      ? itemData.selectedIconPath
      : itemData.normalIconPath;

    let imgIconStyle = isSelected
      ? itemData.selectedIconStyle
      : itemData.normalIconStyle;

    let iconSlotCx = cx({
      ["iconSlot"]: true,
    });

    let formatText = "";
    if (itemData.active) {
      switch (true) {
        case typeof parseFloat(itemData?.activeText) === "number":
          if (itemData?.activeText > 0 && itemData?.activeText < 100) {
            formatText = itemData?.activeText;
          } else if (itemData?.activeText > 100) {
            formatText = "99+";
          }
          break;
        case typeof itemData.activeText === "string": {
          formatText =
            itemData?.activeText.length > 3
              ? `${itemData?.activeText.slice(0, 2)}...`
              : itemData?.activeText;
          break;
        }
      }
    }
    return (
      <View className={iconSlotCx}>
        {useImgIcon ? (
          <Image
            style={{
              display: "block",
              width: "22px",
              height: "22px",
              ...imgIconStyle,
            }}
            src={imgIcon}
          />
        ) : (
          <DynamicIcon
            className={css.fontIcon}
            name={icon}
            size={iconStyle?.fontSize}
            color={iconStyle?.color}
          />
        )}
        {itemData.active && (
          <View className={`badge ${!formatText ? "small" : "normal"}`}>
            {formatText}
          </View>
        )}
      </View>
    );
  };

  const $tabBars = useMemo(() => {
    return tabList.map((raw, index) => {
      let pagePath = raw.pagePath;

      let isSelected = pagePath === currentRoute;

      let textStyle = isSelected ? raw.selectedTextStyle : raw.normalTextStyle;
      let backgroundStyle = isSelected
        ? raw.selectedBackgroundStyle
        : raw.normalBackgroundStyle;

      return (
        <View
          className={css.item}
          key={index}
          onClick={() => {
            switchTab(raw.pagePath);
          }}
          style={{ ...backgroundStyle }}
        >
          {iconRender(raw, isSelected)}

          {raw.text && (
            <View className={css.textSlot} style={{ ...textStyle }}>
              {raw.text}
            </View>
          )}
        </View>
      );
    });
  }, [tabList, currentRoute]);

  return (
    <View className={css.tabBar}>
      <View className={css.items}>{$tabBars}</View>
      <View className={css.safearea}></View>
    </View>
  );
}

export default CustomTabBar;
CustomTabBar.options = {
  addGlobalClass: true,
};
