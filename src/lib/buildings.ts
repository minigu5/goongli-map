export type BuildingId = "gungri" | "geogyeong";

export interface FloorInfo {
  floor: number;
  zone: string; // 존 이름 (예: 물리)
}

export interface BuildingInfo {
  id: BuildingId;
  name: string; // 한글 건물명
  floors: FloorInfo[]; // 위층 → 아래층 순서
}

export const BUILDINGS: BuildingInfo[] = [
  {
    id: "gungri",
    name: "궁리관",
    floors: [
      { floor: 5, zone: "지구과학" },
      { floor: 4, zone: "물리" },
      { floor: 3, zone: "화학" },
      { floor: 2, zone: "생명과학" },
      { floor: 1, zone: "공동기기" },
    ],
  },
  {
    id: "geogyeong",
    name: "거경관",
    floors: [
      { floor: 3, zone: "다용도존" },
      { floor: 2, zone: "미술존" },
      { floor: 1, zone: "음악존" },
    ],
  },
];

export function getBuilding(id: BuildingId): BuildingInfo {
  return BUILDINGS.find((b) => b.id === id)!;
}

export function getFloor(id: BuildingId, floor: number): FloorInfo | undefined {
  return getBuilding(id).floors.find((f) => f.floor === floor);
}

export function buildingName(id: BuildingId): string {
  return getBuilding(id).name;
}

// 과목 목록 (다중 선택)
export const SUBJECTS = ["물리", "화학", "생명", "지구", "공학"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_COLORS: Record<Subject, string> = {
  물리: "#2563eb", // blue
  화학: "#16a34a", // green
  생명: "#dc2626", // red
  지구: "#9333ea", // purple
  공학: "#ea580c", // orange
};
