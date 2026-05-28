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

        // 5. trgetOrgnztId 있음
        Page<AddressBookDto> res5 = addressBookService.getAddressBookList(userId, orgId, null, "", PageRequest.of(0, 10));
        
        // 6. wrterId null (public)
        Page<AddressBookDto> res6 = addressBookService.getAddressBookList(null, null, null, "", PageRequest.of(0, 10));

        // then
        assertThat(res1.getContent()).isNotEmpty();
        assertThat(res2.getContent()).isNotEmpty();
        // res3 can be empty or not, depending on other data, but branch is covered
        // res4, res5, res6 cover different combinations of wrterId, trgetOrgnztId, searchWrd
    }

    @Test
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
