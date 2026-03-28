package com.company.project.business.service.addressbook;

import com.company.project.business.service.addressbook.dto.AddressBookDto;
import com.company.project.business.support.BusinessIntegrationTestSupport;
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
    @DisplayName("새로운 주소록 생성 및 조회 통합 테스트")
    void createAndGetAddressBookTest() {
        // given
        String userId = "testUser";
        AddressBookDto saveRequest = AddressBookDto.builder()
                .adbkNm("My Integration Test Book")
                .othbcScope("P") // Public
                .useAt("Y")
                .adbkMan(Collections.emptyList())
                .build();

        // when
        addressBookService.createAddressBook(userId, saveRequest);
        Page<AddressBookDto> resultPage = addressBookService.getAddressBookList(userId, null, null, "Integration", PageRequest.of(0, 10));

        // then
        assertThat(resultPage.getContent()).isNotEmpty();
        assertThat(resultPage.getContent().get(0).getAdbkNm()).isEqualTo("My Integration Test Book");
    }
}
