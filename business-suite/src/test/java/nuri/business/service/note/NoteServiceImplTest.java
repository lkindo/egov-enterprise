package nuri.business.service.note;

import nuri.business.domain.note.*;
import nuri.business.service.note.dto.NoteDto;
import nuri.business.service.note.dto.NoteRecipientDto;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("NoteServiceImpl 단위 테스트")
class NoteServiceImplTest {

    @InjectMocks
    private NoteServiceImpl noteService;

    @Mock
    private NoteDomainRepository noteRepository;

    @Mock
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;

    @Mock
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Mock
    private EgovIdGnrService egovNoteManageIdGnrService;

    @Mock
    private EgovIdGnrService egovNoteTrnsmitIdGnrService;

    @Mock
    private EgovIdGnrService egovNoteRecptnIdGnrService;

    @Test
    @DisplayName("받은 쪽지 목록 조회 - 검색어 없음")
    void getReceivedNotes_NoSearchWrd() {
        // given
        String userId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        
        Note note = Note.builder().noteId("N_1").noteSj("Subject 1").build();
        NoteRecptn recptn = NoteRecptn.builder()
                .noteRecptnId("NR_1")
                .rcverId(userId)
                .note(note)
                .build();
                
        Page<NoteRecptn> page = new PageImpl<>(List.of(recptn));
        given(noteRecptnRepository.findByRcverId(eq(userId), eq(pageable))).willReturn(page);

        // when
        Page<NoteDto> result = noteService.getReceivedNotes(userId, null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNoteId()).isEqualTo("N_1");
        assertThat(result.getContent().get(0).getNoteRecptnId()).isEqualTo("NR_1");
    }

    @Test
    @DisplayName("보낸 쪽지 목록 조회 - 검색어 있음")
    void getSentNotes_WithSearchWrd() {
        // given
        String userId = "user1";
        String searchWrd = "test";
        Pageable pageable = PageRequest.of(0, 10);
        
        Note note = Note.builder().noteId("N_2").noteSj("Subject 2").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                .noteTrnsmitId("NT_1")
                .trnsmiterId(userId)
                .note(note)
                .build();
                
        Page<NoteTrnsmit> page = new PageImpl<>(List.of(trnsmit));
        given(noteTrnsmitRepository.searchSentNotes(eq(userId), eq(searchWrd), eq(pageable))).willReturn(page);

        // when
        Page<NoteDto> result = noteService.getSentNotes(userId, searchWrd, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNoteId()).isEqualTo("N_2");
        assertThat(result.getContent().get(0).getNoteTrnsmitId()).isEqualTo("NT_1");
    }

    @Test
    @DisplayName("받은 쪽지 상세 조회")
    void getNoteDetail_Received() {
        // given
        String noteId = "N_1";
        String type = "recv";
        String relationId = "NR_1";
        
        Note note = Note.builder()
                .noteId(noteId)
                .noteSj("Subject")
                .noteCn("Content")
                .build();
        NoteRecptn recptn = NoteRecptn.builder()
                .noteRecptnId(relationId)
                .rcverId("user1")
                .openYn("Y")
                .build();

        given(noteRepository.findById(noteId)).willReturn(Optional.of(note));
        given(noteRecptnRepository.findById(relationId)).willReturn(Optional.of(recptn));

        // when
        NoteDto result = noteService.getNoteDetail(noteId, type, relationId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getNoteId()).isEqualTo(noteId);
        assertThat(result.getNoteRecptnId()).isEqualTo(relationId);
        assertThat(result.getRcverId()).isEqualTo("user1");
        assertThat(result.getOpenYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("쪽지 발송 - 성공")
    void sendNote_Success() throws Exception {
        // given
        String userId = "user1";
        NoteRecipientDto recipient = new NoteRecipientDto();
        recipient.setRcverId("user2");
        recipient.setRecptnSe("1");
        
        NoteDto dto = NoteDto.builder()
                .noteSj("Subject")
                .noteCn("Content")
                .recipients(List.of(recipient))
                .build();

        given(egovNoteManageIdGnrService.getNextStringId()).willReturn("N_1");
        given(egovNoteTrnsmitIdGnrService.getNextStringId()).willReturn("NT_1");
        given(egovNoteRecptnIdGnrService.getNextStringId()).willReturn("NR_1");

        // when
        noteService.sendNote(userId, dto);

        // then
        verify(noteRepository, times(1)).save(any(Note.class));
        verify(noteTrnsmitRepository, times(1)).save(any(NoteTrnsmit.class));
        verify(noteRecptnRepository, times(1)).save(any(NoteRecptn.class));
    }

    @Test
    @DisplayName("받은 쪽지 삭제")
    void deleteNote_Received() {
        // given
        String relationId = "NR_1";
        String type = "recv";

        // when
        noteService.deleteNote(relationId, type);

        // then
        verify(noteRecptnRepository, times(1)).deleteById(relationId);
    }
}
