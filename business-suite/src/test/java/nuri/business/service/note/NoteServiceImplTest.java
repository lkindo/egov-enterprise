package nuri.business.service.note;

import nuri.business.domain.note.Note;
import nuri.business.domain.note.NoteDomainRepository;
import nuri.business.domain.note.NoteRecptn;
import nuri.business.domain.note.NoteRecptnDomainRepository;
import nuri.business.domain.note.NoteTrnsmit;
import nuri.business.domain.note.NoteTrnsmitDomainRepository;
import nuri.business.service.note.dto.NoteDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@DisplayName("NoteServiceImpl 단위 테스트")
class NoteServiceImplTest {

    @Mock
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;

    @Mock
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Mock
    private NoteDomainRepository noteRepository;

    @Mock
    private EgovIdGnrService egovNoteIdGnrService;

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
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngId("T1").build();
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
        NoteRecptn recptn = NoteRecptn.builder().noteRcptnId("R1").build();
        Page<NoteRecptn> page = new PageImpl<>(List.of(recptn));

        given(noteRecptnRepository.searchNoteRecptns(any(), eq(searchWrd), eq(userId), eq(pageable))).willReturn(page);

        // when
        Page<NoteDto> result = noteService.getReceivedNotes(userId, searchWrd, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("보낸 쪽지 상세 조회 성공")
    void getNoteDetail_sent_success() {
        // given
        String relationId = "T1";
        Note note = Note.builder().noteId("N1").noteTtl("Title").noteCn("Content").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngId(relationId).note(note).sndrId("user1").build();

        given(noteTrnsmitRepository.findById(relationId)).willReturn(Optional.of(trnsmit));

        // when
        NoteDto result = noteService.getNoteDetail("N1", "sent", relationId);

        // then
        assertThat(result.getNoteDsptchId()).isEqualTo(relationId);
        assertThat(result.getNoteSj()).isEqualTo("Title");
        assertThat(result.getNoteCn()).isEqualTo("Content");
    }

    @Test
    @DisplayName("보낸 쪽지 상세 조회 실패 - 존재하지 않음")
    void getNoteDetail_sent_notFound() {
        // given
        String relationId = "T1";
        given(noteTrnsmitRepository.findById(relationId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> noteService.getNoteDetail("N1", "sent", relationId))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("받은 쪽지 상세 조회 성공")
    void getNoteDetail_received_success() {
        // given
        String relationId = "R1";
        Note note = Note.builder().noteId("N1").noteTtl("Title").noteCn("Content").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngId("T1").sndrId("user1").build();
        NoteRecptn recptn = NoteRecptn.builder()
                .noteRcptnId(relationId)
                .note(note)
                .noteDsptch(trnsmit)
                .rcvrId("user2")
                .openYn("N")
                .rcptnSeCd("0")
                .build();

        given(noteRecptnRepository.findById(relationId)).willReturn(Optional.of(recptn));

        // when
        NoteDto result = noteService.getNoteDetail("N1", "received", relationId);

        // then
        assertThat(result.getNoteRecptnId()).isEqualTo(relationId);
        assertThat(result.getNoteSj()).isEqualTo("Title");
        assertThat(result.getNoteCn()).isEqualTo("Content");
    }

    @Test
    @DisplayName("받은 쪽지 상세 조회 실패 - 존재하지 않음")
    void getNoteDetail_received_notFound() {
        // given
        String relationId = "R1";
        given(noteRecptnRepository.findById(relationId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> noteService.getNoteDetail("N1", "received", relationId))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("쪽지 발송 성공 - 단일 수신자")
    void sendNote_singleRecipient() throws Exception {
        // given
        String dsptchUserId = "user1";
        NoteDto dto = NoteDto.builder()
                .noteSj("Subject")
                .noteCn("Message")
                .rcverId("user2")
                .build();

        given(egovNoteIdGnrService.getNextStringId()).willReturn("ID-1", "ID-2", "ID-3");

        // when
        noteService.sendNote(dsptchUserId, dto);

        // then
        verify(noteRepository, times(1)).save(any(Note.class));
        verify(noteTrnsmitRepository, times(1)).save(any(NoteTrnsmit.class));
        verify(noteRecptnRepository, times(1)).save(any(NoteRecptn.class));
    }

    @Test
    @DisplayName("쪽지 발송 성공 - 다중 수신자 콤마 파싱")
    void sendNote_multipleRecipients() throws Exception {
        // given
        String dsptchUserId = "user1";
        NoteDto dto = NoteDto.builder()
                .noteSj("Subject")
                .noteCn("Message")
                .rcverId("user2, user3")
                .build();

        given(egovNoteIdGnrService.getNextStringId()).willReturn("N-ID", "T-ID", "R-ID1", "R-ID2");

        // when
        noteService.sendNote(dsptchUserId, dto);

        // then
        verify(noteRepository, times(1)).save(any(Note.class));
        verify(noteTrnsmitRepository, times(1)).save(any(NoteTrnsmit.class));
        // 수신자가 2명이므로 2번 호출되어야 함
        verify(noteRecptnRepository, times(2)).save(any(NoteRecptn.class));
    }

    @Test
    @DisplayName("쪽지 발송 실패 - ID 생성 오류 발생 시 비즈니스 예외 전환")
    void sendNote_failure_internalError() throws Exception {
        // given
        String dsptchUserId = "user1";
        NoteDto dto = NoteDto.builder().noteSj("Subject").noteCn("Message").build();

        given(egovNoteIdGnrService.getNextStringId()).willThrow(new RuntimeException("ID generator failed"));

        // when & then
        assertThatThrownBy(() -> noteService.sendNote(dsptchUserId, dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("쪽지 발송 중 오류가 발생했습니다.")
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    @Test
    @DisplayName("보낸 쪽지 삭제")
    void deleteNote_sent() {
        // given
        String relationId = "T1";

        // when
        noteService.deleteNote(relationId, "sent");

        // then
        verify(noteTrnsmitRepository, times(1)).deleteById(relationId);
        verify(noteRecptnRepository, never()).deleteById(anyString());
    }

    @Test
    @DisplayName("받은 쪽지 삭제")
    void deleteNote_received() {
        // given
        String relationId = "R1";

        // when
        noteService.deleteNote(relationId, "received");

        // then
        verify(noteRecptnRepository, times(1)).deleteById(relationId);
        verify(noteTrnsmitRepository, never()).deleteById(anyString());
    }
}
