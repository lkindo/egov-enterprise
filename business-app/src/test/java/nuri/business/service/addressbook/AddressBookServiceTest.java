package nuri.business.service.addressbook;

import nuri.business.domain.addressbook.AddressBook;
import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.domain.addressbook.AddressBookUserRepository;
import nuri.business.service.addressbook.dto.AddressBookDto;
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

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @Mock
    private AddressBookRepository addressBookRepository;

    @Mock
    private AddressBookUserRepository addressBookUserRepository;

    private AddressBookService addressBookService;

    @BeforeEach
    void setUp() {
        addressBookService = new AddressBookService(
            addressBookRepository,
            addressBookUserRepository
        );
    }

    @Test
    @DisplayName("주소록 목록 조회 성공")
    void getAddressBookList_Success() {
        // Given
        Page<AddressBook> page = new PageImpl<>(List.of(AddressBook.builder().adbkSn(1L).build()));
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
        AddressBook entity = AddressBook.builder().adbkSn(1L).adbkNm("Name").build();
        given(addressBookRepository.findById(1L)).willReturn(Optional.of(entity));
        given(addressBookUserRepository.findByAdbkSn(1L)).willReturn(List.of());

        // When
        AddressBookDto result = addressBookService.getAddressBook(1L);

        // Then
        assertThat(result.getAdbkNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("주소록 등록 성공")
    void createAddressBook_Success() {
        // Given
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
        AddressBook entity = AddressBook.builder().adbkSn(1L).adbkNm("Name").build();
        given(addressBookRepository.findById(1L)).willReturn(Optional.of(entity));

        // When
        addressBookService.deleteAddressBook(1L, "user");

        // Then
        assertThat(entity.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("주소록 등록 성공 - 사용자 포함")
    void createAddressBook_WithUsers_Success() {
        // Given
        nuri.business.service.addressbook.dto.AddressBookUserDto userDto =
            nuri.business.service.addressbook.dto.AddressBookUserDto.builder().userId("EMP_1").nm("User").build();
        AddressBookDto dto = AddressBookDto.builder().adbkNm("New").adbkMan(List.of(userDto)).build();

        // When
        addressBookService.createAddressBook("user", dto);

        // Then
        verify(addressBookRepository).save(any(AddressBook.class));
        verify(addressBookUserRepository).save(any(nuri.business.domain.addressbook.AddressBookUser.class));
    }

    @Test
    @DisplayName("주소록 수정 성공 - 사용자 추가 및 삭제 포함")
    void updateAddressBook_WithUserUpdates_Success() {
        // Given
        Long adbkSn = 1L;
        AddressBook entity = AddressBook.builder().adbkSn(adbkSn).adbkNm("Old").build();
        given(addressBookRepository.findById(adbkSn)).willReturn(Optional.of(entity));

        nuri.business.domain.addressbook.AddressBookUser existingUser = 
            nuri.business.domain.addressbook.AddressBookUser.builder().userId("REMOVE_ME").addressBook(AddressBook.builder().adbkSn(adbkSn).build()).build();
        given(addressBookUserRepository.findByAdbkSn(adbkSn)).willReturn(List.of(existingUser));

        nuri.business.service.addressbook.dto.AddressBookUserDto newUserDto =
            nuri.business.service.addressbook.dto.AddressBookUserDto.builder().userId("ADD_ME").nm("New User").build();
        AddressBookDto dto = AddressBookDto.builder().adbkSn(adbkSn).adbkNm("Updated").adbkMan(List.of(newUserDto)).build();

        // When
        addressBookService.updateAddressBook("user", dto);

        // Then
        assertThat(entity.getAdbkNm()).isEqualTo("Updated");
        verify(addressBookUserRepository).delete(existingUser);
        verify(addressBookUserRepository).save(any(nuri.business.domain.addressbook.AddressBookUser.class));
    }

    @Test
    @DisplayName("사용자 검색 성공")
    void searchUsers_Success() {
        // Given
        nuri.business.domain.addressbook.AddressBookUserSearchResult view = mock(nuri.business.domain.addressbook.AddressBookUserSearchResult.class);
        given(view.getUserId()).willReturn("EMP_1");
        given(view.getUserNm()).willReturn("Name");
        Page<nuri.business.domain.addressbook.AddressBookUserSearchResult> page = new PageImpl<>(List.of(view));
        given(addressBookRepository.searchAddressBookUsers(any(), any(Pageable.class))).willReturn(page);

        // When
        Page<nuri.business.service.addressbook.dto.AddressBookUserDto> result = 
            addressBookService.searchUsers("keyword", org.springframework.data.domain.PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNm()).isEqualTo("Name");
    }
}
