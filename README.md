# MPA (Mobile Photo Album) v2.0

모바일 포토앨범 제작 서비스 · Firebase 연동 + 고객 지원 시스템

## 🆕 v2.0 변경사항

### 📢 공지사항 시스템
- 관리자가 공지사항을 등록/수정/삭제할 수 있는 CMS 기능
- **상단 고정(📌)** 기능으로 중요 공지를 우선 노출
- 고객 홈 화면에 최신 3건 자동 표시
- `/notices` 페이지에서 전체 공지 아코디언 목록 열람

### ❓ FAQ 관리
- 관리자가 FAQ 등록/수정/삭제 및 **순서 변경(▲▼)** 가능
- 공개/비공개 토글로 미완성 FAQ를 숨길 수 있음
- 고객용 `/faq` 페이지 — Q/A 아이콘 카드 아코디언

### 💬 1:1 문의 시스템
- 고객: 제목/내용/**이미지 최대 5장 첨부**로 문의 작성
- 관리자: 상태별 필터(대기/답변완료/종료)로 관리, 답변 작성/수정
- 답변 완료 시 상태 자동 전환 (`pending` → `answered`)
- 문의별 관련 주문번호 연결 가능 (주문 상세에서 원클릭 문의 진입)

### 👤 마이페이지
- `/mypage` — 탭 구조 (주문 내역 / 1:1 문의)
- **주문 상세**: 결제완료 → 제작중 → 배송중 → 배송완료 진행 단계 시각화
- **문의 상세**: 파란색 그라데이션 답변 카드로 고객센터 답변 강조 표시

### 🎨 어드민 성능 개선 (v1.11 패치)
- Firebase Resize Images Extension 연동 가능 (`firebase.ts`의 `getThumbnailUrl` 헬퍼)
- 어드민 주문 상세의 100장 썸네일 렌더링 이슈 해결 → 요약 카드 + 원본 전체 다운로드 버튼만 유지

## 🏗 아키텍처

```
📱 고객 앱 (Next.js PWA, 향후 React Native)
    ├─ /              홈 (공지 3건 + 앨범 제작 시작)
    ├─ /notices       공지사항 목록
    ├─ /faq           자주 묻는 질문
    └─ /mypage        마이페이지 (탭 구조)
        ├─ ?tab=orders       내 주문 목록
        ├─ orders/[id]       주문 상세 + 진행 단계
        ├─ ?tab=inquiries    내 문의 목록
        ├─ inquiries/new     새 문의 작성 (이미지 최대 5장)
        └─ inquiries/[id]    문의 상세 + 답변

    ↓ (실시간 구독)               ↑ (등록/답변)
📦 Firebase
  ├─ Firestore
  │   ├─ orders/{orderId}         (주문 데이터)
  │   ├─ settings/product         (가격·커버 색상·배송비)
  │   ├─ notices/{noticeId}       ← v2.0 신규
  │   ├─ faqs/{faqId}             ← v2.0 신규
  │   └─ inquiries/{inquiryId}    ← v2.0 신규
  ├─ Storage
  │   ├─ orders/{uid}/{orderId}/photos/*          (사진 원본)
  │   ├─ thumbnails/orders/.../*_200x200.webp     (Extension 생성)
  │   └─ inquiries/{uid}/{inquiryId}/*            ← v2.0 신규 (문의 이미지)
  └─ Auth (익명 인증)

    ↑ (실시간 구독 + 편집)
💻 관리자 웹 (/admin)
  ├─ 주문 관리
  ├─ 회원 관리
  ├─ 상품 관리
  ├─ 공지사항           ← v2.0 신규
  ├─ FAQ 관리           ← v2.0 신규
  ├─ 1:1 문의           ← v2.0 신규
  └─ 매출 대시보드
```

## 📁 파일 구조

```
app/
├── _components/
│   └── CustomerPageLayout.tsx     재사용 레이아웃 (뒤로가기, iOS 안전영역)
├── _lib/
│   ├── firebase.ts                Firebase 초기화 + 썸네일 URL 유틸
│   ├── types.ts                   전체 타입 정의
│   ├── orderService.ts            주문 생성/조회 (고객) + 익명 인증
│   ├── adminOrderService.ts       관리자 주문 조회/상태 변경
│   ├── productService.ts          상품 설정 (가격·커버)
│   ├── noticeService.ts           공지사항 CRUD         ← v2.0
│   ├── faqService.ts              FAQ CRUD              ← v2.0
│   ├── inquiryService.ts          문의 CRUD + 이미지 업로드  ← v2.0
│   └── pdfGenerator.ts            어드민용 PDF 생성
├── admin/                         관리자 페이지 (7개 메뉴)
├── notices/                       공지사항 (고객)       ← v2.0
├── faq/                           FAQ (고객)            ← v2.0
├── mypage/                        마이페이지            ← v2.0
│   ├── page.tsx                   탭 메인
│   ├── orders/[id]/               주문 상세
│   └── inquiries/
│       ├── new/                   새 문의 작성
│       └── [id]/                  문의 상세
└── page.tsx                       고객 홈 (SPA 방식 앨범 제작 플로우)
```

## 🚀 배포 가이드

### 1. GitHub 업로드
- Flat zip 기준: 루트 파일이 압축 바로 아래에 위치해야 함
- 업로드는 데스크톱 Chrome 권장 (Safari/모바일은 디렉토리 손상 가능성 있음)

### 2. Vercel 자동 배포
- GitHub 연동이 활성화되어 있으면 `main` 브랜치 푸시 즉시 자동 배포
- 환경변수: `NEXT_PUBLIC_FIREBASE_*` 6개 (API 키, 프로젝트 ID 등)

### 3. Firebase 배포 체크리스트

#### 필수 배포 항목
- [ ] **Firestore Rules**: `firestore.rules` 내용을 Firebase Console → Firestore → Rules 탭에 게시
- [ ] **Storage Rules**: `storage.rules` 내용을 Firebase Console → Storage → Rules 탭에 게시

#### Firestore 복합 인덱스 (v2.0 신규)
새 기능에 필요한 복합 인덱스입니다. 첫 조회 시 에러 메시지의 링크로 자동 생성 권장.

| 컬렉션 | 필드 | 용도 |
|---|---|---|
| `notices` | `pinned DESC, updatedAt DESC` | 공지사항 목록 (고정 우선, 최신순) |
| `faqs` | `published ASC, order ASC` | 고객용 공개 FAQ 정렬 |
| `inquiries` | `userId ASC, createdAt DESC` | 마이페이지 내 문의 목록 |
| `inquiries` | `status ASC, createdAt DESC` | 어드민 상태별 필터 |
| `orders` | `userId ASC, createdAt DESC` | 마이페이지 내 주문 목록 |

#### Firebase Resize Images Extension (선택)
- 어드민 성능 최적화용 (현재 `getThumbnailUrl` 헬퍼 준비됨)
- 설정: `200x200` · `thumbnails` 경로 · `webp` · Blaze 요금제 필요

## 🔐 보안 주의사항

**⚠ 현재 관리자 인증은 클라이언트 비밀번호 방식** — Firestore/Storage 규칙에서 관리자 역할을 판별하지 못합니다.

실제 운영 전 반드시 다음 작업 필요:
1. Firebase Admin SDK로 특정 UID에 custom claim (`{ admin: true }`) 부여
2. Firestore 규칙에서 `request.auth.token.admin == true` 체크로 교체
3. 현재 `allow write: if true` 로 된 settings/notices/faqs는 관리자 claim으로 제한

## 🛠 로컬 개발

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드 검증
```

## 📝 주요 기술

- **Next.js 14** (App Router, Server Components 지원)
- **Firebase 10** (Firestore, Storage, Auth)
- **TypeScript 5.3**
- **PWA** (iOS 홈 화면 추가, 안전 영역 지원)
- **pdf-lib** (어드민 PDF 생성)

## 📅 버전 히스토리

- **v2.0** (2026.04) — 공지사항 · FAQ · 1:1 문의 · 마이페이지
- **v1.11** (이전) — 단일 상품 구조, 어드민 썸네일 성능 개선
- **v1.10** (이전) — 관리자 상품 관리 (가격/커버 편집)
