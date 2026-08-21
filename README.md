# pdf-parser

PDF를 넣으면 Markdown이 나오는 단순한 CLI. 파싱과 markdown 변환은
[@firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector)
(Rust 코어, MIT)가 담당하고, 이 프로젝트는 그 위의 얇은 CLI 래퍼입니다.

- 제목(H1–H4), 리스트, 표, 다중 열 레이아웃, 하이픈 제거 지원 (pdf-inspector 내장)
- 스캔본/이미지 PDF는 감지해서 경고만 출력 — **OCR은 범위 밖**
- 의존성 1개, 순수 프리빌트 바이너리 (별도 시스템 라이브러리 불필요)

## 설치

```sh
npm install
```

Node.js 18.17 이상이 필요합니다.

## 사용법

```sh
# 단일 파일 → 옆에 same-name.md 생성
node bin/pdf2md.js document.pdf

# 출력 파일 지정
node bin/pdf2md.js document.pdf -o out.md

# 디렉터리 일괄 변환 (재귀, 구조 유지)
node bin/pdf2md.js docs/ -o output/
```

`npm link`를 실행하면 `pdf2md` 명령으로 바로 쓸 수 있습니다.

변환에 실패한 파일이 있으면 종료 코드 1, 인자 오류는 2를 반환합니다.
텍스트 레이어가 없는 페이지(스캔본)는 stderr로 경고를 출력하고 추출
가능한 내용만 기록합니다.

## 브라우저에서 사용 (단일 HTML)

`web/pdf2md.html`은 WASM 엔진이 base64로 임베드된 **완전 독립형 HTML 한 장**입니다.
서버나 네트워크 없이 파일을 브라우저로 열고, PDF를 드래그하면 변환된 `.md`가
바로 다운로드됩니다. 변환은 전부 로컬에서 일어나며 파일은 어디로도 전송되지
않습니다.

의존성(`@firecrawl/pdf-inspector-wasm`) 버전을 올린 뒤에는 다시 생성합니다:

```sh
node scripts/build-web.js
```

## 라이브러리로 사용

```js
import { convertPdf } from 'pdf-parser';

const { markdown, pdfType, pageCount } = await convertPdf('document.pdf');
```

## 테스트

```sh
npm test
```

바이너리 픽스처 없이 테스트가 메모리에서 최소 PDF를 생성해 변환 결과를
검증합니다.
