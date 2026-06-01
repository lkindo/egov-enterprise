package nuri.business.domain.addressbook;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AddressBookUser 엔티티 단위 테스트")
class AddressBookUserTest {

    @Test
    @DisplayName("AddressBookUser 엔티티 표준 빌더 및 초기화 검증")
    void builderTest() {
        // Given & When
        AddressBookUser user = AddressBookUser.builder()
                .adbkConstntId("CONST_001")
                .adbkId("ADBK_001")
                .userId("USER_001")
                .nm("홍길동")
                .emlAddr("gildong@example.com")
                .homeTelno("021234567")
                .mblTelno("01012345678")
                .ofcTelno("029876543")
                .faxNo("025554444")
                .frstRgtrId("admin")
                .build();

        // Then
        assertThat(user.getAdbkConstntId()).isEqualTo("CONST_001");
        assertThat(user.getAdbkId()).isEqualTo("ADBK_001");
        assertThat(user.getUserId()).isEqualTo("USER_001");
        assertThat(user.getNm()).isEqualTo("홍길동");
        assertThat(user.getEmlAddr()).isEqualTo("gildong@example.com");
        assertThat(user.getHomeTelno()).isEqualTo("021234567");
        assertThat(user.getMblTelno()).isEqualTo("01012345678");
        assertThat(user.getOfcTelno()).isEqualTo("029876543");
        assertThat(user.getFaxNo()).isEqualTo("025554444");
        assertThat(user.getFrstRgtrId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("AddressBookUser의 JPA 상속 메타 필드 검증")
    void inheritanceTest() {
        // Given & When
        AddressBookUser user = AddressBookUser.builder()
                .adbkConstntId("CONST_002")
                .frstRgtrId("system")
                .build();

        // Then
        assertThat(user.getFrstRgtrId()).isEqualTo("system");
    }
}
