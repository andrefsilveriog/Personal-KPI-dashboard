import type { DashboardWidget, WidgetLayout } from "../../types/kpi";

export type DashboardLayoutPreset =
  | "compactKpiStrip"
  | "twoColumns"
  | "threeColumns"
  | "oneLargePlusSmall"
  | "topStripPlusLowerCharts"
  | "mosaic";

export type GridLayoutItem = WidgetLayout & {
  i: string;
};

export const dashboardLayoutPresets: Array<{ value: DashboardLayoutPreset; label: string }> = [
  { value: "compactKpiStrip", label: "Compact KPI strip" },
  { value: "twoColumns", label: "Two columns" },
  { value: "threeColumns", label: "Three columns" },
  { value: "oneLargePlusSmall", label: "One large plus small cards" },
  { value: "topStripPlusLowerCharts", label: "Top strip plus lower charts" },
  { value: "mosaic", label: "Mosaic" }
];

const defaultLayout: WidgetLayout = {
  x: 0,
  y: 0,
  w: 4,
  h: 3,
  minW: 2,
  minH: 2,
  sizePreset: "medium"
};

export function normalizeWidgetLayout(widget: DashboardWidget, index = 0): WidgetLayout {
  return {
    ...defaultLayout,
    x: Number.isFinite(widget.layout.x) ? widget.layout.x : (index % 3) * 4,
    y: Number.isFinite(widget.layout.y) ? widget.layout.y : Math.floor(index / 3) * 3,
    w: widget.layout.w || defaultLayout.w,
    h: widget.layout.h || defaultLayout.h,
    minW: widget.layout.minW ?? defaultLayout.minW,
    minH: widget.layout.minH ?? defaultLayout.minH,
    sizePreset: widget.layout.sizePreset ?? defaultLayout.sizePreset
  };
}

export function widgetsToGridLayout(widgets: DashboardWidget[]): GridLayoutItem[] {
  return widgets.map((widget, index) => ({
    i: widget.id,
    ...normalizeWidgetLayout(widget, index)
  }));
}

export function mergeGridLayoutIntoWidgets(widgets: DashboardWidget[], layoutItems: GridLayoutItem[]): DashboardWidget[] {
  return widgets.map((widget, index) => {
    const layoutItem = layoutItems.find((item) => item.i === widget.id);

    if (!layoutItem) {
      return {
        ...widget,
        layout: normalizeWidgetLayout(widget, index)
      };
    }

    return {
      ...widget,
      layout: {
        ...normalizeWidgetLayout(widget, index),
        x: layoutItem.x,
        y: layoutItem.y,
        w: layoutItem.w,
        h: layoutItem.h,
        minW: layoutItem.minW,
        minH: layoutItem.minH,
        sizePreset: layoutItem.sizePreset
      }
    };
  });
}

function presetLayoutForIndex(preset: DashboardLayoutPreset, index: number): WidgetLayout {
  switch (preset) {
    case "compactKpiStrip":
      return { x: (index % 4) * 3, y: Math.floor(index / 4) * 2, w: 3, h: 2, minW: 2, minH: 2, sizePreset: "small" };
    case "twoColumns":
      return { x: (index % 2) * 6, y: Math.floor(index / 2) * 3, w: 6, h: 3, minW: 3, minH: 2, sizePreset: "medium" };
    case "threeColumns":
      return { x: (index % 3) * 4, y: Math.floor(index / 3) * 3, w: 4, h: 3, minW: 2, minH: 2, sizePreset: "medium" };
    case "oneLargePlusSmall":
      if (index === 0) {
        return { x: 0, y: 0, w: 8, h: 5, minW: 4, minH: 3, sizePreset: "large" };
      }

      return { x: 8, y: (index - 1) * 2, w: 4, h: 2, minW: 2, minH: 2, sizePreset: "small" };
    case "topStripPlusLowerCharts":
      if (index < 3) {
        return { x: index * 4, y: 0, w: 4, h: 2, minW: 2, minH: 2, sizePreset: "small" };
      }

      return { x: ((index - 3) % 2) * 6, y: 2 + Math.floor((index - 3) / 2) * 4, w: 6, h: 4, minW: 3, minH: 3, sizePreset: "large" };
    case "mosaic": {
      const pattern = [
        { x: 0, y: 0, w: 5, h: 4, sizePreset: "large" },
        { x: 5, y: 0, w: 3, h: 2, sizePreset: "small" },
        { x: 8, y: 0, w: 4, h: 3, sizePreset: "medium" },
        { x: 5, y: 2, w: 3, h: 3, sizePreset: "medium" },
        { x: 0, y: 4, w: 6, h: 3, sizePreset: "large" },
        { x: 6, y: 4, w: 6, h: 3, sizePreset: "large" }
      ] as const;
      const item = pattern[index % pattern.length];
      const rowOffset = Math.floor(index / pattern.length) * 7;

      return {
        x: item.x,
        y: item.y + rowOffset,
        w: item.w,
        h: item.h,
        minW: 2,
        minH: 2,
        sizePreset: item.sizePreset
      };
    }
  }
}

export function applyDashboardLayoutPreset(widgets: DashboardWidget[], preset: DashboardLayoutPreset): DashboardWidget[] {
  return widgets.map((widget, index) => ({
    ...widget,
    layout: presetLayoutForIndex(preset, index),
    displayOrder: (index + 1) * 10
  }));
}
