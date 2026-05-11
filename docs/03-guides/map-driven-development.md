# Map-Driven Development (via Graphify)

> 본 문서는 `GEMINI.md` 섹션 10에서 분리됨.

복잡한 아키텍처 변경이나 대규모 기능 추가 시 **지식 그래프(Knowledge Graph)**를 활용하여 효율성을 극대화한다.

- **Pre-flight Analysis**: 대형 작업 시작 전 `/graphify`를 실행하여 영향 범위(Blast Radius)를 시각적으로 파악한다.
- **Strategic CP0**: 브레인스토밍 단계에서 그래프를 쿼리하여 숨겨진 의존성과 기술적 부채를 사전에 식별한다.
- **Token Optimization**: 이미 구축된 그래프 인덱스를 활용하여 불필요한 파일 전체 읽기를 지양하고 토큰 소모를 최소화한다.
- **Graph Maintenance**: 대규모 구현 완료 후 `/graphify --update`를 통해 최신 아키텍처 상태를 지도에 반영한다.
