package com.company.project.foundation.domain.log;

import com.company.project.TestApplication;
import com.company.project.foundation.domain.code.CommonCode;
import com.company.project.foundation.domain.code.CommonCodeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("SysLog 리포지?�리 ?�스??)
class SysLogRepositoryTest {

    @Autowired
    private SysLogRepository repository;

    @Autowired
    private CommonCodeRepository commonCodeRepository;

    @Test
    @DisplayName("?�스??로그 검???�스??(공통코드 조인 ?�터)")
    void searchSysLogsTest() {
        // given
        // 공통코드 ?�전 ?�이??(COM033)
        CommonCode code = CommonCode.builder()
                .codeGroupId("COM033")
                .code("C")
                .codeNm("?�록")
                .useAt("Y")
                .build();
        commonCodeRepository.save(code);

        SysLog log = SysLog.builder()
                .requstId("REQ-001")
                .srvcNm("SysService")
                .processSeCode("C")
                .occrrncDe("20241227")
                .build();
        repository.save(log);

        // when (코드�?검?? "?�록")
        Page<SysLog> searchResult = repository.searchSysLogs("?�록", "20241201", "20241231", PageRequest.of(0, 10));

        // then
        assertThat(searchResult.getContent()).hasSize(1);
        assertThat(searchResult.getContent().get(0).getRequstId()).isEqualTo("REQ-001");
        
        // when (기간 검??
        Page<SysLog> searchDateResult = repository.searchSysLogs(null, "20241227", "20241227", PageRequest.of(0, 10));
        assertThat(searchDateResult.getContent()).hasSize(1);

        // when (Native Query Coverage)
        repository.insertLogSummary();
        repository.deleteOldLogs(6);
    }
}
