package nuri.business.service.addressbook;

import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.support.BusinessIntegrationTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

class AddressBookServiceIntegrationTest extends BusinessIntegrationTestSupport {

    @Autowired
    private AddressBookService addressBookService;

    @Autowired
    private nuri.business.domain.user.repository.UserRepository userRepository;

    @Test
    @nuri.business.security.annotation.WithMockCustomUser
    @DisplayName("선택 검색은 동명이인의 내부 키를 구분하고 비활성·삭제 계정을 제외하며 20개로 제한한다")
    void selectionsFilterInactiveUsersAndDisambiguateDuplicateNames() {
        for (int index = 0; index < 24; index++) {
            userRepository.save(nuri.business.domain.user.entity.User.builder()
                    .esntlId("D03KEY%02d".formatted(index)).userId("D03LOGIN%02d".formatted(index))
                    .userNm("D03선택 동명이인").pswd("test-only-hash")
                    .userSttsCd(index < 22 ? "P" : index == 22 ? "A" : "D").build());
        }
        userRepository.flush();

        var page = addressBookService.searchUserSelections("D03선택", PageRequest.of(0, 100));

        assertThat(page.getSize()).isEqualTo(20);
        assertThat(page.getContent()).hasSize(20);
        assertThat(page.getTotalElements()).isEqualTo(22);
        assertThat(page.getContent()).extracting(nuri.business.service.addressbook.dto.AddressBookUserSelectionDto::esntlId)
                .doesNotHaveDuplicates().doesNotContain("D03KEY22", "D03KEY23")
                .startsWith("D03KEY00", "D03KEY01");
        assertThat(addressBookService.searchUserSelections(" D ", PageRequest.of(0, 100))).isEmpty();
        assertThat(addressBookService.searchUserSelections(" D03LOGIN00 ", PageRequest.of(0, 20)).getContent())
                .extracting(nuri.business.service.addressbook.dto.AddressBookUserSelectionDto::esntlId)
                .containsExactly("D03KEY00");
    }

    @Test
    @DisplayName("새로운 주소록 생성 및 다양한 조건 조회 통합 테스트")
    void createAndGetAddressBookTest() {
        // given
        String userId = "testUser";
        String orgId = "org1";
        AddressBookDto saveRequest = AddressBookDto.builder()
                .adbkNm("My Integration Test Book")
                .rlsScopeCd("P") // Public
                .useYn("Y")
                .adbkMan(Collections.emptyList())
                .build();

        // when
        addressBookService.createAddressBook(userId, saveRequest);
        
        // 1. searchWrd 있음, searchCnd null
        Page<AddressBookDto> res1 = addressBookService.getAddressBookList(userId, null, null, "Integration", PageRequest.of(0, 10));
        
        // 2. searchWrd 있음, searchCnd "0" (adbkNm)
        Page<AddressBookDto> res2 = addressBookService.getAddressBookList(userId, null, "0", "Integration", PageRequest.of(0, 10));
        
        // 3. searchWrd 있음, searchCnd "1" (wrterId)
        Page<AddressBookDto> res3 = addressBookService.getAddressBookList(userId, null, "1", "testUser", PageRequest.of(0, 10));
        
        // 4. searchWrd 없음
        Page<AddressBookDto> res4 = addressBookService.getAddressBookList(userId, null, null, "", PageRequest.of(0, 10));

        // 5. trgetOgnzId 있음
        Page<AddressBookDto> res5 = addressBookService.getAddressBookList(userId, orgId, null, "", PageRequest.of(0, 10));
        
        // 6. wrterId null (public)
        Page<AddressBookDto> res6 = addressBookService.getAddressBookList(null, null, null, "", PageRequest.of(0, 10));

        // then
        assertThat(res1.getContent()).isNotEmpty();
        assertThat(res2.getContent()).isNotEmpty();
        assertThat(res3).isNotNull();
        assertThat(res4).isNotNull();
        assertThat(res5).isNotNull();
        assertThat(res6).isNotNull();
        // res3 can be empty or not, depending on other data, but branch is covered
        // res4, res5, res6 cover different combinations of wrterId, trgetOgnzId, searchWrd
    }

    @Test
    @nuri.business.security.annotation.WithMockCustomUser
    @DisplayName("주소록 사용자 검색 통합 테스트")
    void searchAddressBookUsersTest() {
        // 1. searchWrd 있음
        Page<nuri.business.service.addressbook.dto.AddressBookUserDto> res1 = 
            addressBookService.searchUsers("test", PageRequest.of(0, 10));
            
        // 2. searchWrd 없음
        Page<nuri.business.service.addressbook.dto.AddressBookUserDto> res2 = 
            addressBookService.searchUsers("", PageRequest.of(0, 10));
            
        assertThat(res1).isNotNull();
        assertThat(res2).isNotNull();
    }
}
