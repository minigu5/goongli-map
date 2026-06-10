# 궁리맵 (Science Map)

대구과학고등학교 **궁리관**·**거경관**의 실험 용품을 빠르게 찾기 위한 지도 웹사이트 **"궁리맵"**.
학생들이 위키처럼 자율적으로 실험 용품을 지도에 추가·수정·이동할 수 있다.

- **GitHub**: https://github.com/minigu5/goongli-map
- **Firebase 프로젝트**: `goongli-map`
- **Cloudinary Cloud**: `duz2xx21s` (upload preset: `goongli-map`)

---

## 1. 핵심 목표

- 실험 용품을 **두 가지 방법**으로 빠르게 찾는다.
  1. **검색**: 이름 / 규격 / 카테고리 / 과목 / 위치(건물·층·방 이름) 중 **하나라도** 일치하면 결과에 표시 (OR 검색).
  2. **지도 탐색**: 가운데 큰 지도를 직접 보며 찾기. 휠 확대/축소, 드래그 이동, 층/건물 전환.
- 학생들이 **위키처럼** 자율적으로 용품을 추가하고, 다른 학생이 추가한 것도 위치 변경·내용 수정 가능.
- 단, **수정은 학교 구글 계정 로그인 후 "수정 모드"에서만** 가능. 누구나 **열람**은 가능.

---

## 2. 대상 건물 및 층 구성

PDF(`2025학년도 신입생 교육 자료집.pdf`)의 "각 실 배치도"를 기준으로 한다.
**궁리관·거경관 두 건물만** 사용한다. (본관동, 입지관은 제외)

### 궁리관 (5층)
| 층 | 존(zone) |
|---|---|
| 5층 | 지구과학 |
| 4층 | 물리 |
| 3층 | 화학 |
| 2층 | 생명과학 |
| 1층 | 공동기기 |

### 거경관 (3층)
| 층 | 존(zone) |
|---|---|
| 3층 | 다용도존 |
| 2층 | 미술존 |
| 1층 | 음악존 |

---

## 3. 기본 지도 (코드로 생성)

- 지도는 **이미지 크롭이 아니라 코드로 직접 그린다.** (이미지 파일 의존성 없음)
- **데이터**: `src/lib/floorplans/` 폴더에 층별 SVG 문자열 파일(`gungri-5.ts` 등 8개)로 분리 저장.
  - 각 파일: `<svg data-ratio="..."><rect x y w h data-label data-kind data-code/>...</svg>` 형식의 문자열 export.
  - `src/lib/floorplans.ts`가 이를 import해 파싱 → `FloorPlan` 객체 생성 (로직만 담당, ~70줄).
  - 셀 종류: `room`(방) / `service`(WC·창고·배관실) / `stair`(계단) / `corridor`(연결통로).
  - `getRoomAt(plan, x, y)` 함수: 0~1 좌표를 받아 해당 셀 이름을 반환 (핀 추가 시 교실 자동 인식).
  - **평면도 수정 시**: `src/lib/floorplans/` 폴더의 해당 층 파일만 편집. `floorplans.ts`는 건드리지 않아도 됨.
- **렌더링**: `src/components/FloorMap.tsx` 가 좌표 데이터를 절대배치 `<div>` 로 그림.
  - 좌측 여백 없음 (LABEL_W = 0). 상/하 두 행 사이에 **복도 띠** (amber-50 배경) 가 있다.
  - 방 셀은 **빈 박스**로만 표시. 외곽 테두리·존 라벨 없음.
  - `stair` 셀: 계단 측면 실루엣 SVG 아이콘 (화살표 없음).
  - `service` 셀: 라벨에 따라 아이콘 자동 선택.
    - `WC` / `화장실` → 변기 실루엣, `창고` → 상자 아이콘, `승강기` → 엘리베이터 아이콘.
  - 수정 모드에서 **방 셀(room)에만 핀 추가 가능**. service·stair·corridor 클릭 시 `not-allowed` 커서.
  - 방 이름은 `MapView.tsx` 가 건물 **위(상단 행)·아래(하단 행) 외부 영역**에 표시.
    - 계단·화장실·복도(service/stair/corridor) 라벨은 제외. `whiteSpace: nowrap`으로 한 줄 고정.
  - 텍스트는 컨테이너 쿼리 단위(`cqw`)로 지정 → 확대/축소 시 함께 스케일.
- 각 지도 위에 실험 용품을 **직사각형 핀**으로 표시한다(0~1 상대 좌표).
  - **수납장 그룹핑**: 같은 `pos_x`/`pos_y`에 놓인 아이템들은 하나의 수납장으로 묶인다.
    - 수납장 내 아이템은 원래 박스(pin_h)를 아이템 수로 **세로 등분**하여 슬라이스로 표시.
    - 각 슬라이스에 이름 5글자를 폰트 `0.1cqw`로 가운데 정렬해 표시.
    - 드래그 시 수납장 전체가 이동한다.
  - 핀 기본 크기: **가로 6px × 세로 3px**. 과목별 파스텔 색상으로 구분 (지배적 과목 기준).
  - 핀 크기(`pin_w`, `pin_h`)는 Firestore에 저장되며 폼에서 편집 가능.
- **확대/이동**: 초기 스케일 = `minScale` (층 전체가 뷰포트에 꽉 참). 층마다 컨테이너 기반 동적 계산, 짧은 층도 뷰포트를 가득 채우도록 minScale > 1 허용. 스크롤 step `0.05` (느린 정밀 확대). `limitToBounds` 적용 → 층 바깥 드래그 불가.
- 평면도를 고치려면 `src/lib/floorplans/` 의 해당 층 파일만 수정하면 된다.

---

## 4. 데이터 모델 (Supabase / PostgreSQL)

### `items` 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | 기본키 |
| `name` | text **NOT NULL** | 이름 (필수) |
| `spec` | text | 규격 (선택) |
| `categories` | text | 카테고리. `,`로 구분하여 다수 입력 (검색용, 선택) |
| `subjects` | text[] **NOT NULL** | 과목. 물리/화학/생명/지구/공학 중 **다중 선택** (최소 1개 필수) |
| `building` | text NOT NULL | `gungri`(궁리관) / `geogyeong`(거경관) |
| `floor` | int NOT NULL | 층 번호 |
| `room` | text | 방 이름/위치 (예: 물리실험실1) (선택) |
| `pos_x` | float NOT NULL | 핀 위치 X (0~1 상대 좌표) |
| `pos_y` | float NOT NULL | 핀 위치 Y (0~1 상대 좌표) |
| `shelf` | int | 수납장 층 번호 (1부터 시작, 선택). 같은 pos_x/pos_y 내 순서 구분 |
| `pin_w` | float | 핀 가로 크기 (px, 기본 6) |
| `pin_h` | float | 핀 세로 크기 (px, 기본 3) |
| `image_url` | text | Cloudinary 이미지 URL (선택) |
| `image_public_id` | text | Cloudinary public_id (삭제/관리용) |
| `created_by` | text | 추가한 사람 이메일 |
| `updated_by` | text | 마지막 수정자 이메일 |
| `created_at` | timestamptz | 생성 시각 (기본값 now()) |
| `updated_at` | timestamptz | 수정 시각 |

- **필수 입력(폼 기준)**: `name`, `subjects`(1개 이상). 건물/층/좌표는 지도에 배치하며 자동 결정.
- `room`은 지도 클릭 시 `getRoomAt()`으로 해당 교실 이름이 자동 입력된다.
- `shelf`는 같은 위치(수납장) 내 층 번호. CabinetCard 테이블에서 드래그로 순서를 바꾸면 1, 2, 3…으로 재할당.
- `pin_w` / `pin_h`는 폼에서 직접 편집 가능 (가로·세로 px 값).
- `categories`는 한 필드에 `,`로 많이 넣을 수 있게 한다.

---

## 5. 인증 & 권한 (Firebase Auth)

- **Google OAuth** 로그인만 사용 (`signInWithPopup`).
- **`@ts.hs.kr`로 끝나는 이메일만** 수정 권한.
- **이중 방어**:
  - **클라이언트**: 도메인이 맞는 로그인 상태에서만 "수정" 버튼 노출 → 수정 모드 진입 가능.
  - **서버(Firestore Security Rules)**: `firestore.rules`로 강제.
    - `read`: 모두 허용 (열람은 비로그인 포함 누구나).
    - `create` / `update` / `delete`: `request.auth.token.email`이 `@ts.hs.kr`로 끝나는 경우에만 허용.
- 로그인하지 않으면 열람만 가능, 수정 UI는 보이지 않음.

---

## 6. 이미지 업로드 (Cloudinary)

- **무료 플랜**이므로 **압축·효율 저장** 필수.
- 업로드 시 변환 적용:
  - `quality: auto` (자동 최적 압축)
  - `format: auto` (webp/avif 자동 변환)
  - 최대 변(긴 쪽) 제한 (예: 1200px, `limit` 모드) → 원본 과대 저장 방지.
- 업로드된 `secure_url`과 `public_id`를 `items`에 저장.
- 항목 삭제/이미지 교체 시 기존 Cloudinary 에셋 정리 고려.

---

## 7. 화면 구성 (UI)

```
┌──────────────────────────────────────────────────┐
│  [검색창............................]  [로그인/수정]  │
├──────────────────────────────────────────────────┤
│                                                   │░│
│         큰 지도 (현재 층, 전체 너비)                │░│ ← 마우스
│    · 초기 4배 확대 / 휠 확대·축소                   │░│   근접 시
│    · 드래그 이동 (층 바깥 불가)                     │░│   패널
│    · 핀 표시 / 방 셀 클릭 → 추가 / 핀 클릭 → 상세   │░│   슬라이드
│                                                   │░│
└──────────────────────────────────────────────────┘
```

- **중앙(전체 너비)**: 현재 건물·층의 큰 지도. 휠 확대/축소, 드래그 이동.
- **우측 hover 패널**: 오른쪽 끝에 마우스를 가져가면 슬라이드 인. 건물 전환(궁리관/거경관) + 층 전환 버튼.
- **상단**: 검색창 + 로그인/수정모드 버튼.
- **핀 클릭**: 상세 카드(이름·규격·카테고리·과목·방 이름·이미지) 표시.
- **검색 결과 클릭**: 해당 핀이 있는 건물·층으로 이동 후 핀 강조.

### 수납장(Cabinet) 개념
- **같은 좌표**(`pos_x`/`pos_y`)의 아이템 = 하나의 수납장.
- 지도 위에는 수납장 핀 1세트(아이템 수만큼 세로 등분된 슬라이스)가 표시됨.
- **CabinetCard**: 수납장 핀 클릭 시 엑셀 스타일 테이블 팝업. 열: 층·이름·규격·과목·[수정·삭제].
- **수정 모드 CabinetCard**: 행 드래그로 층 순서 변경(shelf 자동 재할당) + "이 위치에 용품 추가" 버튼.

### 수정 모드 (로그인 후)
- "수정" 버튼 → 수정 모드 진입.
- **추가** (2단계): 지도 빈 곳 클릭 → 파란 점 마커 + 화면 하단 배너 "위치 선택됨 | [+ 용품 추가]" 표시 → 버튼 클릭 시 폼 열림. (드래그 중 오감지 방지)
- **이동**: 수납장을 **먼저 클릭(선택)**하면 노란 테두리 표시. 이 상태에서만 드래그 가능 → 수납장 전체가 이동.
- **수정/삭제**: CabinetCard 테이블에서 개별 용품 수정·삭제.
- **층 순서 변경**: CabinetCard 각 행 왼쪽 핸들(`⠿`) 드래그로 위아래 순서 조정 → `shelf` 자동 재할당.

---

## 8. 검색 동작

- 입력어를 **이름 / 규격 / 카테고리 / 과목 / 건물·층·방 이름**과 비교.
- **하나라도 일치하면** 결과에 포함 (OR, 부분일치/대소문자 무시).
- 데이터 규모가 작으므로 **전체 로드 후 클라이언트 필터링**으로 단순·빠르게 구현.

---

## 9. 기술 스택 & 배포

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js (App Router) + React + TypeScript |
| 배포 | **Vercel** |
| 텍스트 DB | **Firebase** (Firestore + Auth, 무료 Spark 플랜) |
| 이미지 | **Cloudinary** (무료 플랜, 압축 저장) |
| 지도 확대/이동 | react-zoom-pan-pinch (또는 동등 라이브러리) |

### 환경 변수
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=   # unsigned preset
```
- Firebase 콘솔 > 프로젝트 설정 > 앱(웹) SDK 구성에서 복사.
- Google 로그인: Firebase 콘솔 > Authentication > Sign-in method > Google 활성화.
- Firestore Security Rules: `firestore.rules` 내용을 Firebase 콘솔에 배포.

### 폴더 구조
```
science_map/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx           # 메인 지도 페이지 (상태/오케스트레이션)
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ MapView.tsx        # 확대/이동 래퍼 + 수납장 핀 표시/드래그
│  │  ├─ FloorMap.tsx       # 코드로 그린 평면도 렌더러
│  │  ├─ FloorSwitcher.tsx  # 건물·층 전환
│  │  ├─ SearchBar.tsx      # 통합 검색
│  │  ├─ CabinetCard.tsx    # 수납장 엑셀 테이블 카드 (드래그 재정렬 포함)
│  │  ├─ ItemCard.tsx       # 단일 용품 상세 카드 (레거시, 미사용)
│  │  ├─ ItemForm.tsx       # 추가/수정 폼 (shelf 필드 포함, 이미지 업로드)
│  │  └─ AuthButton.tsx     # 로그인/수정모드
│  └─ lib/
│     ├─ firebase.ts        # Firebase 클라이언트 + 도메인 검사
│     ├─ useAuth.ts         # 인증 훅 (Google OAuth)
│     ├─ items.ts           # items CRUD (updateItemShelf 포함)
│     ├─ cloudinary.ts      # 업로드/썸네일 헬퍼
│     ├─ buildings.ts       # 건물·층·과목 메타데이터
│     ├─ floorplans.ts      # 파싱 로직 + 헬퍼 함수 (~70줄)
│     ├─ floorplans/        # ★ 층별 SVG 데이터 (8개 .ts, .claudeignore 대상)
│     │  ├─ gungri-5.ts … gungri-1.ts
│     │  └─ geogyeong-3.ts … geogyeong-1.ts
│     └─ types.ts           # Item 타입 (shelf 필드 포함)
├─ firestore.rules          # Firestore Security Rules (Firebase 콘솔에 배포)
├─ .env.local.example
├─ .claudeignore            # Claude가 읽지 않을 경로 (아래 12절)
├─ README.md                # 설정·배포 가이드
└─ CLAUDE.md
```

---

## 10. 무료 플랜 최적화 원칙

- 이미지: Cloudinary에서 `quality:auto` + `format:auto` + 크기 제한으로 압축 저장.
- 텍스트: 작은 스키마, 인덱스 최소화, 전체 로드 후 클라이언트 검색으로 DB 요청 최소화.
- 지도: 이미지 없이 **코드로 렌더링**하므로 별도 정적 에셋·대역폭 부담이 없다.

---

## 11. 구축 단계

1. ✅ Next.js(App Router) + TS + Tailwind v4 초기화.
2. ✅ 층별 평면도를 SVG 문자열 데이터로 분리 → `src/lib/floorplans/` (8개) + 파싱 로직 `floorplans.ts` + `FloorMap.tsx`.
3. ✅ 지도 뷰어(확대/이동/층·건물 전환) 구현.
4. ✅ Firebase Firestore + Auth + Google OAuth(@ts.hs.kr 제한) 연결.
5. ✅ 핀/수납장 표시·추가·이동·수정·삭제 (수정 모드).
   - **수납장 그룹핑**: 같은 위치 아이템을 수납장으로 묶어 세로 등분 슬라이스로 표시.
   - 핀 기본 크기 6×3 px. 과목별 색상 구분. 이름 5글자 `0.1cqw` 가운데 정렬.
   - **CabinetCard**: 엑셀 테이블 뷰. 열: 층·이름·규격·과목·수정·삭제.
   - **드래그 재정렬**: CabinetCard 행 드래그 → shelf 자동 재할당 → Firestore 저장.
   - **2단계 추가**: 지도 클릭 → 파란 마커 + 배너 버튼 → 버튼 클릭 시 폼 열림.
   - **선택 후 드래그**: 수납장을 먼저 클릭(노란 테두리)해야 드래그 이동 가능.
   - `shelf` 필드로 수납장 내 층 순서 관리.
   - 지도 클릭 시 `getRoomAt()`으로 교실 이름 자동 입력.
   - 방 이름은 건물 밖(위/아래)에 표시. 존 라벨·외곽 테두리 없음.
   - **방 셀(room)에만 핀 추가 가능** — 화장실·계단·복도는 `not-allowed`.
6. ✅ Cloudinary 이미지 업로드(압축).
7. ✅ 검색(OR 통합 검색).
8. ✅ Vercel 배포 (GitHub 연동 → 환경변수 입력 후 자동 배포).
9. ✅ UI 개선.
   - 초기 스케일 = minScale (층 전체가 뷰포트에 꽉 참). 짧은 층도 minScale > 1로 확대.
   - 스크롤 휠 step `0.05` (정밀 확대). 층 바깥 드래그 불가(`limitToBounds`).
   - 우측 패널 hover-reveal (오른쪽 끝 마우스 근접 시 슬라이드 인, 평소엔 숨김).
   - 계단·화장실(WC)·창고·승강기 셀에 SVG 아이콘 표시.
   - 방 이름 라벨 `whiteSpace: nowrap` → 한 줄 고정.

---

## 12. Claude 작업 규칙

### 파일 읽기 원칙 (토큰 절약)

**작업에 직접 필요한 파일만 읽는다.** 맥락 파악을 위해 src 전체를 훑지 않는다.

- 요청받은 기능과 관련된 파일만 열기. 예: 핀 관련 → `MapView.tsx`만, 인증 관련 → `useAuth.ts`만.
- `src/lib/floorplans/` 폴더는 좌표 데이터 파일이므로 읽지 않는다 (`.claudeignore` 적용). 평면도 수정 요청 시에만 해당 층 파일을 직접 지정해 열기.
- `floorplans.ts`는 파싱 로직만 담당 (~70줄)이므로 필요 시 읽어도 부담 없음.
- 파일 구조가 궁금하면 `Read` 대신 `find`/`grep`으로 먼저 확인한다.

### .claudeignore 대상 경로

- `node_modules/`, `.next/`, `out/`, `build/`, `dist/`, `.vercel/`, `.git/`
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `.env*.local`, `*.log`
- `src/lib/floorplans/` (층별 SVG 좌표 데이터 — 코드 작업과 무관)
- `2025학년도 신입생 교육 자료집.pdf`
