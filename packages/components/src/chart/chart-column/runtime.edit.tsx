import React, { useCallback, useEffect, useMemo, useState } from "react";
import { mockChart } from './../utils/mock'
import Runtime from './runtime'

export default function ({ data, ...others }) {
  return <Runtime data={data} {...others} mockData={mockChart(data.type, data)} />;
}

