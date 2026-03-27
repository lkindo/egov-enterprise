package com.company.project.foundation.domain.isg;

import com.company.project.foundation.TestApplication;
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
@DisplayName("InternetSvcGuidance 리포지토리 테스트")
class InternetSvcGuidanceRepositoryTest {

    @Autowired
    private InternetSvcGuidanceRepository repository;

    @Test
    @DisplayName("인터넷 서비스 가이드 저장 및 검색 테스트")
    void internetSvcGuidanceRepositoryTest() {
        // given
        InternetSvcGuidance guidance = InternetSvcGuidance.builder()
                .intnetSvcId("ISG-001")
                .intnetSvcNm("인터넷 서비스 가이드")
                .intnetSvcDc("설명입니다")
                .reflctAt("Y")
                .build();
        repository.save(guidance);

        // when
        Page<InternetSvcGuidance> page = repository.findByIntnetSvcNmContaining("서비스", PageRequest.of(0, 10));

        // then
        assertThat(page.getContent()).isNotEmpty();
        assertThat(page.getContent().get(0).getIntnetSvcId()).isEqualTo("ISG-001");
        assertThat(page.getContent().get(0).getIntnetSvcNm()).contains("서비스");
    }
}
