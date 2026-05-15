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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("NoteService 단위 테스트")
class NoteServiceTest {

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
    @DisplayName("수신 쪽지 목록 조회 - 검색어 없음")
    void getReceivedNotes_NoSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        Note note = Note.builder().noteId("N1").noteSj("S1").build();
        NoteRecptn recptn = NoteRecptn.builder().noteRecptnId("R1").note(note).build();
        given(noteRecptnRepository.findByRcverId("user1", pageable)).willReturn(new PageImpl<>(List.of(recptn)));

        Page<NoteDto> result = noteService.getReceivedNotes("user1", null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNoteRecptnId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("수신 쪽지 목록 조회 - 검색어 포함")
    void getReceivedNotes_WithSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        given(noteRecptnRepository.searchReceivedNotes(anyString(), anyString(), any())).willReturn(new PageImpl<>(List.of()));

        noteService.getReceivedNotes("user1", "word", pageable);

        verify(noteRecptnRepository).searchReceivedNotes("user1", "word", pageable);
    }

    @Test
    @DisplayName("발신 쪽지 목록 조회 - 검색어 없음")
    void getSentNotes_NoSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        Note note = Note.builder().noteId("N1").noteSj("S1").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteDsptchId("T1").note(note).build();
        given(noteTrnsmitRepository.findByTrnsmiterId("user1", pageable)).willReturn(new PageImpl<>(List.of(trnsmit)));

        Page<NoteDto> result = noteService.getSentNotes("user1", "", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNoteDsptchId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("발신 쪽지 목록 조회 - 검색어 포함")
    void getSentNotes_WithSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        given(noteTrnsmitRepository.searchSentNotes(anyString(), anyString(), any())).willReturn(new PageImpl<>(List.of()));

        noteService.getSentNotes("user1", "word", pageable);

        verify(noteTrnsmitRepository).searchSentNotes("user1", "word", pageable);
    }

    @Test
    @DisplayName("쪽지 상세 조회 - 수신 타입")
    void getNoteDetail_Recv() {
        Note note = Note.builder().noteId("N1").noteSj("Sub").build();
        NoteRecptn recptn = NoteRecptn.builder().noteRecptnId("R1").rcverId("user1").build();
        given(noteRepository.findById("N1")).willReturn(Optional.of(note));
        given(noteRecptnRepository.findById("R1")).willReturn(Optional.of(recptn));

        NoteDto dto = noteService.getNoteDetail("N1", "recv", "R1");

        assertThat(dto.getNoteId()).isEqualTo("N1");
        assertThat(dto.getNoteRecptnId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("쪽지 상세 조회 - 발신 타입")
    void getNoteDetail_Sent() {
        Note note = Note.builder().noteId("N1").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteDsptchId("T1").dsptchUserId("user1").build();
        given(noteRepository.findById("N1")).willReturn(Optional.of(note));
        given(noteTrnsmitRepository.findById("T1")).willReturn(Optional.of(trnsmit));

        NoteDto dto = noteService.getNoteDetail("N1", "sent", "T1");

        assertThat(dto.getNoteDsptchId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("쪽지 발송 - 수신자 포함")
    void sendNote_WithRecipients() throws Exception {
        NoteDto dto = NoteDto.builder()
                .noteSj("Title")
                .recipients(List.of(NoteRecipientDto.builder().rcverId("r1").build()))
                .build();
        
        given(egovNoteManageIdGnrService.getNextStringId()).willReturn("N1");
        given(egovNoteTrnsmitIdGnrService.getNextStringId()).willReturn("T1");
        given(egovNoteRecptnIdGnrService.getNextStringId()).willReturn("R1");
        
        given(noteRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));
        given(noteTrnsmitRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));

        noteService.sendNote("user1", dto);

        verify(noteRepository).save(any(Note.class));
        verify(noteTrnsmitRepository).save(any(NoteTrnsmit.class));
        verify(noteRecptnRepository).save(any(NoteRecptn.class));
    }

    @Test
    @DisplayName("쪽지 삭제 - 수신 타입")
    void deleteNote_Recv() {
        noteService.deleteNote("R1", "recv");
        verify(noteRecptnRepository).deleteById("R1");
    }

    @Test
    @DisplayName("쪽지 삭제 - 발신 타입")
    void deleteNote_Sent() {
        NoteTrnsmit t = mock(NoteTrnsmit.class);
        given(noteTrnsmitRepository.findById("T1")).willReturn(Optional.of(t));

        noteService.deleteNote("T1", "sent");

        verify(noteTrnsmitRepository).delete(t);
    }
}
