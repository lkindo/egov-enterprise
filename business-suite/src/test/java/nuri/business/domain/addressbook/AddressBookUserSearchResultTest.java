package nuri.business.domain.addressbook;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AddressBookUserSearchResult 단위 테스트")
class AddressBookUserSearchResultTest {

    @Test
    @DisplayName("AddressBookUserSearchResult 빌더 및 초기화 검증")
    void builderTest() {
        // Given & When
        AddressBookUserSearchResult result = AddressBookUserSearchResult.builder()
                .userId("USER_001")
                .userNm("홍길동")
                .emlAddr("gildong@example.com")
                .homeTelno("02-123-4567")
                .mblTelno("010-1234-5678")
                .officeTelno("02-987-6543")
                .faxNo("02-555-4444")
                .build();

        // Then
        assertThat(result.getUserId()).isEqualTo("USER_001");
        assertThat(result.getUserNm()).isEqualTo("홍길동");
        assertThat(result.getEmlAddr()).isEqualTo("gildong@example.com");
        assertThat(result.getHomeTelno()).isEqualTo("02-123-4567");
        assertThat(result.getMblTelno()).isEqualTo("010-1234-5678");
        assertThat(result.getOfficeTelno()).isEqualTo("02-987-6543");
        assertThat(result.getFaxNo()).isEqualTo("02-555-4444");
    }

    @Test
    @DisplayName("AddressBookUserSearchResult 기본 생성자 및 표준 Setter 검증")
    void setterTest() {
        // Given
        AddressBookUserSearchResult result = new AddressBookUserSearchResult();

        // When
        result.setUserId("USER_002");
        result.setUserNm("이순신");
        result.setEmlAddr("sunsin@example.com");
        result.setHomeTelno("031-111-2222");
        result.setMblTelno("010-9999-8888");
        result.setOfficeTelno("031-333-4444");
        result.setFaxNo("031-555-6666");

        // Then
        assertThat(result.getUserId()).isEqualTo("USER_002");
        assertThat(result.getUserNm()).isEqualTo("이순신");
        assertThat(result.getEmlAddr()).isEqualTo("sunsin@example.com");
        assertThat(result.getHomeTelno()).isEqualTo("031-111-2222");
        assertThat(result.getMblTelno()).isEqualTo("010-9999-8888");
        assertThat(result.getOfficeTelno()).isEqualTo("031-333-4444");
        assertThat(result.getFaxNo()).isEqualTo("031-555-6666");
    }

    @Test
    @DisplayName("AddressBookUserSearchResult 레거시 별칭 Getter/Setter 호환성 검증")
    void legacyAliasTest() {
        // Given
        AddressBookUserSearchResult result = AddressBookUserSearchResult.builder()
                .userNm("유관순")
                .emlAddr("yookwansun@example.com")
                .mblTelno("010-2222-3333")
                .officeTelno("02-111-4444")
                .faxNo("02-111-5555")
                .build();

        // When & Then (getter alias)
        assertThat(result.getNm()).isEqualTo("유관순");
        assertThat(result.getEmlAddr()).isEqualTo("yookwansun@example.com");
        assertThat(result.getMblTelno()).isEqualTo("010-2222-3333");
        assertThat(result.getOfficeTelno()).isEqualTo("02-111-4444");
        assertThat(result.getFaxNo()).isEqualTo("02-111-5555");

        // When (setter alias)
        result.setNm("유관순 수정");

        // Then (cross verify standard field)
        assertThat(result.getUserNm()).isEqualTo("유관순 수정");
        assertThat(result.getNm()).isEqualTo("유관순 수정");
    }
}
