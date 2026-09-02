package nuri.business.service.addressbook;

import nuri.business.domain.addressbook.*;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("AddressBookService 단위 테스트")
class AddressBookServiceImplTest {

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @InjectMocks
    private AddressBookService addressBookService;

    @Mock
    private AddressBookRepository addressBookRepository;
    @Mock
    private AddressBookUserRepository addressBookUserRepository;

    @Test
    @DisplayName("주소록 목록 조회")
    void getAddressBookList() {
        Pageable pageable = PageRequest.of(0, 10);
        AddressBook entity = AddressBook.builder().adbkSn(1L).adbkNm("Book").build();
        given(addressBookRepository.searchAddressBooks(any(), any(), any(), any(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));

        Page<AddressBookDto> result = addressBookService.getAddressBookList("user1", null, null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAdbkSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("주소록 상세 조회 - 성공")
    void getAddressBook_Success() {
        AddressBook entity = AddressBook.builder().adbkSn(1L).adbkNm("Book").build();
        given(addressBookRepository.findById(1L)).willReturn(Optional.of(entity));
        
        AddressBookUser user = AddressBookUser.builder().adbkMbrSn(10L).addressBook(AddressBook.builder().adbkSn(1L).build()).nm("User").build();
        given(addressBookUserRepository.findByAdbkSn(1L)).willReturn(List.of(user));

        AddressBookDto result = addressBookService.getAddressBook(1L);

        assertThat(result.getAdbkSn()).isEqualTo(1L);
        assertThat(result.getAdbkMan()).hasSize(1);
    }

    @Test
    @DisplayName("주소록 생성 - 성공")
    void createAddressBook_Success() {
        AddressBookDto dto = AddressBookDto.builder()
                .adbkNm("New Book")
                .adbkMan(List.of(AddressBookUserDto.builder().nm("User").build()))
                .build();

        addressBookService.createAddressBook("user1", dto);

        verify(addressBookRepository).save(any(AddressBook.class));
        verify(addressBookUserRepository).save(any(AddressBookUser.class));
    }

    @Test
    @DisplayName("주소록 수정 - 성공")
    void updateAddressBook_Success() {
        AddressBook entity = AddressBook.builder().adbkSn(1L).adbkNm("Old").build();
        given(addressBookRepository.findById(1L)).willReturn(Optional.of(entity));

        AddressBookUser existingUser = AddressBookUser.builder().adbkMbrSn(10L).addressBook(AddressBook.builder().adbkSn(1L).build()).userId("E1").build();
        given(addressBookUserRepository.findByAdbkSn(1L)).willReturn(List.of(existingUser));

        AddressBookDto dto = AddressBookDto.builder()
                .adbkSn(1L)
                .adbkNm("New")
                .adbkMan(List.of(AddressBookUserDto.builder().userId("E2").nm("NewUser").build())) // Add new user, remove E1
                .build();

        addressBookService.updateAddressBook("user1", dto);

        assertThat(entity.getAdbkNm()).isEqualTo("New");
        verify(addressBookUserRepository).delete(existingUser);
        verify(addressBookUserRepository).save(any(AddressBookUser.class));
    }

    @Test
    @DisplayName("주소록 삭제 (논리 삭제)")
    void deleteAddressBook() {
        AddressBook entity = AddressBook.builder().adbkSn(1L).adbkNm("Book").useYn("Y").build();
        given(addressBookRepository.findById(1L)).willReturn(Optional.of(entity));

        addressBookService.deleteAddressBook(1L, "user1");

        assertThat(entity.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("사용자 검색")
    void searchUsers() {
        Pageable pageable = PageRequest.of(0, 10);
        // Repository returns a Projection usually, but here we can return mock or implementation
        AddressBookUserSearchResult proj = mock(AddressBookUserSearchResult.class);
        given(proj.getUserId()).willReturn("E1");
        given(proj.getUserNm()).willReturn("User1");
        
        given(addressBookRepository.searchAddressBookUsers(anyString(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(proj)));

        Page<AddressBookUserDto> result = addressBookService.searchUsers("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("E1");
    }

    @Test
    @DisplayName("사용자 검색어를 trim하고 페이지 크기를 20으로 제한")
    void searchUsers_NormalizesKeywordAndCapsPageSize() {
        Pageable requested = PageRequest.of(2, 100);
        given(addressBookRepository.searchAddressBookUsers(eq("홍길"), any(Pageable.class)))
                .willReturn(Page.empty());

        addressBookService.searchUsers("  홍길  ", requested);

        org.mockito.ArgumentCaptor<Pageable> pageableCaptor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(addressBookRepository).searchAddressBookUsers(eq("홍길"), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(2);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    @DisplayName("trim한 검색어가 2자 미만이면 저장소를 조회하지 않음")
    void searchUsers_RejectsShortKeywordBeforeRepository() {
        Page<AddressBookUserDto> result = addressBookService.searchUsers(" a ", PageRequest.of(0, 100));

        assertThat(result).isEmpty();
        assertThat(result.getSize()).isEqualTo(20);
        verifyNoInteractions(addressBookRepository);
    }
}
