package nuri.business.service.note;

import nuri.business.domain.note.NoteDomainRepository;
import nuri.business.domain.note.NoteRecptn;
import nuri.business.domain.note.NoteRecptnDomainRepository;
import nuri.business.domain.note.NoteTrnsmit;
import nuri.business.domain.note.NoteTrnsmitDomainRepository;
import nuri.business.service.note.dto.NoteDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;

@DisplayName("NoteServiceImpl 단위 테스트")
class NoteServiceImplTest {

    @Mock
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;

    @Mock
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Mock
    private NoteDomainRepository noteRepository;

    @InjectMocks
    private NoteServiceImpl noteService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("보낸 쪽지 목록 조회")
    void getSentNotes() {
        // given
        String userId = "user1";
        String searchWrd = "test";
        Pageable pageable = PageRequest.of(0, 10);
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteDsptchId("T1").build();
        Page<NoteTrnsmit> page = new PageImpl<>(List.of(trnsmit));

        given(noteTrnsmitRepository.searchNoteTrnsmits(any(), eq(searchWrd), eq(userId), eq(pageable))).willReturn(page);

        // when
        Page<NoteDto> result = noteService.getSentNotes(userId, searchWrd, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("받은 쪽지 목록 조회")
    void getReceivedNotes() {
        // given
        String userId = "user1";
        String searchWrd = "test";
        Pageable pageable = PageRequest.of(0, 10);
        NoteRecptn recptn = NoteRecptn.builder().noteRecptnId("R1").build();
        Page<NoteRecptn> page = new PageImpl<>(List.of(recptn));

        given(noteRecptnRepository.searchNoteRecptns(any(), eq(searchWrd), eq(userId), eq(pageable))).willReturn(page);

        // when
        Page<NoteDto> result = noteService.getReceivedNotes(userId, searchWrd, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }
}
