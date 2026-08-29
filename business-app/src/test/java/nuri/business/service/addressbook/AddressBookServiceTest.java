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
import static org.mockito.Mockito.never;
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
    @DisplayName("주소록 수정 - useYn 을 생략하면 기존 값을 보존한다(목록에서 사라지지 않는다)")
    void updateAddressBook_PreservesUseYnWhenOmitted() {
        /*
         * [2026-08-29] 종전에는 dto.getUseYn() 을 그대로 넘겨 null 로 덮었다.
         * 목록 질의는 AddressBookRepositoryImpl:37,49 에서 useYn.eq("Y") 로만 거르므로
         * 이름만 바꾼 주소록이 조용히 목록에서 사라졌다 — 화면은 '주소록이 수정되었습니다.'
         * 라고 알리고 목록으로 되돌아갔으므로 사용자는 자기가 무엇을 지웠는지 알 수 없었다.
         * 이 엔드포인트를 부르는 프런트 경로는 useYn 을 보내지 않으므로 모든 수정이 그랬다.
         */
        Long adbkSn = 7L;
        AddressBook entity = AddressBook.builder().adbkSn(adbkSn).adbkNm("Old").useYn("Y").build();
        given(addressBookRepository.findById(adbkSn)).willReturn(Optional.of(entity));

        // 화면이 실제로 보내는 본문과 같다 — adbkNm·rlsScopeCd 만 있고 useYn 이 없다.
        AddressBookDto dto = AddressBookDto.builder()
                .adbkSn(adbkSn).adbkNm("Renamed").rlsScopeCd("PUB").build();

        addressBookService.updateAddressBook("user", dto);

        assertThat(entity.getAdbkNm()).isEqualTo("Renamed");
        assertThat(entity.getUseYn())
                .as("useYn 이 null 이 되면 목록 질의(useYn='Y')에서 빠져 주소록이 조용히 사라진다")
                .isEqualTo("Y");
    }

    @Test
    @DisplayName("주소록 수정 - useYn 을 명시하면 그 값으로 바꾼다")
    void updateAddressBook_AppliesUseYnWhenProvided() {
        // 보존은 '생략됐을 때' 만이다 — 명시적 변경까지 막으면 사용 중지 경로가 죽는다.
        Long adbkSn = 8L;
        AddressBook entity = AddressBook.builder().adbkSn(adbkSn).adbkNm("Old").useYn("Y").build();
        given(addressBookRepository.findById(adbkSn)).willReturn(Optional.of(entity));

        AddressBookDto dto = AddressBookDto.builder()
                .adbkSn(adbkSn).adbkNm("Old").rlsScopeCd("PUB").useYn("N").build();

        addressBookService.updateAddressBook("user", dto);

        assertThat(entity.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("주소록 수정 - 기존 구성원의 연락 정보를 실제로 갱신한다")
    void updateAddressBook_UpdatesExistingMemberContact() {
        /*
         * [2026-08-28] 종전에는 같은 userId 를 만나면 아무것도 하지 않고 넘어갔다.
         * 화면이 이메일·연락처를 바꿔 보내도 200 만 돌아오고 값은 그대로였다 —
         * 조용히 성공하는 no-op 이라 사용자는 저장된 줄 안다.
         */
        Long adbkSn = 1L;
        AddressBook entity = AddressBook.builder().adbkSn(adbkSn).adbkNm("팀 주소록").build();
        given(addressBookRepository.findById(adbkSn)).willReturn(Optional.of(entity));

        nuri.business.domain.addressbook.AddressBookUser existing =
                nuri.business.domain.addressbook.AddressBookUser.builder()
                        .userId("KEEP_ME")
                        .nm("옛 이름")
                        .emlAddr("old@example.com")
                        .mblTelno("01011112222")
                        .addressBook(entity)
                        .build();
        given(addressBookUserRepository.findByAdbkSn(adbkSn)).willReturn(List.of(existing));

        nuri.business.service.addressbook.dto.AddressBookUserDto changed =
                nuri.business.service.addressbook.dto.AddressBookUserDto.builder()
                        .userId("KEEP_ME")
                        .nm("새 이름")
                        .emlAddr("new@example.com")
                        .mblTelno("01033334444")
                        .build();
        AddressBookDto dto = AddressBookDto.builder()
                .adbkSn(adbkSn).adbkNm("팀 주소록").adbkMan(List.of(changed)).build();

        addressBookService.updateAddressBook("user", dto);

        assertThat(existing.getNm()).isEqualTo("새 이름");
        assertThat(existing.getEmlAddr()).isEqualTo("new@example.com");
        assertThat(existing.getMblTelno()).isEqualTo("01033334444");
        // 유지되는 구성원을 지우거나 다시 만들지 않는다 — adbkMbrSn 이 바뀌면 참조가 끊긴다.
        verify(addressBookUserRepository, never()).delete(existing);
        verify(addressBookUserRepository, never()).save(any(nuri.business.domain.addressbook.AddressBookUser.class));
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
