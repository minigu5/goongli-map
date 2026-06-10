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

// 과목 목록
export const SUBJECTS = ["물리", "화학", "생명", "지구", "공학"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_COLORS: Record<Subject, string> = {
  물리: "#2563eb",
  화학: "#16a34a",
  생명: "#dc2626",
  지구: "#9333ea",
  공학: "#ea580c",
};

// 층별 핀 색상 (궁리관 기준)
export const FLOOR_COLORS: Record<number, string> = {
  5: "#7c3aed", // 지구과학 - violet
  4: "#2563eb", // 물리 - blue
  3: "#059669", // 화학 - emerald
  2: "#dc2626", // 생명과학 - red
  1: "#d97706", // 공동기기 - amber
};

// 층 → 과목 자동 매핑 (subjects 필드 자동 부여용)
export const FLOOR_SUBJECTS: Record<number, string[]> = {
  5: ["지구"],
  4: ["물리"],
  3: ["화학"],
  2: ["생명"],
  1: ["물리", "화학", "생명", "지구"],
};
