package com.company.project.domain.code;

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
@DisplayName("CommonCode Repository 테스트")
class CommonCodeRepositoryTest {

        @Autowired
        private CommonCodeGroupRepository commonCodeGroupRepository;

        @Autowired
        private CommonCodeRepository commonCodeRepository;

        @Test
        @DisplayName("공통코드 그룹(대분류) 저장 및 조회")
        void codeGroupTest() {
                // Given
                CommonCodeGroup group = CommonCodeGroup.builder()
                                .codeId("GROUP_001")
                                .codeIdNm("테스트 그룹")
                                .clCode("T01")
                                .build();

                // When
                commonCodeGroupRepository.save(group);
                Optional<CommonCodeGroup> found = commonCodeGroupRepository.findById("GROUP_001");

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getCodeIdNm()).isEqualTo("테스트 그룹");
        }

        @Test
        @DisplayName("공통코드 상세 저장 및 조회")
        void codeDetailTest() {
                // Given
                CommonCode code = CommonCode.builder()
                                .codeGroupId("GROUP_001")
                                .code("CODE_001")
                                .codeNm("테스트 코드명")
                                .build();

                // When
                commonCodeRepository.save(code);
                CommonCodeId id = new CommonCodeId("GROUP_001", "CODE_001");
                Optional<CommonCode> found = commonCodeRepository.findById(id);

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getCodeNm()).isEqualTo("테스트 코드명");
        }
}
