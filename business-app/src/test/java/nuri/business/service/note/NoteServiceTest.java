package nuri.business.service.note;

import nuri.business.domain.note.NoteDomainRepository;
import nuri.business.domain.note.NoteRecptnDomainRepository;
import nuri.business.domain.note.NoteTrnsmitDomainRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("NoteService 단위 테스트")
class NoteServiceTest {

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
    @DisplayName("받은 쪽지 목록 조회")
    void getReceivedNotes() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(noteRecptnRepository.searchNoteRecptns(any(), anyString(), anyString(), any())).willReturn(new PageImpl<>(List.of()));

        // when
        noteService.getReceivedNotes("user1", "word", pageable);

        // then
        verify(noteRecptnRepository).searchNoteRecptns(any(), eq("word"), eq("user1"), eq(pageable));
    }

    @Test
    @DisplayName("보낸 쪽지 목록 조회")
    void getSentNotes() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(noteTrnsmitRepository.searchNoteTrnsmits(any(), anyString(), anyString(), any())).willReturn(new PageImpl<>(List.of()));

        // when
        noteService.getSentNotes("user1", "word", pageable);

        // then
        verify(noteTrnsmitRepository).searchNoteTrnsmits(any(), eq("word"), eq("user1"), eq(pageable));
    }
}
