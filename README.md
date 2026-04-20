# MPA (Mobile Photo Album) v1.11

모바일 포토앨범 제작 서비스 · Firebase 연동 + 단일 상품 관리

## 🆕 v1.11 변경사항

- **단일 상품 구조로 재설계**
  - 기존 3개 티어(mini/standard/premium) 제거 → 하나의 상품으로 통합
  - 최대 100장, 10,000원 (부가세 별도), 배송비 별도
  - 사진 장수에 관계없이 고정 가격 (1장이든 100장이든 동일)
- 관리자 상품 관리 페이지 (`/admin/products`)
  - 상품명·최대 장수·판매가·부가세율 편집
  - 6개 기본 커버 색상 + 추가/삭제/순서 변경, HEX 컬러 피커
  - 배송비·무료배송 기준·선물 포장 추가 금액 설정
  - 실시간 가격 미리보기 (부가세/배송비/선물포장 합산)
- 저장 시 Firestore `settings/product` 문서에 기록, 고객 앱에 실시간 반영

## 🏗 아키텍처

```
📱 고객 앱 (Next.js PWA, 향후 React Native)
    ↓ (사진 선택 + 결제)      ↑ (상품 설정 실시간 구독)
    ↓                          ↑
📦 Firebase
  ├─ Firestore
  │   ├─ orders/{orderId}     (주문 데이터)
  │   └─ settings/product     (가격·커버 색상·배송비) ← v1.10 신규
  ├─ Storage                  (사진 원본, PDF 출력파일)
  └─ Auth                     (익명 인증)
    ↑
    ↑ (실시간 구독 + 편집)
💻 관리자 웹 (/admin)
  ├─ 주문 관리
  ├─ 회원 관리
  ├─ 상품 관리                 ← v1.10 신규
  └─ 매출 대시보드
```

## 🚀 Vercel 배포 가이드

### 1. GitHub에 푸시

```bash
git add .
git commit -m "v1.10: 관리자 상품 관리 화면 추가"
git push
```

> ⚠ `.env.local`은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.

### 2. Vercel 환경 변수 등록 (필수!)

Vercel 대시보드 → 해당 프로젝트 → **Settings** → **Environment Variables**

아래 6개 변수를 **Production, Preview, Development 모두 체크**하고 추가:

| 변수명 | 값 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyD1sVfrR2bX54AeRZl2A0OaDaWTuucHWCw` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mobile-photo-album.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mobile-photo-album` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `mobile-photo-album.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `979882869434` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:979882869434:web:ac37e95745a87c8128f883` |

환경 변수 저장 후 **Deployments** 탭에서 최근 배포를 **Redeploy** 해야 반영됩니다.

### 3. Firebase Storage CORS 설정

Storage에 사진을 업로드하려면 CORS 설정이 필요해요. Firebase Console에서는 설정이 안 되고 **gsutil** 명령어로 해야 합니다.

```bash
# 1. Google Cloud SDK 설치 (한 번만)
# https://cloud.google.com/sdk/docs/install

# 2. 로그인
gcloud auth login

# 3. CORS 설정 파일 만들기 (cors.json)
echo '[{"origin": ["*"], "method": ["GET", "POST", "PUT"], "maxAgeSeconds": 3600}]' > cors.json

# 4. 적용
gsutil cors set cors.json gs://mobile-photo-album.firebasestorage.app
```

> 💡 실제 운영 시에는 `"origin": ["*"]` 대신 Vercel 도메인만 허용하도록 좁혀야 합니다.

## 🔒 보안 규칙 배포

### Firestore Rules

Firebase Console → **Firestore Database** → **규칙** 탭에서 `firestore.rules` 파일 내용을 복사 후 붙여넣고 **게시**.

### Storage Rules

Firebase Console → **Storage** → **Rules** 탭에서 `storage.rules` 파일 내용을 복사 후 붙여넣고 **게시**.

## 🧪 테스트 방법

### 고객 플로우

1. Vercel 배포 URL 접속
2. 사진 보관함에서 선택 → 순서 정렬 → 커버 선택
3. (모의) 카카오/네이버 로그인
4. 주문 정보 입력 → **결제** 버튼
5. **"사진 업로드 중..."** 로 실제 Firebase Storage에 사진 전송 확인
6. **"주문 정보 저장 중..."** 로 Firestore에 주문 문서 생성 확인
7. 완료 화면에서 **실제 주문번호** (MPA-YYYYMMDDxx) 확인

### 관리자 확인

1. `[배포URL]/admin` 접속
2. 비밀번호: `mpa2026!`
3. **주문 관리** 페이지에 방금 생성한 주문이 **실시간으로** 나타나는지 확인
4. 상세 페이지 → **PDF 생성 및 다운로드** → 업로드된 사진으로 실제 PDF 생성

## 📁 프로젝트 구조

```
app/
├── _lib/                          # 공용 라이브러리
│   ├── firebase.ts               # Firebase 초기화
│   ├── types.ts                  # 공유 타입
│   ├── orderService.ts           # 고객용 주문 생성
│   ├── adminOrderService.ts      # 관리자용 조회/수정
│   └── pdfGenerator.ts           # PDF 생성 (pdf-lib)
├── page.tsx                       # 고객 앱 (전체 플로우)
└── admin/
    ├── _lib/auth.ts              # 관리자 비밀번호 인증
    ├── layout.tsx                # 관리자 레이아웃
    ├── login/page.tsx            # 관리자 로그인
    ├── page.tsx                  # 주문 목록
    ├── orders/[id]/page.tsx     # 주문 상세 + PDF 생성
    ├── members/page.tsx          # 회원 관리
    └── stats/page.tsx            # 매출 대시보드

firestore.rules                    # Firestore 보안 규칙
storage.rules                      # Storage 보안 규칙
.env.local                         # 환경 변수 (로컬용, gitignore됨)
```

## 🎯 다음 단계

- [ ] 실제 카카오/네이버 OAuth 연동 (Firebase Auth OAuthProvider)
- [ ] PG사 결제 연동 (이니시스 / 카카오페이)
- [ ] Cloud Functions로 PDF 자동 생성 (결제 완료 시 트리거)
- [ ] 관리자 역할 기반 보안 규칙 (Firebase Auth custom claims)
- [ ] React Native로 네이티브 앱 포팅
