package nuri.business.domain.addressbook;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AddressBookUserSearchResult 단위 테스트")
class AddressBookUserSearchResultTest {

    @Test
    @DisplayName("AddressBookUserSearchResult 빌더 및 초기화 검증")
    void builderTest() {
        // Given & When
        AddressBookUserSearchResult result = AddressBookUserSearchResult.builder()
                .esntlId("USRCNFRM_00000000001")
                .userId("USER_001")
                .userNm("홍길동")
                .ognzNm("개발부")
                .build();

        // Then
        assertThat(result.getEsntlId()).isEqualTo("USRCNFRM_00000000001");
        assertThat(result.getUserId()).isEqualTo("USER_001");
        assertThat(result.getUserNm()).isEqualTo("홍길동");
        assertThat(result.getOgnzNm()).isEqualTo("개발부");
    }

    @Test
    @DisplayName("AddressBookUserSearchResult 기본 생성자 및 표준 Setter 검증")
    void setterTest() {
        // Given
        AddressBookUserSearchResult result = new AddressBookUserSearchResult();

        // When
        result.setEsntlId("USRCNFRM_00000000002");
        result.setUserId("USER_002");
        result.setUserNm("이순신");
        result.setOgnzNm("총무부");

        // Then
        assertThat(result.getEsntlId()).isEqualTo("USRCNFRM_00000000002");
        assertThat(result.getUserId()).isEqualTo("USER_002");
        assertThat(result.getUserNm()).isEqualTo("이순신");
        assertThat(result.getOgnzNm()).isEqualTo("총무부");
    }

    @Test
    @DisplayName("[2026-10-18] 선택 조회 행은 연락처를 담을 칸이 없다 — 퇴역한 구 검색의 연락처 응답이 되살아나지 않는다")
    void carriesNoContactFields() {
        assertThat(Arrays.stream(AddressBookUserSearchResult.class.getDeclaredFields())
                .filter(field -> !field.isSynthetic())
                .map(java.lang.reflect.Field::getName))
                .containsExactlyInAnyOrder("esntlId", "userId", "userNm", "ognzNm");
    }
}
