export interface Style {
  layout?: "smart" | "flex-column" | "flex-row" | {
    display?: string;
    position?: string;
    flexDirection?: string;
    alignItems?: string;
    justifyContent?: string;
    flexWrap?: string;
    rowGap?: number;
    columnGap?: number;
  };
  width?: string | number;
  height?: string | number;
  styleAry?: Array<{
    selector: string;
    css: Record<string, any>;
  }>;
  // slots 在运行时可能动态添加到 style 中，用于存储插槽的样式信息
  slots?: Record<string, {
    layout?: string | object;
    [key: string]: any;
  }>;
  [key: string]: any;
}

