package nuri.foundation.domain.log;

import nuri.foundation.domain.code.CommonCode;
import nuri.foundation.domain.code.CommonCodeRepository;
import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("SysLogRepository 테스트")
class SysLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private SysLogRepository repository;

    @Autowired
    private CommonCodeRepository commonCodeRepository;



    @Test
    @DisplayName("시스템 로그 검색 (공통코드 조인 포함)")
    void testSearchSysLogs() {
        // given
        commonCodeRepository.save(CommonCode.builder()
                .codeGroupId("COM033")
                .code("C")
                .codeNm("생성")
                .build());

        repository.save(SysLog.builder()
                .requstId("REQ_001")
                .occrrncDe("20260401")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .processSeCode("C")
                .build());

        // when
        Page<SysLog> results = repository.searchSysLogs("생성", "20260401", "20260401", PageRequest.of(0, 10));

        // then
        assertEquals(1, results.getTotalElements());
        assertEquals("REQ_001", results.getContent().get(0).getRequstId());
    }

    @Test
    @DisplayName("로그 요약 이행 확인")
    void testInsertLogSummary() {
        // given
        repository.save(SysLog.builder()
                .requstId("REQ_1")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .occrrncDe(LocalDateTime.now().minusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                .processSeCode("C")
                .build());

        // when
        repository.insertLogSummary();

        // then: execute without error (Native Query check)
    }

    @Test
    @DisplayName("오래된 로그 삭제 확인")
    void testDeleteOldLogs() {
        // given
        repository.save(SysLog.builder()
                .requstId("REQ_OLD")
                .srvcNm("OldService")
                .methodNm("oldMethod")
                .occrrncDe("20250101")
                .build());

        // when
        repository.deleteOldLogs(1); // newer than 20250101 if now is 2026

        // then
        Page<SysLog> results = repository.searchSysLogs(null, null, null, PageRequest.of(0, 10));
        assertEquals(0, results.getTotalElements());
    }
}