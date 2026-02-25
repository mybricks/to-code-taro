import React, { useCallback, useEffect, useMemo, useState } from "react";
import { mockLineChart } from './../utils/mock'
import Runtime from './runtime'

export default function ({ data, ...others }) {
  return <Runtime data={data} {...others} mockData={mockLineChart(data.config)} />;
}

