import React, { useCallback, useEffect, useMemo, useState } from "react";
import { mockChart } from "./../utils/mock";
import Runtime from "./runtime";

export default function ({ data, ...others }) {
  
  let mockData = mockChart(data.type, data);
  if (data.type === "line") {
    mockData = mockData.map((item, index) => {
      return {
        ...item,
        type: "line",
      };
    });
  }

  return <Runtime data={data} {...others} mockData={mockData} />;
}
