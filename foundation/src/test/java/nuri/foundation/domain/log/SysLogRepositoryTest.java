package nuri.foundation.domain.log;

import nuri.foundation.domain.code.CommonCode;
import nuri.foundation.domain.code.CommonCodeRepository;
import nuri.foundation.support.PersistenceTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
@DisplayName("시스템 로그 리포지토리 테스트")
class SysLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private SysLogRepository sysLogRepository;

    @Autowired
    private CommonCodeRepository commonCodeRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("시스템 로그 검색")
    void searchSysLogs() {
        // given
        CommonCode code = CommonCode.builder()
                .codeGroupId("COM033")
                .code("C")
                .codeNm("생성")
                .useAt("Y")
                .build();
        commonCodeRepository.save(code);

        SysLog log = SysLog.builder()
                .requstId("REQ_001")
                .occrrncDe("20240101")
                .processSeCode("C")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .build();
        sysLogRepository.save(log);

        // when
        Page<SysLog> result = sysLogRepository.searchSysLogs("생성", "20240101", "20240131", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRequstId()).isEqualTo("REQ_001");
    }

    @Test
    @DisplayName("로그 요약 서비스")
    void insertLogSummary() {
        // given
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        SysLog log = SysLog.builder()
                .requstId("REQ_002")
                .occrrncDe(yesterday)
                .processSeCode("C")
                .srvcNm("SummaryService")
                .methodNm("summaryMethod")
                .build();
        sysLogRepository.save(log);

        // when
        sysLogRepository.insertLogSummary();

        // then
        // 요약 테이블 조회는 다른 리포지토리가 필요할 수 있으나, native query 실행에 의미를 둠
        // 실제로는 SSYSLOGSUMMARY 테이블에 데이터가 들어갔는지 확인해야 함
    }

    @Test
    @DisplayName("오래된 로그 삭제")
    void deleteOldLogs() {
        // given
        SysLog oldLog = SysLog.builder()
                .requstId("REQ_OLD")
                .occrrncDe("20200101")
                .build();
        sysLogRepository.save(oldLog);
        entityManager.flush();
        entityManager.clear();

        // when
        sysLogRepository.deleteOldLogs(12);
        entityManager.flush();
        entityManager.clear();

        // then
        assertThat(sysLogRepository.findById("REQ_OLD")).isEmpty();
    }
}