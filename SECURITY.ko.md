# 보안 정책

## 지원 버전

첫 stable release 전까지는 `main` 브랜치를 활성 개발 및 지원 브랜치로 봅니다.

## 취약점 제보

secret 노출, prompt injection, API key 유출과 관련된 취약점은 공개 issue로 올리지 말아 주세요. GitHub private vulnerability reporting이 활성화되면 그 경로를 사용하거나 maintainer에게 비공개로 알려 주세요.

## Secret 처리

- provider key는 서버 측 환경 변수에만 보관합니다.
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, 시장 데이터 키를 브라우저로 보내지 않습니다.
- 기본 telemetry로 prompt, API key, 사용자 대화 원문을 수집하지 않습니다.
