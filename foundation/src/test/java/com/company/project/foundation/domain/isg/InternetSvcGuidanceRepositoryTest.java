package com.company.project.foundation.domain.isg;

import com.company.project.TestApplication;
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
@DisplayName("InternetSvcGuidance λ¦¬ν¬μ§€? λ¦¬ ?μ¤??)
class InternetSvcGuidanceRepositoryTest {

    @Autowired
    private InternetSvcGuidanceRepository repository;

    @Test
    @DisplayName("?Έν„°???λΉ„??κ°€?΄λ“ ?€??λ°?κ²€???μ¤??)
    void internetSvcGuidanceRepositoryTest() {
        // given
        InternetSvcGuidance guidance = InternetSvcGuidance.builder()
                .intnetSvcId("ISG-001")
                .intnetSvcNm("?Έν„°???λΉ„??κ°€?΄λ“")
                .intnetSvcDc("?¤λª…?…λ‹??)
                .reflctAt("Y")
                .build();
        repository.save(guidance);

        // when
        Page<InternetSvcGuidance> page = repository.findByIntnetSvcNmContaining("?λΉ„??, PageRequest.of(0, 10));

        // then
        assertThat(page.getContent()).isNotEmpty();
        assertThat(page.getContent().get(0).getIntnetSvcId()).isEqualTo("ISG-001");
        assertThat(page.getContent().get(0).getIntnetSvcNm()).contains("?λΉ„??);
    }
}
