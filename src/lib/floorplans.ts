import type { BuildingId } from "./buildings";

export type CellKind = "room" | "service" | "corridor" | "stair";

export interface Cell {
  x: number; // 0~100 (%)
  y: number; // 0~100 (%)
  w: number;
  h: number;
  label: string;
  code?: string; // 호실 번호
  kind?: CellKind;
}

export interface FloorPlan {
  ratio: number; // 가로/세로 비율
  cells: Cell[];
}

const LABEL_W = 9; // 좌측 존 라벨 폭(%)

interface Spec {
  w: number;
  label: string;
  code?: string;
  kind?: CellKind;
  stack?: [Omit<Spec, "w" | "stack">, Omit<Spec, "w" | "stack">];
}

// 좌측 라벨 + 상/하 2행으로 구성되는 정형 평면도(궁리관) 빌더
function twoRow(ratio: number, top: Spec[], bottom: Spec[]): FloorPlan {
  const cells: Cell[] = [];

  function layRow(specs: Spec[], y: number, h: number) {
    const total = specs.reduce((s, c) => s + c.w, 0);
    let x = LABEL_W;
    const span = 100 - LABEL_W;
    for (const s of specs) {
      const w = (s.w / total) * span;
      if (s.stack) {
        cells.push({
          x,
          y,
          w,
          h: h / 2,
          label: s.stack[0].label,
          code: s.stack[0].code,
          kind: s.stack[0].kind ?? "service",
        });
        cells.push({
          x,
          y: y + h / 2,
          w,
          h: h / 2,
          label: s.stack[1].label,
          code: s.stack[1].code,
          kind: s.stack[1].kind ?? "service",
        });
      } else {
        cells.push({ x, y, w, h, label: s.label, code: s.code, kind: s.kind });
      }
      x += w;
    }
  }

  layRow(top, 0, 50);
  layRow(bottom, 50, 50);
  return { ratio, cells };
}

const ST = (a: string, b: string): Spec["stack"] => [
  { label: a, kind: "service" },
  { label: b, kind: "service" },
];

// ───────────── 궁리관 ─────────────
const gungri5 = twoRow(
  4.4,
  [
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 0.7, label: "남 WC", kind: "service" },
    { w: 0.9, label: "", stack: ST("창고", "승강기") },
    { w: 1.3, label: "지구과학교과공동연구실", code: "507" },
    { w: 1.4, label: "암석박편실", code: "508" },
    { w: 0.5, label: "배관실", kind: "service" },
    { w: 1.1, label: "지구과학실험준비2실", code: "509" },
    { w: 1.6, label: "지구과학강의실 1", code: "510" },
    { w: 1.6, label: "지구과학실험실 1", code: "511" },
    { w: 1.1, label: "지구과학실험준비1실", code: "512" },
    { w: 0.6, label: "여 WC", kind: "service" },
  ],
  [
    { w: 0.95, label: "지구과학교과연구실1", code: "501" },
    { w: 2.6, label: "융합과학 실험실 2", code: "502" },
    { w: 1.7, label: "융합과학강의실", code: "503" },
    { w: 1.7, label: "지구과학강의실 2", code: "504" },
    { w: 2.2, label: "지구과학실험실 2", code: "505" },
    { w: 1.0, label: "지구과학교과연구실 2", code: "506" },
    { w: 0.6, label: "계단", kind: "stair" },
  ]
);

const gungri4 = twoRow(
  6.0,
  [
    { w: 0.8, label: "계단", kind: "stair" },
    { w: 0.8, label: "남 WC", kind: "service" },
    { w: 0.9, label: "", stack: ST("창고", "승강기") },
    { w: 1.2, label: "물리영상분석실", code: "407" },
    { w: 1.3, label: "물리실험기기실", code: "408" },
    { w: 0.5, label: "배관실", kind: "service" },
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 1.4, label: "물리강의실 2", code: "409" },
    { w: 2.0, label: "물리 실험실 2", code: "410" },
    { w: 1.2, label: "광학실험실", code: "411" },
    { w: 0.6, label: "여 WC", kind: "service" },
  ],
  [
    { w: 1.0, label: "물리시뮬레이션실", code: "401" },
    { w: 2.2, label: "물리 실험실 3", code: "402" },
    { w: 1.8, label: "물리 교과연구실", code: "403" },
    { w: 1.6, label: "물리 강의실 1", code: "404" },
    { w: 2.0, label: "물리 실험실 1", code: "405" },
    { w: 1.1, label: "실험준비실", code: "406" },
    { w: 0.7, label: "계단", kind: "stair" },
  ]
);

const gungri3 = twoRow(
  6.1,
  [
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 0.7, label: "남 WC", kind: "service" },
    { w: 0.85, label: "", stack: ST("창고", "승강기") },
    { w: 1.0, label: "도서관 연결통로", kind: "corridor" },
    { w: 1.6, label: "나노특성화연구실", code: "306" },
    { w: 0.5, label: "배관실", kind: "service" },
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 2.0, label: "화학강의실 1", code: "307" },
    { w: 2.0, label: "화학실험실 1", code: "308" },
    { w: 1.1, label: "화학실험1준비실", code: "309" },
    { w: 0.6, label: "여 WC", kind: "service" },
  ],
  [
    { w: 1.0, label: "공통과학실험준비실" },
    { w: 2.6, label: "융합과학실험실 1", code: "301" },
    { w: 2.0, label: "화학 교과연구실", code: "302" },
    { w: 1.7, label: "화학 강의실 2", code: "303" },
    { w: 2.2, label: "화학 실험실 2", code: "304" },
    { w: 1.1, label: "화학실험2준비실", code: "305" },
    { w: 0.6, label: "계단", kind: "stair" },
  ]
);

const gungri2 = twoRow(
  5.5,
  [
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 0.7, label: "남 WC", kind: "service" },
    { w: 0.9, label: "", stack: ST("생물배양실3", "승강기") },
    { w: 1.0, label: "본관 연결통로", kind: "corridor" },
    { w: 1.6, label: "생명과학기자재실", code: "205" },
    { w: 0.5, label: "배관실", kind: "service" },
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 1.0, label: "생물배양실1", code: "206" },
    { w: 1.0, label: "생물배양실2", code: "207" },
    { w: 1.4, label: "생명과학강의실1", code: "208" },
    { w: 1.7, label: "생명과학강의실 2", code: "209" },
    { w: 0.6, label: "여 WC", kind: "service" },
  ],
  [
    { w: 1.0, label: "거경관 연결통로", kind: "corridor" },
    { w: 3.0, label: "생명과학 실험실 1", code: "201" },
    { w: 2.0, label: "생명과학실험준비실·교과연구실", code: "202" },
    { w: 2.6, label: "생명과학 실험실 2", code: "203" },
    { w: 1.4, label: "입지관 연결통로", kind: "corridor" },
    { w: 0.6, label: "계단", kind: "stair" },
  ]
);

const gungri1 = twoRow(
  4.0,
  [
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 0.7, label: "남 WC", kind: "service" },
    { w: 0.9, label: "", stack: ST("창고", "승강기") },
    { w: 2.4, label: "원격화상강의실 1", code: "106" },
    { w: 0.5, label: "배관실", kind: "service" },
    { w: 0.7, label: "계단", kind: "stair" },
    { w: 1.5, label: "자율연구실(거경)", code: "107" },
    { w: 1.2, label: "배양실4(궁리)", code: "108" },
    { w: 1.0, label: "자료검색실", code: "109" },
    { w: 1.3, label: "전계방사전자현미경실", code: "110" },
    { w: 0.6, label: "여 WC", kind: "service" },
  ],
  [
    { w: 1.9, label: "풍동실험실", code: "101" },
    { w: 1.1, label: "인쇄실2", code: "102" },
    { w: 1.5, label: "인쇄실1", code: "103" },
    { w: 1.6, label: "현관", kind: "corridor" },
    { w: 1.8, label: "과학교육부", code: "104" },
    { w: 2.4, label: "공동기기센터", code: "105" },
    { w: 0.6, label: "계단", kind: "stair" },
  ]
);

// ───────────── 거경관 (비정형: 절대 좌표) ─────────────
const geo3: FloorPlan = {
  ratio: 5.2,
  cells: [
    { x: LABEL_W, y: 0, w: 29, h: 60, label: "체력단련실" },
    { x: LABEL_W + 29, y: 0, w: 8, h: 30, label: "배관실", kind: "service" },
    { x: LABEL_W + 29, y: 30, w: 8, h: 30, label: "창고", kind: "service" },
    { x: LABEL_W + 37, y: 0, w: 7, h: 60, label: "계단", kind: "stair" },
    { x: LABEL_W + 44, y: 0, w: 22, h: 40, label: "메이커 연구실" },
    { x: 91, y: 0, w: 9, h: 30, label: "계단", kind: "stair" },
    { x: LABEL_W + 37, y: 60, w: 14, h: 40, label: "여 WC", kind: "service" },
    { x: LABEL_W + 44, y: 40, w: 38, h: 50, label: "상상나래" },
    { x: 91, y: 60, w: 9, h: 40, label: "연구실" },
  ],
};

const geo2: FloorPlan = {
  ratio: 5.0,
  cells: [
    { x: LABEL_W, y: 0, w: 16, h: 55, label: "미술실1" },
    { x: LABEL_W + 16, y: 0, w: 16, h: 55, label: "미술실2" },
    { x: LABEL_W + 32, y: 0, w: 8, h: 27, label: "배관실", kind: "service" },
    { x: LABEL_W + 32, y: 27, w: 8, h: 28, label: "창고", kind: "service" },
    { x: LABEL_W + 40, y: 0, w: 7, h: 55, label: "계단", kind: "stair" },
    { x: LABEL_W + 47, y: 0, w: 18, h: 55, label: "3D 디자인실" },
    { x: LABEL_W + 65, y: 0, w: 17, h: 55, label: "아두이노실" },
    { x: 91, y: 0, w: 9, h: 55, label: "계단", kind: "stair" },
    { x: LABEL_W, y: 55, w: 8, h: 22, label: "미술과", kind: "service" },
    { x: LABEL_W, y: 77, w: 8, h: 23, label: "음악과", kind: "service" },
    { x: LABEL_W + 8, y: 55, w: 14, h: 45, label: "연구실" },
    { x: LABEL_W + 40, y: 55, w: 7, h: 45, label: "남 WC", kind: "service" },
    { x: LABEL_W + 47, y: 55, w: 18, h: 45, label: "휴게실" },
    { x: LABEL_W + 65, y: 55, w: 26, h: 45, label: "3D 프린터실" },
  ],
};

const geo1: FloorPlan = {
  ratio: 5.0,
  cells: [
    { x: LABEL_W + 13, y: 0, w: 20, h: 100, label: "음 악 실" },
    { x: LABEL_W, y: 55, w: 13, h: 45, label: "보컬연습실" },
    { x: LABEL_W + 33, y: 0, w: 13, h: 45, label: "밴드실" },
    { x: LABEL_W + 46, y: 0, w: 6, h: 22, label: "배관실", kind: "service" },
    { x: LABEL_W + 52, y: 0, w: 7, h: 45, label: "계단", kind: "stair" },
    { x: LABEL_W + 33, y: 45, w: 19, h: 55, label: "악기보관실" },
    { x: LABEL_W + 52, y: 45, w: 7, h: 55, label: "여 WC", kind: "service" },
    { x: LABEL_W + 59, y: 0, w: 16, h: 100, label: "메이커스페이스 실습실" },
    { x: LABEL_W + 75, y: 0, w: 11, h: 100, label: "메이커스페이스" },
    { x: 95, y: 0, w: 5, h: 45, label: "계단", kind: "stair" },
  ],
};

const PLANS: Record<string, FloorPlan> = {
  "gungri-5": gungri5,
  "gungri-4": gungri4,
  "gungri-3": gungri3,
  "gungri-2": gungri2,
  "gungri-1": gungri1,
  "geogyeong-3": geo3,
  "geogyeong-2": geo2,
  "geogyeong-1": geo1,
};

export function getFloorPlan(
  building: BuildingId,
  floor: number
): FloorPlan | undefined {
  return PLANS[`${building}-${floor}`];
}
