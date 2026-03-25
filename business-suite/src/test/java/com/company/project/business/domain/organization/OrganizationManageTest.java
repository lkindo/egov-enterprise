package com.company.project.business.domain.organization;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OrganizationManage 엔티티 테스트")
class OrganizationManageTest {

    @Test
    @DisplayName("OrganizationManage 빌더 및 초기화 테스트")
    void builderTest() {
        OrganizationManage org = OrganizationManage.builder()
                .orgnztId("ORG_001")
                .orgnztNm("Organization 1")
                .orgnztDc("Description 1")
                .build();

        assertThat(org.getOrgnztId()).isEqualTo("ORG_001");
        assertThat(org.getOrgnztNm()).isEqualTo("Organization 1");
        assertThat(org.getOrgnztDc()).isEqualTo("Description 1");
    }
}
