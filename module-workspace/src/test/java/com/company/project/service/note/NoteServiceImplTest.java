package com.company.project.service.note;

import com.company.project.domain.note.*;
import com.company.project.service.note.dto.NoteDto;
import com.company.project.service.note.dto.NoteRecipientDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("NoteServiceImpl 테스트")
class NoteServiceImplTest {

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

    @InjectMocks
    private NoteServiceImpl noteService;

    @Test
    @DisplayName("수신 쪽지 목록 조회")
    void getReceivedNotes_Success() {
        Note note = Note.builder().noteId("N1").noteSj("Title").build();
        NoteRecptn recptn = NoteRecptn.builder().noteRecptnId("R1").note(note).rcverId("user1").build();
        Page<NoteRecptn> page = new PageImpl<>(List.of(recptn));
        
        given(noteRecptnRepository.findByRcverId(eq("user1"), any(Pageable.class))).willReturn(page);

        Page<NoteDto> result = noteService.getReceivedNotes("user1", null, Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNoteSj()).isEqualTo("Title");
    }

    @Test
    @DisplayName("발신 쪽지 목록 조회")
    void getSentNotes_Success() {
        Note note = Note.builder().noteId("N1").noteSj("Title").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteTrnsmitId("T1").note(note).trnsmiterId("user1").build();
        Page<NoteTrnsmit> page = new PageImpl<>(List.of(trnsmit));

        given(noteTrnsmitRepository.findByTrnsmiterId(eq("user1"), any(Pageable.class))).willReturn(page);

        Page<NoteDto> result = noteService.getSentNotes("user1", "", Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("쪽지 상세 조회 - 수신")
    void getNoteDetail_Recv_Success() {
        Note note = Note.builder().noteId("N1").noteSj("Sj").noteCn("Cn").build();
        given(noteRepository.findById("N1")).willReturn(Optional.of(note));
        
        NoteRecptn recptn = NoteRecptn.builder().noteRecptnId("R1").rcverId("user1").openYn("N").build();
        given(noteRecptnRepository.findById("R1")).willReturn(Optional.of(recptn));

        NoteDto result = noteService.getNoteDetail("N1", "recv", "R1");
        assertThat(result.getNoteId()).isEqualTo("N1");
        assertThat(result.getRcverId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("쪽지 상세 조회 - 발신")
    void getNoteDetail_Sent_Success() {
        Note note = Note.builder().noteId("N1").build();
        given(noteRepository.findById("N1")).willReturn(Optional.of(note));

        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteTrnsmitId("T1").trnsmiterId("user1").build();
        given(noteTrnsmitRepository.findById("T1")).willReturn(Optional.of(trnsmit));

        NoteDto result = noteService.getNoteDetail("N1", "sent", "T1");
        assertThat(result.getTrnsmiterId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("쪽지 발송 성공")
    void sendNote_Success() throws Exception {
        given(egovNoteManageIdGnrService.getNextStringId()).willReturn("N_NEW");
        given(egovNoteTrnsmitIdGnrService.getNextStringId()).willReturn("T_NEW");
        given(egovNoteRecptnIdGnrService.getNextStringId()).willReturn("R_NEW");

        NoteDto dto = NoteDto.builder()
                .noteSj("Title")
                .noteCn("Content")
                .recipients(List.of(NoteRecipientDto.builder().rcverId("rcv1").build()))
                .build();

        noteService.sendNote("user1", dto);
        
        verify(noteRepository).save(any(Note.class));
        verify(noteTrnsmitRepository).save(any(NoteTrnsmit.class));
        verify(noteRecptnRepository).save(any(NoteRecptn.class));
    }

    @Test
    @DisplayName("쪽지 삭제 - 수신")
    void deleteNote_Recv_Success() {
        noteService.deleteNote("R1", "recv");
        verify(noteRecptnRepository).deleteById("R1");
    }

    @Test
    @DisplayName("쪽지 삭제 - 발신")
    void deleteNote_Sent_Success() {
        NoteTrnsmit trnsmit = mock(NoteTrnsmit.class);
        given(noteTrnsmitRepository.findById("T1")).willReturn(Optional.of(trnsmit));

        noteService.deleteNote("T1", "sent");
        verify(noteTrnsmitRepository).delete(trnsmit);
    }
}
