# pdf-parser

PDF를 넣으면 Markdown이 나오는 단순한 CLI. 파싱과 markdown 변환은
[opendataloader-pdf](https://github.com/opendataloader-project/opendataloader-pdf)
(Java 코어, Apache-2.0)가 담당하고, 이 프로젝트는 그 위의 얇은 CLI 래퍼입니다.

- 제목 계층, 표 구조, 읽기 순서를 보존한 markdown 출력
- 한국어/CJK 문서 처리에 강함 (Hancom 주도 프로젝트)
- 스캔본/이미지 PDF는 출력이 비면 경고 — **OCR은 범위 밖**
- 엔진 JAR은 npm 패키지에 번들되어 있어 별도 설치 불필요

## 요구사항

- Node.js 18.17 이상
- **Java 11 이상** (`java -version`으로 확인)

## 설치

```sh
npm install
```

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
출력이 비어 있으면(대개 텍스트 레이어가 없는 스캔본) stderr로 경고합니다.

## 브라우저에서 사용 (단일 HTML)

`web/index.html`은 HTML 한 장짜리 드롭존 페이지입니다. 브라우저로 열고
(파일 더블클릭이면 충분, 서버 불필요) PDF를 드래그하면 변환된 `.md`가 바로
다운로드됩니다.

주의: 브라우저에서는 Java를 실행할 수 없어 웹 페이지는 CLI와 다른 엔진
([pdf-inspector](https://github.com/firecrawl/pdf-inspector) WASM, jsdelivr
CDN에서 로드)을 사용합니다. 한국어 문서나 까다로운 폰트는 CLI 쪽 품질이 더
좋습니다. PDF 자체는 어디로도 전송되지 않고 변환은 전부 브라우저 안에서
일어납니다.

## 라이브러리로 사용

```js
import { convertPdf } from 'pdf-parser';

const { markdown } = await convertPdf('document.pdf');
```

## 테스트

```sh
npm test
```

바이너리 픽스처 없이 테스트가 메모리에서 최소 PDF를 생성해 변환 결과를
검증합니다.
