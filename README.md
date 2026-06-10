# 궁리맵 (Goongli Map)

대구과학고등학교 **궁리관·거경관**의 실험 용품을 빠르게 찾는 지도 웹사이트.
학생들이 위키처럼 용품을 지도에 추가·수정·이동할 수 있고, 수정은 학교 구글 계정(`@ts.hs.kr`) 로그인 시에만 가능합니다.

설계 문서는 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript + Tailwind CSS v4 |
| DB / 인증 | **Firebase** (Firestore + Auth, 무료 Spark 플랜) |
| 이미지 | **Cloudinary** (무료 플랜, 압축 저장) |
| 지도 확대/이동 | react-zoom-pan-pinch |
| 배포 | **Vercel** |

---

## 1. 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 (아래 참고)
npm run dev                        # http://localhost:3000
```

환경변수가 비어 있어도 앱은 뜨지만, 데이터 열람/수정은 비활성화됩니다.

---

## 2. Firebase 설정

### 2-1. 프로젝트 생성

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 (이름: `goongli-map`).
2. **무료 Spark 플랜**으로 진행.

### 2-2. Firestore 데이터베이스

1. Firebase 콘솔 → **Firestore Database** → 데이터베이스 만들기 (프로덕션 모드).
2. **규칙** 탭에서 `firestore.rules` 파일 내용을 붙여넣고 게시.
   - `read`: 누구나 허용.
   - `create` / `update` / `delete`: `@ts.hs.kr` 이메일 계정만 허용.

### 2-3. Google 로그인 활성화

1. Firebase 콘솔 → **Authentication** → **Sign-in method** → **Google** 사용 설정.
2. 승인된 도메인에 배포 도메인(`your-app.vercel.app`)을 추가.

### 2-4. 앱 등록 및 환경변수 복사

1. Firebase 콘솔 → **프로젝트 설정** → **앱 추가** → 웹(`</>`).
2. SDK 구성에서 값을 복사해 `.env.local`에 입력:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## 3. Cloudinary 설정

1. [cloudinary.com](https://cloudinary.com)에서 가입 (무료 플랜, Cloud name: `duz2xx21s`).
2. **Settings → Upload → Upload presets** 에서 **Unsigned** 프리셋 생성 (이름: `goongli-map`).
3. 프리셋의 **Incoming Transformation**에 압축 설정 추가:
   - `q_auto,f_auto,w_1200,c_limit` (저장 시점부터 압축 → 무료 용량 절약)
4. `.env.local`에 추가:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=duz2xx21s
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=goongli-map
```

---

## 4. Vercel 배포

1. 이 저장소를 GitHub(`minigu5/goongli-map`)에 올린 뒤 [vercel.com](https://vercel.com)에서 Import.
2. **Environment Variables**에 위의 8개 환경변수를 입력.
3. Deploy.
4. 배포 완료 후 Firebase 콘솔 → **Authentication → Settings → 승인된 도메인**에 Vercel 도메인 추가.

---

## 5. 사용 방법

- **검색**: 상단 검색창에 이름·규격·카테고리·과목·위치 입력 → 결과 클릭 시 해당 수납장으로 이동.
- **지도 탐색**: 휠로 정밀 확대/축소(느린 속도), 드래그로 이동. 오른쪽 끝에 마우스를 가져가면 건물·층 전환 패널이 나타남. 초기 화면은 층 전체가 한눈에 보이는 크기로 시작.
- **수납장 보기**: 지도의 핀(색상 직사각형)을 클릭하면 해당 수납장의 용품 목록이 엑셀 테이블 형태로 표시됨.
- **수정(로그인 필요)**: `@ts.hs.kr` 구글 계정 로그인 → **수정 모드** 진입.
  - **용품 추가**: 방 위를 클릭하면 파란 마커와 배너 버튼이 나타남 → **"+ 용품 추가"** 버튼을 눌러야 폼이 열림.
    - 화장실·계단·복도 위는 클릭해도 추가되지 않음.
    - 기존 수납장에 추가: 수납장 카드 하단 **"+ 이 위치에 용품 추가"** 버튼 클릭.
  - **수납장 이동**: 수납장 핀을 먼저 클릭(노란 테두리) → 이 상태에서 드래그하면 수납장 전체가 이동.
  - **층 순서 변경**: 수납장 카드에서 각 행 왼쪽 핸들(`⠿`)을 드래그해 위아래 순서를 조정.
  - **용품 수정/삭제**: 수납장 카드의 각 행에서 수정·삭제 버튼 클릭.

---

## 6. 지도(평면도) 수정

지도는 이미지가 아니라 **코드로 그립니다.** 방 위치·이름을 바꾸려면
`src/lib/floorplans/` 폴더의 해당 층 파일(예: `gungri-5.ts`)을 수정하면 됩니다.

각 파일은 `<svg data-ratio="..."><rect x y w h data-label data-kind data-code/>...</svg>` 형식의 문자열입니다.
