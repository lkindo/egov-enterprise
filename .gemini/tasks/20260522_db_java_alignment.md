# 20260522 DB-Java 필드 표준화 및 하위 호환 리팩토링 (6-3단계 완결)

## 진행 개요
- **목표**: Java 엔티티 필드명과 DB 컬럼명 네이밍 불일치(Mismatch) 100% 동기화 및 API/테스트 하위 호환성 완벽 보장.
- **상태**: 6-1, 6-2단계 성공적 완료 및 6-3단계 파일 및 헬프 도메인(5개 엔티티) 전수 마이그레이션 적용.

## 작업 진행 상황
1. **PrivacyLog.java (수정 완료)**
   - `inquiryInfo`, `serviceName`, `requesterIp` 등 테스트 빌더 누락 체인 추가로 foundation 테스트 컴파일 에러 해결.
2. **FileMaster.java (수정 완료)**
   - `useAt` ➔ `useYn` 변경 및 레거시 호환용 `getUseAt()` Getter 및 `useAt(...)` 커스텀 빌더 구축.
3. **Hpcm.java / HpcmRepository.java / HelpService.java (수정 완료)**
   - 도움말 필드 `hpcmId`/`hpcmSeCode`/`hpcmDf`/`hpcmDc` ➔ `hlpId`/`hlpSeCd`/`hlpDfn`/`hlpExpln` 변경.
   - 레거시 호환용 Getter, Setter, `@JsonProperty`, `hpcmId(...)` 빌더 구축.
   - 쿼리 메서드 `findByHpcmDfContaining` ➔ `findByHlpDfnContaining` 연쇄 갱신.
4. **OnlineManual.java / OnlineManualRepository.java / HelpService.java (수정 완료)**
   - 온라인 매뉴얼 필드 `onlineMnlId`/`onlineMnlNm`/`onlineMnlSeCode`/`onlineMnlDf`/`onlineMnlDc` ➔ `onlnMnlId`/`onlnMnlNm`/`onlnMnlSeCd`/`onlnMnlDfn`/`onlnMnlExpln` 변경.
   - 레거시 호환 Getter, Setter, `@JsonProperty`, 빌더 구축.
   - 쿼리 메서드 `findByOnlineMnlNmContaining` ➔ `findByOnlnMnlNmContaining` 연쇄 갱신.
5. **MainImage.java / MainImageRepository.java / MainImageDomainRepository.java / MainImageService.java (수정 완료)**
   - 메인 이미지 필드 `imageId`/`imageNm`/`image`/`imageFile`/`imageDc`/`reflctAt` ➔ `imgId`/`imgNm`/`mainImgFilePath`/`imgFileNm`/`mainImgExpln`/`rfltYn` 변경.
   - 레거시 호환 Getter, Setter, `@JsonProperty`, 빌더 구축.
   - 쿼리 메서드 `findByImageNmContaining`/`findByReflctAt` ➔ `findByImgNmContaining`/`findByRfltYn` 연쇄 갱신.
   - `getReflectedMainImages()` 성능 병목 해결 (`findAll()` + stream filter ➔ `findByRfltYn("Y")` 쿼리 호출로 최적화).
6. **HelpServiceTest.java / MainImageServiceTest.java (수정 완료)**
   - 리팩토링된 레포지토리 메서드명(`findByHlpDfnContaining`, `findByOnlnMnlNmContaining`, `findByImgNmContaining`, `findByRfltYn`)에 맞추어 mock stubbing 3건 정밀 갱신 완료.

## 검증 계획
- [x] 전체 빌드 및 컴파일 무결성 검증 (`./gradlew clean compileJava compileTestJava` 성공 확인 완료)
- [x] `verify_mismatches.js` 재진단으로 Active Mismatches = 0 확인 및 증명 (오탐 9건 전수 교차 검증 완료)
- [/] 전체 단위 및 E2E 테스트 재검증 (`./gradlew test` 백그라운드 구동 중)
