package com.company.project.domain.user.repository;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("User 패키지 리포지토리 테스트")
class UserModuleRepositoryTest {

    @Autowired
    private CommuteRepository commuteRepository;
    @Autowired
    private DeptManageRepository deptManageRepository;
    @Autowired
    private EnterpriseUserRepository enterpriseUserRepository;
    @Autowired
    private GeneralUserRepository generalUserRepository;
    @Autowired
    private UserAbsenceRepository userAbsenceRepository;
    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("유저 모듈 리포지토리 카운트 체크")
    void checkRepositories() {
        assertThat(commuteRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(deptManageRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(enterpriseUserRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(generalUserRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(userAbsenceRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(userRepository.count()).isGreaterThanOrEqualTo(0);
    }
}
