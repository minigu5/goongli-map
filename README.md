# 궁리맵 (Science Map)

대구과학고등학교 **궁리관·거경관**의 실험 용품을 빠르게 찾는 지도 웹사이트.
학생들이 위키처럼 용품을 지도에 추가·수정·이동할 수 있고, 수정은 학교 구글 계정(`@ts.hs.kr`) 로그인 시에만 가능합니다.

설계 문서는 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 기술 스택
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL + Google 인증)
- Cloudinary (이미지 업로드·압축)
- Vercel (배포)

---

## 1. 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 (아래 참고)
npm run dev                        # http://localhost:3000
```

환경변수가 비어 있어도 앱은 뜨지만, 데이터 열람/수정은 비활성화됩니다.

---

## 2. Supabase 설정

1. https://supabase.com 에서 프로젝트 생성 (무료 플랜).
2. **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여넣고 실행.
   - `items` 테이블, 인덱스, `updated_at` 트리거, RLS 정책이 생성됩니다.
   - RLS: 열람은 누구나, 추가/수정/삭제는 `@ts.hs.kr` 이메일만.
3. **Google 로그인 활성화**
   - Google Cloud Console → OAuth 동의 화면 + OAuth 2.0 클라이언트 ID 생성.
   - 승인된 리디렉션 URI에 Supabase 콜백 추가:
     `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
   - Supabase 대시보드 → **Authentication > Providers > Google** 에 클라이언트 ID/Secret 입력.
   - Supabase → **Authentication > URL Configuration** 의 Site URL / Redirect URLs 에
     로컬(`http://localhost:3000`)과 배포 도메인(`https://<your-app>.vercel.app`)을 추가.
4. **Settings > API** 에서 값 복사:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key

> 도메인 제한은 클라이언트(버튼 노출)와 **RLS(서버)** 양쪽에서 강제됩니다.
> 즉, 학교 계정이 아니면 수정 요청 자체가 DB에서 거부됩니다.

---

## 3. Cloudinary 설정

1. https://cloudinary.com 에서 가입 (무료 플랜).
2. **Settings > Upload > Upload presets** 에서 **Unsigned** 프리셋 생성.
3. 프리셋의 **Incoming Transformation**(또는 Eager)에 압축 설정 추가:
   - `Quality: auto`, `Format: auto`, `Width: 1200`, `Crop: limit`
   - 권장 문자열: `q_auto,f_auto,w_1200,c_limit`
   - 이렇게 하면 저장 시점부터 용량이 최소화되어 무료 플랜 한도를 아낍니다.
4. 값 복사:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = Cloud name
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` = 만든 unsigned 프리셋 이름

---

## 4. Vercel 배포

1. 이 저장소를 GitHub에 올린 뒤 https://vercel.com 에서 Import.
2. **Environment Variables** 에 `.env.local`의 4개 값을 동일하게 입력.
3. Deploy.
4. 배포 후 도메인을 Supabase의 **Authentication > URL Configuration** 의
   Redirect URLs / Site URL 에 추가(2-3단계 참고).

---

## 5. 사용 방법

- **검색**: 상단 검색창에 이름·규격·카테고리·과목·위치 중 무엇이든 입력 → 하나라도 맞으면 결과 표시 → 클릭하면 해당 핀으로 이동.
- **지도 탐색**: 가운데 지도에서 휠로 확대/축소, 드래그로 이동. 우측 버튼으로 건물·층 전환.
- **수정(로그인 필요)**: `@ts.hs.kr` 구글 계정으로 로그인 → **수정 모드** → 지도 클릭으로 용품 추가, 핀 드래그로 위치 변경, 핀 클릭 후 수정/삭제.

---

## 지도(평면도) 수정

지도는 이미지가 아니라 **코드로 그립니다.** 방 위치·이름을 바꾸려면
[`src/lib/floorplans.ts`](./src/lib/floorplans.ts) 의 좌표 데이터만 수정하면 됩니다.
(각 층은 PDF "각 실 배치도"를 참고해 방 이름·호실번호·상대 위치를 옮긴 것입니다.)
