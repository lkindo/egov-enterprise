# SMS 공급자 연동과 결과 확인

이 배포는 `NURI_SMS_PROVIDER=sens`를 명시한 경우 NAVER Cloud SENS를 사용한다. 기본값 `none`은 실제 발송이 구성되지 않은 상태다. 기관의 서비스 생성·계약, API 자격 발급, 발신번호 등록, 실제 수신 확인은 로컬 mock 검증과 구분한다.

## 설정

환경변수는 실행 환경의 시크릿으로 주입한다. 값을 저장소·공용 메모리·작업 로그에 넣지 않는다. [.env.example](../../.env.example), [application.yml](../../api-server/src/main/resources/application.yml), [운영 Compose](../../docker-compose.prod.yml)의 이름은 같다.

| 환경변수 | 용도·기본값 |
|---|---|
| `NURI_SMS_PROVIDER` | `none` 또는 `sens`; 기본 `none` |
| `NURI_SMS_SENS_SERVICE_ID` | 기관의 SENS SMS 서비스 ID |
| `NURI_SMS_SENS_ACCESS_KEY` | API access key |
| `NURI_SMS_SENS_SECRET_KEY` | 서명용 secret key |
| `NURI_SMS_SENS_REGISTERED_SENDER` | 등록된 발신번호, 숫자만 사용 |
| `NURI_SMS_CONNECT_TIMEOUT` | 연결 제한, 기본 `3s` |
| `NURI_SMS_REQUEST_TIMEOUT` | 요청 제한, 기본 `10s` |

`sens` 선택 시 필수 설정 누락은 기동 실패로 드러난다. 공급자 주소는 `https://sens.apigw.ntruss.com`으로 고정하고 redirect를 따라가지 않는다. 운영 설정에 임의 endpoint를 제공하지 않는다. 인증 헤더·본문을 출력하는 HTTP 디버그 로깅은 사용할 수 없다.

본문 길이는 공급자의 EUC-KR 기준으로 검증한다. SMS 90 bytes를 넘으면 LMS로 선택하고, LMS 2,000 bytes 초과 또는 인코딩할 수 없는 문자는 거부한다. 잘라서 다른 내용으로 보내지 않는다. 시각 서명 검증을 위해 실행 노드의 시계가 동기화되어야 한다.

## 접수·전달·불확실한 결과

| 저장 코드 | 의미 |
|---|---|
| `P` | 처리 중, 공급자 접수 후 결과 조회 중, 또는 결과 미확정 |
| `S` | 수신자별 최종 조회가 `COMPLETED`이고 전달 결과 코드가 `0` |
| `F` | 발송 전 검증 실패, 명시적 공급자 거부 또는 확인된 최종 전달 실패 |

POST의 `202`와 request ID는 접수 증거다. 성공 건수에 넣지 않는다. 응답 timeout·HTTP 408·연결 중단·5xx·해석할 수 없는 응답은 결과 미확정으로 두고 자동 POST 재시도를 하지 않는다. 접수 receipt를 가진 행만 GET으로 최종 전달을 확인한다.

`SmsService.sendSms`는 SMS 헤더·수신자와 `SMS_DELIVERY` 의도를 같은 접수 트랜잭션에 저장한다. 의도 저장 실패는 접수도 롤백한다. 커밋 후 실행기 제출 전에 프로세스가 종료되어도 새 worker가 저장된 의도를 읽는다. 작업 payload에는 전송 ID와 발신자 식별자만 담고 전화번호·본문은 복제하지 않는다. 업무 커밋 후 이벤트가 SMS 접수 서비스를 호출하기 전의 공백까지 보장하는 것은 아니다.

영속 작업은 공용 스케줄러와 분리된 4개 작업 스레드에서 처리하고 로컬 대기열을 두지 않는다. 선점은 작업 스레드 진입 후에 하며, 포화 시 다음 poll로 미룬다. 실행 중에는 30초마다 현재 시도의 120초 임대를 갱신하고, 별도 외부 발송 executor의 Future가 끝난 뒤 작업 완료를 기록한다. 프로세스 중단으로 갱신이 끊긴 작업은 마지막 임대 만료 후 복구한다. [후속 작업 재처리](durable-work-recovery.md)에 공통 상태와 운영자 재처리 절차가 있다.

수신 행을 짧은 별도 트랜잭션으로 선점한 다음 외부 POST를 한 번 호출하고, 결과 저장만 별도 트랜잭션에서 재시도한다. 자동 복구가 발송할 수 있는 수신자는 `P`이면서 내부 receipt가 `NULL`인 미선점 행뿐이다. 중복 worker와 작업 재시도는 이미 선점한 행을 재발송하지 않는다. GET 조회 결과도 현재 receipt와 일치할 때만 저장하여 완료 행을 오래된 결과로 덮지 않는다. 실행기 제출 거부나 미선점 행의 일시적인 DB 실패는 영속 작업 재시도의 대상이며, 공급자 응답 불명은 POST 재시도의 근거가 아니다.

발신자 계정이 하드 삭제되면 실패 알림의 수신자 FK 오류가 지속되어 작업이 재시도 한도 뒤 `FAILED`로 남을 수 있다. 이미 저장된 수신자 결과는 유지되며 자동 POST 재발송은 하지 않는다. `DWORK_RETRY`만으로 삭제된 발신자에게 알림을 저장할 수는 없으므로 [알림 실패의 운영 점검 경계](durable-work-recovery.md)를 함께 확인한다.

receipt는 기존 `tb_sms_rcptn.rslt_msg`에 버전이 있는 내부 상태로 저장한다. request/message ID와 조회 횟수·기한을 포함하지만 전화번호·내용·시크릿·공급자의 원문 오류는 포함하지 않는다. API는 내부 receipt 대신 사람이 읽을 수 있는 상태를 반환한다. 새 Entity·DDL·PK는 추가하지 않는다.

선점 후 중단했거나 접수 뒤 receipt를 저장하기 전에 중단한 건은 전달 여부가 불확실하다. 이 경로에서 exactly-once를 보장하지 않는다. 조회 한도·기한이 끝나도 `P`로 남겨 공급자 확인이 필요함을 표시한다. 운영자는 권한이 있는 SENS 조회에서 해당 요청을 대조한 뒤 후속 발송 여부를 판단한다. 로컬 결과 미확정이나 DB 저장 실패만으로 다시 보내지 않는다.

## 근거와 검증 경계

공급자 계약은 [발송 API](https://api.ncloud-docs.com/docs/sens-sms-send), [요청별 결과 조회](https://api.ncloud-docs.com/docs/sens-sms-list), [수신자별 결과 조회](https://api.ncloud-docs.com/docs/sens-sms-get), [서명 규칙](https://api.ncloud-docs.com/docs/common-ncpapi)을 따른다. mock HTTP 결과·실제 PostgreSQL 상태 전이·실제 계정으로 한 발송은 서로 다른 증거다.

`SmsServiceTest`는 영속 의도 저장 실패 전파를, `SmsAsyncProcessorTest`와 `SmsDeliveryWorkHandlerTest`는 미선점 수신자만 재개하는 동작과 Future 실패 전파를 검사한다. `SmsDeliveryStateIntegrationTest`의 범위는 격리 PostgreSQL에서 접수·의도의 롤백, 저장된 의도의 재실행, 실제 행 잠금, receipt 상태 전이다. 시험 소스의 존재는 통과나 운영 복구 완료의 증거가 아니며 실행 결과는 해당 변경의 검증 기록에서 확인한다.

백엔드 헌법 §10.1에는 종전 SMS POST의 `@Retryable(maxAttempts=3)` 실행 설명이 있다. 이번 사용자 `/goal`의 명시적 요구인 불확실한 발송 재시도 금지를 우선 적용했다. 결과 저장·GET 조회의 제한된 재시도는 유지하고 헌법 자체의 정책은 변경하지 않았다.
