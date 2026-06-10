import type { BuildingId } from "./buildings";

import gungri5 from "./floorplans/gungri-5";
import gungri4 from "./floorplans/gungri-4";
import gungri3 from "./floorplans/gungri-3";
import gungri2 from "./floorplans/gungri-2";
import gungri1 from "./floorplans/gungri-1";
import geogyeong3 from "./floorplans/geogyeong-3";
import geogyeong2 from "./floorplans/geogyeong-2";
import geogyeong1 from "./floorplans/geogyeong-1";

export type CellKind = "room" | "service" | "corridor" | "stair";

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  code?: string;
  kind?: CellKind;
}

export interface FloorPlan {
  ratio: number;
  cells: Cell[];
}

function a(attrs: string, name: string): string | undefined {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function parse(svg: string): FloorPlan {
  const ratio = parseFloat(svg.match(/data-ratio="([^"]+)"/)![1]);
  const cells: Cell[] = [];
  const re = /<rect([^/]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const s = m[1];
    const kind = a(s, "data-kind") as CellKind | undefined;
    cells.push({
      x: parseFloat(a(s, "x") ?? "0"),
      y: parseFloat(a(s, "y") ?? "0"),
      w: parseFloat(a(s, "w") ?? "0"),
      h: parseFloat(a(s, "h") ?? "0"),
      label: a(s, "data-label") ?? "",
      code: a(s, "data-code"),
      kind: kind || undefined,
    });
  }
  return { ratio, cells };
}

const PLANS: Record<string, FloorPlan> = {
  "gungri-5": parse(gungri5),
  "gungri-4": parse(gungri4),
  "gungri-3": parse(gungri3),
  "gungri-2": parse(gungri2),
  "gungri-1": parse(gungri1),
  "geogyeong-3": parse(geogyeong3),
  "geogyeong-2": parse(geogyeong2),
  "geogyeong-1": parse(geogyeong1),
};

export function getFloorPlan(
  building: BuildingId,
  floor: number
): FloorPlan | undefined {
  return PLANS[`${building}-${floor}`];
}

export function getCellAt(plan: FloorPlan, x: number, y: number): Cell | null {
  const px = x * 100, py = y * 100;
  for (const c of plan.cells) {
    if (px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h) return c;
  }
  return null;
}

export function getRoomAt(plan: FloorPlan, x: number, y: number): string | null {
  const px = x * 100, py = y * 100;
  for (const c of plan.cells) {
    if (c.kind && c.kind !== "room") continue;
    if (px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h) return c.label || null;
  }
  for (const c of plan.cells) {
    if (px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h) return c.label || null;
  }
  return null;
}
