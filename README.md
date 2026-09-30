# MODUCON 2026 · Deeper in AI

Codex Cloud로 이어서 작업할 수 있는 사이트 원본입니다. HTML, CSS, 순수 JavaScript로 구성되며 패키지 설치나 빌드가 필요 없습니다.

## 실행

```sh
python3 -m http.server 4173 --bind 0.0.0.0 --directory dist
```

브라우저에서 http://localhost:4173/ 를 엽니다. 게시 대상은 `dist/`입니다. `docs/`는 사이트로 게시하지 않습니다.

## 현재 반영된 내용

- 사용자 제공 MODUCON 2026 로고 및 남색·청록 배너 배경
- 슬로건: 모두콘 2026 Deeper in AI
- 모두의연구소 11주년
- 행사일: 2026년 12월 12일(토)
- 메인페이지의 세션 소개·목록 및 전체세션 메뉴 숨김
- 지난 행사 버튼: 지난 모두콘 다시보기
- 메인페이지·FAQ의 제목과 공유 문구 수정
- 하위페이지와 과거 세션 기록 보존: 총 51개 HTML 페이지

행사 시간은 기존 원본의 10시~17시가 유지되어 있습니다. 새로 확정한 시간이라는 뜻은 아닙니다.

## 파일 위치

- `dist/index.html`: 메인페이지
- `dist/faq/index.html`: FAQ
- `dist/session/`: 보관된 세션 목록·상세 페이지
- `dist/archive_241114/`: 과거 행사 아카이브
- `dist/app.js`: 메뉴·FAQ·공유 등 동작
- `dist/home-brand-2026.css`: 로고 비율
- `dist/home-banner-2026.css`: 배너 색상
- `dist/home-sections.css`: 세션 숨김 설정
- `dist/assets/`: 이미지·글꼴·영상
- `docs/MODUCON_운영가이드/`: 이전에 작성한 쉬운 운영·도메인 가이드
- `docs/MODUCON_2026_디자인시안/`: 모티프체 적용 시안과 기준
- `docs/original-assets/`: 사용자가 제공한 로고·모티프체·배너 참고 이미지
- `docs/verification/`: 이전 수정 때 확인한 화면 및 검사 결과
- `CLOUD_HANDOFF.md`: 작업 맥락과 Cloud 이전 절차

기존 운영 가이드는 최초 작성 당시의 날짜·화면·서비스 설명을 포함합니다. 현재 설정은 이 README와 실제 소스를 기준으로 확인하세요.

## 새 사이트 게시

이 폴더의 `.openai/hosting.json`에는 기존 사이트 ID를 넣지 않았습니다. 사용자가 새 사이트를 요청했기 때문입니다. Cloud에서 Sites 기능을 사용할 수 있을 때 새 Site를 한 번 등록하고, 반환된 ID를 이 파일에 저장한 뒤 공식 게시 절차를 따릅니다. 기존 사이트를 덮어쓰지 않습니다.

GitHub에 올리는 대상은 이 `project/` 폴더의 내용입니다. 상위 폴더의 `site-history.bundle`은 과거 작업 복구용 보관 파일이며 GitHub 웹 업로드 대상이 아닙니다.
