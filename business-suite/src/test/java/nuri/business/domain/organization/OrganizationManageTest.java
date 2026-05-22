package nuri.business.domain.organization;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OrganizationManage 엔티티 테스트")
class OrganizationManageTest {

    @Test
    @DisplayName("OrganizationManage 빌더 및 초기화 테스트")
    void builderTest() {
        // 1. 신규 표준 빌더 및 Getter 검증
        OrganizationManage org = OrganizationManage.builder()
                .ognzId("ORG_001")
                .ognzNm("Organization 1")
                .ognzExpln("Description 1")
                .build();

        assertThat(org.getOgnzId()).isEqualTo("ORG_001");
        assertThat(org.getOgnzNm()).isEqualTo("Organization 1");
        assertThat(org.getOgnzExpln()).isEqualTo("Description 1");

        // 2. 레거시 별칭 빌더 및 Getter 하위 호환성 검증
        OrganizationManage legacyOrg = OrganizationManage.builder()
                .orgnztId("ORG_002")
                .orgnztNm("Organization 2")
                .orgnztDc("Description 2")
                .build();

        assertThat(legacyOrg.getOrgnztId()).isEqualTo("ORG_002");
        assertThat(legacyOrg.getOrgnztNm()).isEqualTo("Organization 2");
        assertThat(legacyOrg.getOrgnztDc()).isEqualTo("Description 2");

        // 상호 교차 매핑 검증
        assertThat(legacyOrg.getOgnzId()).isEqualTo("ORG_002");
        assertThat(org.getOrgnztNm()).isEqualTo("Organization 1");
    }
}
