# Development Journal — doc2md (HWPX → Markdown)

---

## 2026-05-22

### 빌드 시스템 마이그레이션
- 기존 단일 HTML 파일(`hwpx2md.html`) → Vite 기반 모듈화 프로젝트로 전환
- `vite-plugin-singlefile`을 이용해 빌드 결과물은 여전히 단일 `dist/index.html`로 유지
- 모듈 구조: `index.html` / `src/style.css` / `src/main.js` / `src/parser.js`
- 의존성 추가: `jszip` (HWPX 압축 해제), `marked` (마크다운 파싱)

### 실시간 마크다운 에디터 및 프리뷰 뷰어 구현
- 변환 결과를 읽기 전용 `div`에서 편집 가능한 `textarea` 에디터로 변경
- `input` 이벤트 → `marked.parse` 실시간 렌더링 연동
- 탭 3종 구현: 📝 에디터 / 👁️ 프리뷰 / 📊 나란히 보기(Split View)
- PC 환경(768px 이상)에서 변환 완료 시 Split View 자동 활성화
- 실시간 글자 수 · 단어 수 뱃지 추가
- 복사 · 다운로드 액션이 에디터의 최신 편집 내용을 기준으로 동작하도록 수정

### 디자인 리뉴얼
- CSS 변수 기반 HSL 색상 팔레트 도입 (Slate 배경 + Deep Indigo 포인트)
- Glassmorphism 카드 스타일 (backdrop-filter blur, 반투명 배경)
- 구글 웹폰트 적용: Outfit (UI/숫자), Fira Code (코드/에디터), Noto Sans KR (한글)
- 커스텀 스크롤바, 호버 트랜지션, slideUp / fadeIn 마이크로 애니메이션

### 빌드 결과
- `dist/index.html` 단일 파일, 191.45 kB (gzip: 60.17 kB)
- 외부 인터넷 없이 오프라인 단독 실행 가능
