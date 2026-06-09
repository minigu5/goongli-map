# 궁리맵 (Science Map)

대구과학고등학교 **궁리관**·**거경관**의 실험 용품을 빠르게 찾기 위한 지도 웹사이트 **"궁리맵"**.
학생들이 위키처럼 자율적으로 실험 용품을 지도에 추가·수정·이동할 수 있다.

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
- **데이터**: `src/lib/floorplans.ts` 에 각 층의 방 배치를 좌표(%) 데이터로 정의.
  - PDF 3페이지의 "궁리관/거경관 각 실 배치도"를 참고해 방 이름·호실번호·상대 위치를 옮김.
  - 셀 종류: `room`(방) / `service`(WC·창고·배관실) / `stair`(계단) / `corridor`(연결통로).
- **렌더링**: `src/components/FloorMap.tsx` 가 좌표 데이터를 절대배치 `<div>` 로 그림.
  - 좌측에 녹색 존 라벨(예: "4층 물리"), 각 방은 테두리 박스 + 이름 + (호실).
  - 텍스트는 컨테이너 쿼리 단위(`cqw`)로 지정 → 확대/축소 시 함께 스케일.
- 각 지도 위에 실험 용품을 **핀(pin)** 으로 표시한다(0~1 상대 좌표).
- 평면도를 고치려면 `floorplans.ts` 의 좌표/이름만 수정하면 된다.

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
| `image_url` | text | Cloudinary 이미지 URL (선택) |
| `image_public_id` | text | Cloudinary public_id (삭제/관리용) |
| `created_by` | text | 추가한 사람 이메일 |
| `updated_by` | text | 마지막 수정자 이메일 |
| `created_at` | timestamptz | 생성 시각 (기본값 now()) |
| `updated_at` | timestamptz | 수정 시각 |

- **필수 입력(폼 기준)**: `name`, `subjects`(1개 이상). 건물/층/좌표는 지도에 배치하며 자동 결정.
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
┌─────────────────────────────────────────────┐
│  [검색창........................]  [로그인/수정]  │
├──────────────────────────────────┬──────────┤
│                                   │  [건물]   │
│                                   │ 궁리관    │
│           큰 지도 (현재 층)          │ 거경관    │
│      · 휠 확대/축소                  │          │
│      · 드래그 이동                   │  [층]    │
│      · 핀 표시 / 클릭 시 상세        │  5 4 3   │
│                                   │  2 1 ...  │
│                                   │          │
└──────────────────────────────────┴──────────┘
```

- **중앙**: 현재 건물·층의 큰 지도. 휠 확대/축소, 드래그 이동.
- **우측**: 건물 전환(궁리관/거경관) + 층 전환 버튼.
- **상단**: 검색창 + 로그인/수정모드 버튼.
- **핀 클릭**: 상세 카드(이름·규격·카테고리·과목·방 이름·이미지) 표시.
- **검색 결과 클릭**: 해당 핀이 있는 건물·층으로 이동 후 핀 강조.

### 수정 모드 (로그인 후)
- "수정" 버튼 → 수정 모드 진입.
- **추가**: 지도 클릭 위치에 새 핀 생성 → 입력 폼.
- **이동**: 기존 핀 드래그로 위치 변경.
- **수정/삭제**: 핀의 내용 편집·삭제 (본인 외 핀도 가능).

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
│  │  ├─ MapView.tsx        # 확대/이동 래퍼 + 핀 표시/드래그
│  │  ├─ FloorMap.tsx       # 코드로 그린 평면도 렌더러
│  │  ├─ FloorSwitcher.tsx  # 건물·층 전환
│  │  ├─ SearchBar.tsx      # 통합 검색
│  │  ├─ ItemCard.tsx       # 상세 카드
│  │  ├─ ItemForm.tsx       # 추가/수정 폼 (이미지 업로드 포함)
│  │  └─ AuthButton.tsx     # 로그인/수정모드
│  └─ lib/
│     ├─ firebase.ts        # Firebase 클라이언트 + 도메인 검사
│     ├─ useAuth.ts         # 인증 훅 (Google OAuth)
│     ├─ items.ts           # items CRUD
│     ├─ cloudinary.ts      # 업로드/썸네일 헬퍼
│     ├─ buildings.ts       # 건물·층·과목 메타데이터
│     ├─ floorplans.ts      # ★ 층별 방 배치 좌표 데이터
│     └─ types.ts           # Item 타입
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
2. ✅ 층별 평면도를 **코드(좌표 데이터)** 로 생성 → `src/lib/floorplans.ts` + `FloorMap.tsx`.
3. ✅ 지도 뷰어(확대/이동/층·건물 전환) 구현.
4. ✅ Firebase Firestore + Auth + Google OAuth(@ts.hs.kr 제한) 연결.
5. ✅ 핀 표시/추가/이동/수정/삭제 (수정 모드).
6. ✅ Cloudinary 이미지 업로드(압축).
7. ✅ 검색(OR 통합 검색).
8. ⬜ Vercel 배포 (키 입력 후 진행).

---

## 12. Claude 작업 규칙 (.claudeignore)

토큰 절약을 위해 다음 경로는 **읽지 않는다** (`.claudeignore` 에 명시):

- `node_modules/`, `.next/`, `out/`, `build/`, `dist/`, `.vercel/`, `.git/`
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` (대용량 잠금 파일)
- `.env*.local`, `*.log`
- `2025학년도 신입생 교육 자료집.pdf` (대용량 원본 자료 — 평면도는 이미 코드로 옮김)

> 패키지나 빌드 산출물을 확인해야 할 땐 `.claudeignore` 와 무관하게 필요한 파일만 직접 지정해 읽는다.
