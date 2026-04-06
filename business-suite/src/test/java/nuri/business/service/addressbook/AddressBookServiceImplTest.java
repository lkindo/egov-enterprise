package nuri.business.service.addressbook;

import nuri.business.domain.addressbook.*;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
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
@DisplayName("AddressBookServiceImpl 단위 테스트")
class AddressBookServiceImplTest {

    @InjectMocks
    private AddressBookServiceImpl addressBookService;

    @Mock
    private AddressBookRepository addressBookRepository;
    @Mock
    private AddressBookUserRepository addressBookUserRepository;

    @Mock(name = "egovAdbkIdGnrService")
    private EgovIdGnrService egovAdbkIdGnrService;
    @Mock(name = "egovAdbkUserIdGnrService")
    private EgovIdGnrService egovAdbkUserIdGnrService;

    @Test
    @DisplayName("주소록 목록 조회")
    void getAddressBookList() {
        Pageable pageable = PageRequest.of(0, 10);
        AddressBook entity = AddressBook.builder().adbkId("A1").adbkNm("Book").build();
        given(addressBookRepository.searchAddressBooks(any(), any(), any(), any(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));

        Page<AddressBookDto> result = addressBookService.getAddressBookList("user1", null, null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAdbkId()).isEqualTo("A1");
    }

    @Test
    @DisplayName("주소록 상세 조회 - 성공")
    void getAddressBook_Success() {
        AddressBook entity = AddressBook.builder().adbkId("A1").adbkNm("Book").build();
        given(addressBookRepository.findById("A1")).willReturn(Optional.of(entity));
        
        AddressBookUser user = AddressBookUser.builder().adbkUserId("AU1").adbkId("A1").nm("User").build();
        given(addressBookUserRepository.findByAdbkId("A1")).willReturn(List.of(user));

        AddressBookDto result = addressBookService.getAddressBook("A1");

        assertThat(result.getAdbkId()).isEqualTo("A1");
        assertThat(result.getAdbkMan()).hasSize(1);
    }

    @Test
    @DisplayName("주소록 생성 - 성공")
    void createAddressBook_Success() throws Exception {
        AddressBookDto dto = AddressBookDto.builder()
                .adbkNm("New Book")
                .adbkMan(List.of(AddressBookUserDto.builder().nm("User").build()))
                .build();
        
        given(egovAdbkIdGnrService.getNextStringId()).willReturn("A1");
        given(egovAdbkUserIdGnrService.getNextStringId()).willReturn("AU1");

        addressBookService.createAddressBook("user1", dto);

        verify(addressBookRepository).save(any(AddressBook.class));
        verify(addressBookUserRepository).save(any(AddressBookUser.class));
    }

    @Test
    @DisplayName("주소록 수정 - 성공")
    void updateAddressBook_Success() throws Exception {
        AddressBook entity = AddressBook.builder().adbkId("A1").adbkNm("Old").build();
        given(addressBookRepository.findById("A1")).willReturn(Optional.of(entity));
        
        AddressBookUser existingUser = AddressBookUser.builder().adbkUserId("AU1").adbkId("A1").emplyrId("E1").build();
        given(addressBookUserRepository.findByAdbkId("A1")).willReturn(List.of(existingUser));

        AddressBookDto dto = AddressBookDto.builder()
                .adbkId("A1")
                .adbkNm("New")
                .adbkMan(List.of(AddressBookUserDto.builder().emplyrId("E2").nm("NewUser").build())) // Add new user, remove E1
                .build();
        
        given(egovAdbkUserIdGnrService.getNextStringId()).willReturn("AU2");

        addressBookService.updateAddressBook("user1", dto);

        assertThat(entity.getAdbkNm()).isEqualTo("New");
        verify(addressBookUserRepository).delete(existingUser);
        verify(addressBookUserRepository).save(any(AddressBookUser.class));
    }

    @Test
    @DisplayName("주소록 삭제 (논리 삭제)")
    void deleteAddressBook() {
        AddressBook entity = AddressBook.builder().adbkId("A1").adbkNm("Book").useAt("Y").build();
        given(addressBookRepository.findById("A1")).willReturn(Optional.of(entity));

        addressBookService.deleteAddressBook("A1", "user1");

        assertThat(entity.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("사용자 검색")
    void searchUsers() {
        Pageable pageable = PageRequest.of(0, 10);
        // Repository returns a Projection usually, but here we can return mock or implementation
        AddressBookUserSearchResult proj = mock(AddressBookUserSearchResult.class);
        given(proj.getEmplyrId()).willReturn("E1");
        given(proj.getNm()).willReturn("User1");
        
        given(addressBookRepository.searchAddressBookUsers(anyString(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(proj)));

        Page<AddressBookUserDto> result = addressBookService.searchUsers("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmplyrId()).isEqualTo("E1");
    }
}
