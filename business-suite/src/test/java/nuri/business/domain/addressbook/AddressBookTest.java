package nuri.business.domain.addressbook;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AddressBook 엔티티 단위 테스트")
class AddressBookTest {

    @Test
    @DisplayName("AddressBook 엔티티 표준 빌더 및 초기화 검증")
    void builderTest() {
        // Given & When
        AddressBook addressBook = AddressBook.builder()
                .adbkId("ADBK_001")
                .adbkNm("사내 주소록")
                .rlsScopeCd("COMPANY")
                .trgetOgnzId("ORG_001")
                .useYn("Y")
                .wrterId("user1")
                .build();
        addressBook.setFrstRgtrId("admin");
        addressBook.setLastMdfrId("admin");

        // Then
        assertThat(addressBook.getAdbkId()).isEqualTo("ADBK_001");
        assertThat(addressBook.getAdbkNm()).isEqualTo("사내 주소록");
        assertThat(addressBook.getRlsScopeCd()).isEqualTo("COMPANY");
        assertThat(addressBook.getTrgetOgnzId()).isEqualTo("ORG_001");
        assertThat(addressBook.getUseYn()).isEqualTo("Y");
        assertThat(addressBook.getWrterId()).isEqualTo("user1");
        assertThat(addressBook.getFrstRgtrId()).isEqualTo("admin");
        assertThat(addressBook.getLastMdfrId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("AddressBook 비즈니스 로직(update) 검증")
    void updateTest() {
        // Given
        AddressBook addressBook = AddressBook.builder()
                .adbkId("ADBK_001")
                .adbkNm("사내 주소록")
                .rlsScopeCd("COMPANY")
                .useYn("Y")
                .build();

        // When
        addressBook.update("수정된 주소록", "PERSONAL", "N");

        // Then
        assertThat(addressBook.getAdbkNm()).isEqualTo("수정된 주소록");
        assertThat(addressBook.getRlsScopeCd()).isEqualTo("PERSONAL");
        assertThat(addressBook.getUseYn()).isEqualTo("N");
    }
}
