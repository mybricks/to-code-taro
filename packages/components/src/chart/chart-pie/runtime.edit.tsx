import React, { useCallback, useEffect, useMemo, useState } from "react";
import { mockPieChart } from './../utils/mock'
import Runtime from './runtime'

export default function ({ data, ...others }) {
  return <Runtime data={data} {...others} mockData={mockPieChart(data.type, data)} />;
}

