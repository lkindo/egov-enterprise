package nuri.business.service.addressbook;

import nuri.business.domain.addressbook.AddressBook;
import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.domain.addressbook.AddressBookUser;
import nuri.business.domain.addressbook.AddressBookUserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AddressBookSnapshotConflictTest {
    @Mock private AddressBookRepository books;
    @Mock private AddressBookUserRepository members;
    @InjectMocks private AddressBookService service;
    private MockedStatic<SecurityUtil> security;
    private AddressBook book;
    private AddressBookUser first;
    private AddressBookUser second;
    private List<AddressBookUser> current;

    @BeforeEach
    void prepare() {
        security = mockStatic(SecurityUtil.class);
        book = AddressBook.builder().adbkSn(1L).adbkNm("팀 주소록").rlsScopeCd("P").useYn("Y").build();
        first = AddressBookUser.builder().adbkMbrSn(11L).addressBook(book).nm("첫 연락처").build();
        second = AddressBookUser.builder().adbkMbrSn(12L).addressBook(book).nm("둘째 연락처").build();
        current = new ArrayList<>(List.of(first, second));
        given(books.findById(1L)).willReturn(Optional.of(book));
        given(books.findByIdForUpdate(1L)).willReturn(Optional.of(book));
        given(members.findByAdbkSn(1L)).willAnswer(invocation -> new ArrayList<>(current));
    }

    @AfterEach
    void closeSecurity() { security.close(); }

    @Test
    void staleDifferentMemberSnapshotCannotUndoEarlierChange() {
        AddressBookDto earlier = service.getAddressBook(1L);
        AddressBookDto stale = service.getAddressBook(1L);
        earlier.getAdbkMan().get(0).setNm("먼저 저장한 이름");
        stale.getAdbkMan().get(1).setNm("나중에 편집한 이름");
        service.updateAddressBook("owner", earlier);

        assertConflict(stale);
        assertThat(first.getNm()).isEqualTo("먼저 저장한 이름");
        assertThat(second.getNm()).isEqualTo("둘째 연락처");
    }

    @Test
    void staleSameMemberSnapshotIsRejected() {
        AddressBookDto earlier = service.getAddressBook(1L);
        AddressBookDto stale = service.getAddressBook(1L);
        earlier.getAdbkMan().get(0).setNm("먼저 저장");
        stale.getAdbkMan().get(0).setNm("오래된 저장");
        service.updateAddressBook("owner", earlier);
        assertConflict(stale);
        assertThat(first.getNm()).isEqualTo("먼저 저장");
    }

    @Test
    void missingTokenDoesNotWriteAnything() {
        AddressBookDto request = service.getAddressBook(1L);
        request.setEditToken(null);
        request.setAdbkNm("덮어쓰기");
        assertConflict(request);
        assertThat(book.getAdbkNm()).isEqualTo("팀 주소록");
        verify(members, never()).delete(any());
        verify(members, never()).save(any());
    }

    @Test
    void snapshotBeforeMemberWasAddedCannotDeleteTheNewMember() {
        AddressBookDto stale = service.getAddressBook(1L);
        AddressBookUser added = AddressBookUser.builder().adbkMbrSn(13L).addressBook(book).nm("새 연락처").build();
        current.add(added);
        assertConflict(stale);
        verify(members, never()).delete(added);
    }

    @Test
    void snapshotBeforeMemberDeletionCannotRestoreTheDeletedContact() {
        AddressBookDto stale = service.getAddressBook(1L);
        current.remove(first);
        assertConflict(stale);
        verify(members, never()).save(any());
    }

    @Test
    void freshReadAllowsExplicitNewIntentAndOmittedUseYnIsPreserved() {
        AddressBookDto earlier = service.getAddressBook(1L);
        earlier.getAdbkMan().get(0).setNm("첫 변경");
        service.updateAddressBook("owner", earlier);
        AddressBookDto fresh = service.getAddressBook(1L);
        fresh.setUseYn(null);
        fresh.getAdbkMan().get(1).setNm("다음 변경");
        service.updateAddressBook("owner", fresh);
        assertThat(first.getNm()).isEqualTo("첫 변경");
        assertThat(second.getNm()).isEqualTo("다음 변경");
        assertThat(book.getUseYn()).isEqualTo("Y");
    }

    @Test
    void tokenDoesNotDependOnMemberQueryOrder() {
        String initial = service.getAddressBook(1L).getEditToken();
        java.util.Collections.reverse(current);
        assertThat(initial).matches("[a-f0-9]{64}");
        assertThat(service.getAddressBook(1L).getEditToken()).isEqualTo(initial);
    }

    private void assertConflict(AddressBookDto request) {
        assertThatThrownBy(() -> service.updateAddressBook("owner", request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
    }
}
