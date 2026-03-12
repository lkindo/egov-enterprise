package com.company.project.service.addressbook;

import com.company.project.domain.addressbook.AddressBook;
import com.company.project.domain.addressbook.AddressBookRepository;
import com.company.project.domain.addressbook.AddressBookUserRepository;
import com.company.project.service.addressbook.dto.AddressBookDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AddressBookService 테스트")
class AddressBookServiceTest {

    @Mock
    private AddressBookRepository addressBookRepository;

    @Mock
    private AddressBookUserRepository addressBookUserRepository;

    @Mock
    private EgovIdGnrService egovAdbkIdGnrService;

    @Mock
    private EgovIdGnrService egovAdbkUserIdGnrService;

    @InjectMocks
    private AddressBookServiceImpl addressBookService;

    @Test
    @DisplayName("주소록 목록 조회 성공")
    void getAddressBookList_Success() {
        // Given
        Page<AddressBook> page = new PageImpl<>(List.of(AddressBook.builder().adbkId("ADBK_1").build()));
        given(addressBookRepository.searchAddressBooks(anyString(), anyString(), anyString(), anyString(), any(Pageable.class))).willReturn(page);

        // When
        Page<AddressBookDto> result = addressBookService.getAddressBookList("user", null, null, null, Pageable.unpaged());

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("주소록 상세 조회 성공")
    void getAddressBook_Success() {
        // Given
        AddressBook entity = AddressBook.builder().adbkId("ADBK_1").adbkNm("Name").build();
        given(addressBookRepository.findById("ADBK_1")).willReturn(Optional.of(entity));
        given(addressBookUserRepository.findByAdbkId("ADBK_1")).willReturn(List.of());

        // When
        AddressBookDto result = addressBookService.getAddressBook("ADBK_1");

        // Then
        assertThat(result.getAdbkNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("주소록 등록 성공")
    void createAddressBook_Success() throws Exception {
        // Given
        given(egovAdbkIdGnrService.getNextStringId()).willReturn("ADBK_2");
        AddressBookDto dto = AddressBookDto.builder().adbkNm("New").build();

        // When
        addressBookService.createAddressBook("user", dto);

        // Then
        verify(addressBookRepository).save(any(AddressBook.class));
    }

    @Test
    @DisplayName("주소록 삭제 성공")
    void deleteAddressBook_Success() {
        // Given
        AddressBook entity = AddressBook.builder().adbkId("ADBK_1").adbkNm("Name").build();
        given(addressBookRepository.findById("ADBK_1")).willReturn(Optional.of(entity));

        // When
        addressBookService.deleteAddressBook("ADBK_1", "user");

        // Then
        assertThat(entity.getUseAt()).isEqualTo("N");
    }
}
