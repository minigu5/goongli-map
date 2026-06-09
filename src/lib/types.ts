import type { BuildingId } from "./buildings";

export interface Item {
  id: string;
  name: string;
  spec: string | null;
  categories: string; // 쉼표(,)로 구분된 카테고리 문자열
  subjects: string[]; // 과목 배열
  building: BuildingId;
  floor: number;
  room: string | null;
  pos_x: number; // 0~1
  pos_y: number; // 0~1
  image_url: string | null;
  image_public_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// 추가/수정 폼 입력값
export interface ItemInput {
  name: string;
  spec: string;
  categories: string;
  subjects: string[];
  building: BuildingId;
  floor: number;
  room: string;
  pos_x: number;
  pos_y: number;
  image_url: string | null;
  image_public_id: string | null;
}
