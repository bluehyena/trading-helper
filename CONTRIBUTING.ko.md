# 기여 가이드

Trading Helper 개선에 관심을 가져주셔서 감사합니다.

## 개발

```bash
npm install
npm run dev
```

Pull request를 열기 전에 다음 명령을 실행해 주세요:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 원칙

- 앱은 분석 보조 전용으로 유지합니다. 브로커 주문 실행 기능은 별도 설계 논의 없이 추가하지 않습니다.
- API 키, secret, 사용자 대화 전문, secret이 포함될 수 있는 provider 응답을 로그로 남기지 않습니다.
- 데이터 adapter에는 fixture 기반 테스트를 추가합니다. CI가 live market API에 의존하지 않게 합니다.
- 사용자 화면에는 데이터 신선도와 출처 한계를 명확히 표시합니다.
- 작고 집중된 pull request를 선호합니다.
