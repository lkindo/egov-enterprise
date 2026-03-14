package com.company.project.service.addressbook;

import com.company.project.domain.addressbook.AddressBook;
import com.company.project.domain.addressbook.AddressBookRepository;
import com.company.project.domain.addressbook.AddressBookUserRepository;
import com.company.project.service.addressbook.dto.AddressBookDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AddressBookService 테스트")
class AddressBookServiceTest {

    @Mock
    private AddressBookRepository addressBookRepository;

    @Mock
    private AddressBookUserRepository addressBookUserRepository;

    @Mock(name = "egovAdbkIdGnrService")
    private EgovIdGnrService egovAdbkIdGnrService;

    @Mock(name = "egovAdbkUserIdGnrService")
    private EgovIdGnrService egovAdbkUserIdGnrService;

    private AddressBookServiceImpl addressBookService;

    @BeforeEach
    void setUp() {
        addressBookService = new AddressBookServiceImpl(
            addressBookRepository,
            addressBookUserRepository,
            egovAdbkIdGnrService,
            egovAdbkUserIdGnrService
        );
    }

    @Test
    @DisplayName("주소록 목록 조회 성공")
    void getAddressBookList_Success() {
        // Given
        Page<AddressBook> page = new PageImpl<>(List.of(AddressBook.builder().adbkId("ADBK_1").build()));
        given(addressBookRepository.searchAddressBooks(any(), any(), any(), any(), any(Pageable.class))).willReturn(page);

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
        given(egovAdbkIdGnrService.getNextStringId()).willReturn("ADBK_1");
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

    @Test
    @DisplayName("주소록 등록 성공 - 사용자 포함")
    void createAddressBook_WithUsers_Success() throws Exception {
        // Given
        given(egovAdbkIdGnrService.getNextStringId()).willReturn("ADBK_1");
        given(egovAdbkUserIdGnrService.getNextStringId()).willReturn("USER_1");
        
        com.company.project.service.addressbook.dto.AddressBookUserDto userDto = 
            com.company.project.service.addressbook.dto.AddressBookUserDto.builder().emplyrId("EMP_1").nm("User").build();
        AddressBookDto dto = AddressBookDto.builder().adbkNm("New").adbkMan(List.of(userDto)).build();

        // When
        addressBookService.createAddressBook("user", dto);

        // Then
        verify(addressBookRepository).save(any(AddressBook.class));
        verify(addressBookUserRepository).save(any(com.company.project.domain.addressbook.AddressBookUser.class));
    }

    @Test
    @DisplayName("주소록 등록 실패 - 예외 발생")
    void createAddressBook_Failure() throws Exception {
        // Given
        given(egovAdbkIdGnrService.getNextStringId()).willThrow(new RuntimeException("Error"));
        AddressBookDto dto = AddressBookDto.builder().adbkNm("New").build();

        // When & Then
        assertThrows(RuntimeException.class, () -> addressBookService.createAddressBook("user", dto));
    }

    @Test
    @DisplayName("주소록 수정 성공 - 사용자 추가 및 삭제 포함")
    void updateAddressBook_WithUserUpdates_Success() throws Exception {
        // Given
        String adbkId = "ADBK_1";
        AddressBook entity = AddressBook.builder().adbkId(adbkId).adbkNm("Old").build();
        given(addressBookRepository.findById(adbkId)).willReturn(Optional.of(entity));

        com.company.project.domain.addressbook.AddressBookUser existingUser = 
            com.company.project.domain.addressbook.AddressBookUser.builder().emplyrId("REMOVE_ME").adbkId(adbkId).build();
        given(addressBookUserRepository.findByAdbkId(adbkId)).willReturn(List.of(existingUser));
        given(egovAdbkUserIdGnrService.getNextStringId()).willReturn("NEW_USER_ID");

        com.company.project.service.addressbook.dto.AddressBookUserDto newUserDto = 
            com.company.project.service.addressbook.dto.AddressBookUserDto.builder().emplyrId("ADD_ME").nm("New User").build();
        AddressBookDto dto = AddressBookDto.builder().adbkId(adbkId).adbkNm("Updated").adbkMan(List.of(newUserDto)).build();

        // When
        addressBookService.updateAddressBook("user", dto);

        // Then
        assertThat(entity.getAdbkNm()).isEqualTo("Updated");
        verify(addressBookUserRepository).delete(existingUser);
        verify(addressBookUserRepository).save(any(com.company.project.domain.addressbook.AddressBookUser.class));
    }

    @Test
    @DisplayName("사용자 검색 성공")
    void searchUsers_Success() {
        // Given
        com.company.project.domain.addressbook.AddressBookUserSearchResult view = mock(com.company.project.domain.addressbook.AddressBookUserSearchResult.class);
        given(view.getEmplyrId()).willReturn("EMP_1");
        given(view.getNm()).willReturn("Name");
        Page<com.company.project.domain.addressbook.AddressBookUserSearchResult> page = new PageImpl<>(List.of(view));
        given(addressBookRepository.searchAddressBookUsers(any(), any(Pageable.class))).willReturn(page);

        // When
        Page<com.company.project.service.addressbook.dto.AddressBookUserDto> result = 
            addressBookService.searchUsers("keyword", org.springframework.data.domain.PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNm()).isEqualTo("Name");
    }
}
