package com.company.project.domain.integration;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("IntegrationRepository 테스트")
class IntegrationRepositoryTest {

    @Autowired
    private IntegrationInstitutionRepository integrationInstitutionRepository;

    @Autowired
    private IntegrationSystemRepository integrationSystemRepository;

    @Autowired
    private IntegrationServiceRepository integrationServiceRepository;

    @Test
    @DisplayName("연계기관 저장 및 조회")
    void institutionTest() {
        // Given
        IntegrationInstitution inst = IntegrationInstitution.builder()
                .insttId("INST_001")
                .insttNm("TEST_INST")
                .useAt("Y")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        integrationInstitutionRepository.save(inst);
        Optional<IntegrationInstitution> found = integrationInstitutionRepository.findById("INST_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getInsttNm()).isEqualTo("TEST_INST");
    }

    @Test
    @DisplayName("연계시스템 저장 및 조회")
    void systemTest() {
        // Given
        IntegrationSystem.IntegrationSystemId systemId = IntegrationSystem.IntegrationSystemId.builder()
                .insttId("INST_001")
                .sysId("SYS_001")
                .build();

        IntegrationSystem sys = IntegrationSystem.builder()
                .id(systemId)
                .sysNm("TEST_SYS")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        integrationSystemRepository.save(sys);
        Optional<IntegrationSystem> found = integrationSystemRepository.findById(systemId);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getSysNm()).isEqualTo("TEST_SYS");
    }

    @Test
    @DisplayName("연계서비스 저장 및 조회")
    void serviceTest() {
        // Given
        IntegrationService.IntegrationServiceId serviceId = IntegrationService.IntegrationServiceId.builder()
                .insttId("INST_001")
                .sysId("SYS_001")
                .svcId("SVC_001")
                .build();

        IntegrationService svc = IntegrationService.builder()
                .id(serviceId)
                .svcNm("TEST_SVC")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        integrationServiceRepository.save(svc);
        Optional<IntegrationService> found = integrationServiceRepository.findById(serviceId);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getSvcNm()).isEqualTo("TEST_SVC");
    }
}
