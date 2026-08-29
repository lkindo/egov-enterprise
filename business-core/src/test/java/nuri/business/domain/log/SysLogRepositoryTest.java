package nuri.business.domain.log;

import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeRepository;
import nuri.business.support.PersistenceTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;


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
                .cdId("COM033")
                .dtlCd("C")
                .dtlCdNm("생성")
                .useYn("Y")
                .build();
        commonCodeRepository.save(code);

        SysLog log = SysLog.builder()
                .dmndId("REQ_001")
                .ocrnYmd("20240101")
                .prcsSeCd("C")
                .srvcNm("TestService")
                .mthdNm("testMethod")
                .build();
        sysLogRepository.save(log);
        Long sysLogSn = log.getSysLogSn();

        /*
         * [2026-08-29] 종전에는 검색어 "생성" 이 조인한 공통코드의 dtlCdNm(처리구분 코드명)에
         * 걸리는 것을 확인했다. 화면은 '서비스 설명 · 요청ID' 로 검색된다고 안내하고 표에도 같은
         * 이름의 열을 보여 주므로, 관리자는 그 열의 값을 붙여 넣는다 — 그러면 언제나 0건이었다.
         * 두 열이 읽는 필드(srvcNm·dmndId)를 검사하고, 옛 축이 되살아나면 red 가 되게 한다.
         */
        assertThat(sysLogRepository
                .searchSysLogs("TestService", "20240101", "20240131", PageRequest.of(0, 10)).getContent())
                .as("서비스 설명(srvcNm)으로 검색되지 않으면 화면 안내가 거짓이 된다")
                .extracting(SysLog::getSysLogSn)
                .containsExactly(sysLogSn);

        assertThat(sysLogRepository
                .searchSysLogs("REQ_001", "20240101", "20240131", PageRequest.of(0, 10)).getContent())
                .as("요청ID(dmndId)로 검색되지 않으면 화면 안내가 거짓이 된다")
                .extracting(SysLog::getSysLogSn)
                .containsExactly(sysLogSn);

        assertThat(sysLogRepository
                .searchSysLogs("생성", "20240101", "20240131", PageRequest.of(0, 10)).getContent())
                .as("처리구분 코드명은 화면에 검색 축으로 안내된 적이 없다")
                .isEmpty();
    }

    @Test
    @DisplayName("오래된 로그 삭제")
    void deleteOldLogs() {
        // given
        SysLog oldLog = SysLog.builder()
                .dmndId("REQ_OLD")
                .ocrnYmd("20200101")
                .build();
        sysLogRepository.save(oldLog);
        Long sysLogSn = oldLog.getSysLogSn();
        entityManager.flush();
        entityManager.clear();

        // when
        sysLogRepository.deleteOldLogs(12);
        entityManager.flush();
        entityManager.clear();

        // then
        assertThat(sysLogRepository.findById(sysLogSn)).isEmpty();
    }
}
