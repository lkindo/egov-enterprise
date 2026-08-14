package nuri.business.service.note;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.note.Note;
import nuri.business.domain.note.NoteDomainRepository;
import nuri.business.domain.note.NoteRecptn;
import nuri.business.domain.note.NoteRecptnDomainRepository;
import nuri.business.domain.note.NoteTrnsmit;
import nuri.business.domain.note.NoteTrnsmitDomainRepository;
import nuri.business.service.note.dto.NoteDto;
import nuri.foundation.core.exception.BusinessException;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@DisplayName("NoteService 단위 테스트")
class NoteServiceImplTest {

    @Mock
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;

    @Mock
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Mock
    private NoteDomainRepository noteRepository;

    @InjectMocks
    private NoteService noteService;

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
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngSn(1L).build();
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
        NoteRecptn recptn = NoteRecptn.builder().noteRcptnSn(1L).build();
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
        Long relationSn = 2L;
        Note note = Note.builder().noteSn(1L).noteTtl("Title").noteCn("Content").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngSn(relationSn).note(note).sndrId("user1").build();

        given(noteTrnsmitRepository.findById(relationSn)).willReturn(Optional.of(trnsmit));

        // when
        NoteDto result = noteService.getNoteDetail(1L, "sent", relationSn, "user1");

        // then
        assertThat(result.getNoteSndngSn()).isEqualTo(relationSn);
        assertThat(result.getNoteSj()).isEqualTo("Title");
        assertThat(result.getNoteCn()).isEqualTo("Content");
    }

    @Test
    @DisplayName("보낸 쪽지 상세 조회 실패 - 존재하지 않음")
    void getNoteDetail_sent_notFound() {
        // given
        Long relationSn = 2L;
        given(noteTrnsmitRepository.findById(relationSn)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> noteService.getNoteDetail(1L, "sent", relationSn, "user1"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("[보안 H1] 보낸 쪽지 상세 조회 - 소유자 아니면 ACCESS_DENIED (IDOR 차단)")
    void getNoteDetail_sent_notOwner_accessDenied() {
        Long relationSn = 2L;
        Note note = Note.builder().noteSn(1L).build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                .noteSndngSn(relationSn)
                .note(note)
                .sndrId("user1")
                .build();
        given(noteTrnsmitRepository.findById(relationSn)).willReturn(Optional.of(trnsmit));

        assertThatThrownBy(() -> noteService.getNoteDetail(1L, "sent", relationSn, "attacker"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("받은 쪽지 상세 조회 성공")
    void getNoteDetail_received_success() {
        // given
        Long relationSn = 3L;
        Note note = Note.builder().noteSn(1L).noteTtl("Title").noteCn("Content").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngSn(2L).sndrId("user1").build();
        NoteRecptn recptn = NoteRecptn.builder()
                .noteRcptnSn(relationSn)
                .note(note)
                .noteDsptch(trnsmit)
                .rcvrId("user2")
                .openYn("N")
                .rcptnSeCd("0")
                .build();

        given(noteRecptnRepository.findById(relationSn)).willReturn(Optional.of(recptn));

        // when
        NoteDto result = noteService.getNoteDetail(1L, "received", relationSn, "user2");

        // then
        assertThat(result.getNoteRcptnSn()).isEqualTo(relationSn);
        assertThat(result.getNoteSj()).isEqualTo("Title");
        assertThat(result.getNoteCn()).isEqualTo("Content");
    }

    @Test
    @DisplayName("받은 쪽지 상세 조회 실패 - 존재하지 않음")
    void getNoteDetail_received_notFound() {
        // given
        Long relationSn = 3L;
        given(noteRecptnRepository.findById(relationSn)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> noteService.getNoteDetail(1L, "received", relationSn, "user1"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("[보안 H1] 받은 쪽지 상세 조회 - 소유자 아니면 ACCESS_DENIED (IDOR 차단)")
    void getNoteDetail_received_notOwner_accessDenied() {
        // given: 수신자는 user2인데 요청자는 attacker
        Long relationSn = 3L;
        Note note = Note.builder().noteSn(1L).noteTtl("T").noteCn("C").build();
        NoteRecptn recptn = NoteRecptn.builder().noteRcptnSn(relationSn).note(note).rcvrId("user2").build();
        given(noteRecptnRepository.findById(relationSn)).willReturn(Optional.of(recptn));

        // when & then
        assertThatThrownBy(() -> noteService.getNoteDetail(1L, "received", relationSn, "attacker"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
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

        // when
        noteService.sendNote(dsptchUserId, dto);

        // then
        verify(noteRepository, times(1)).save(any(Note.class));
        verify(noteTrnsmitRepository, times(1)).save(any(NoteTrnsmit.class));
        // 수신자가 2명이므로 2번 호출되어야 함
        verify(noteRecptnRepository, times(2)).save(any(NoteRecptn.class));
    }

    @Test
    @DisplayName("보낸 쪽지 삭제 - 발신자 소프트삭제(수신자 미삭제 시 물리 수거 없음)")
    void deleteNote_sent_softDelete_noPurge() {
        // given
        Long relationSn = 2L;
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngSn(relationSn).sndrId("user1").delYn("N").build();
        given(noteTrnsmitRepository.findById(relationSn)).willReturn(Optional.of(trnsmit));
        given(noteTrnsmitRepository.findByIdForUpdate(relationSn)).willReturn(Optional.of(trnsmit));
        // 미삭제 수신 사본이 남아 있으면 수거 보류
        given(noteRecptnRepository.countByNoteDsptchNoteSndngSnAndDelYn(relationSn, "N")).willReturn(1L);

        // when
        noteService.deleteNote(relationSn, "sent", "user1");

        // then — 소프트삭제만, 물리 수거 없음
        assertThat(trnsmit.getDelYn()).isEqualTo("Y");
        verify(noteTrnsmitRepository, never()).delete(any());
        verify(noteRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("받은 쪽지 삭제 - 수신자 소프트삭제")
    void deleteNote_received_softDelete() {
        // given (noteDsptch null → 수거 판정 생략)
        Long relationSn = 3L;
        NoteRecptn recptn = NoteRecptn.builder().noteRcptnSn(relationSn).rcvrId("user2").build();
        given(noteRecptnRepository.findById(relationSn)).willReturn(Optional.of(recptn));

        // when
        noteService.deleteNote(relationSn, "received", "user2");

        // then
        assertThat(recptn.getDelYn()).isEqualTo("Y");
        verify(noteRecptnRepository, never()).delete(any());
    }

    @Test
    @DisplayName("양측 삭제 완료 시 물리 수거 — rcptn→sndng→info 순")
    void deleteNote_bothPartiesDeleted_purge() {
        // given: 발신은 이미 삭제(delYn='Y'), 마지막 수신 삭제로 양측 완료
        Long sndngSn = 2L, noteSn = 1L, rcptnSn = 3L;
        Note note = Note.builder().noteSn(noteSn).build();
        NoteTrnsmit sndng = NoteTrnsmit.builder().noteSndngSn(sndngSn).note(note).sndrId("user1").delYn("Y").build();
        NoteRecptn recptn = NoteRecptn.builder().noteRcptnSn(rcptnSn).note(note).noteDsptch(sndng).rcvrId("user2").build();
        given(noteRecptnRepository.findById(rcptnSn)).willReturn(Optional.of(recptn));
        given(noteTrnsmitRepository.findByIdForUpdate(sndngSn)).willReturn(Optional.of(sndng));
        given(noteRecptnRepository.countByNoteDsptchNoteSndngSnAndDelYn(sndngSn, "N")).willReturn(0L);
        given(noteRecptnRepository.findByNoteDsptchNoteSndngSn(sndngSn)).willReturn(List.of(recptn));
        given(noteTrnsmitRepository.countByNoteNoteSn(noteSn)).willReturn(0L);
        given(noteRecptnRepository.countByNoteNoteSn(noteSn)).willReturn(0L);

        // when
        noteService.deleteNote(rcptnSn, "received", "user2");

        // then — 자식(rcptn) → 부모(sndng) → 본문(info) 순 물리 수거
        var order = inOrder(noteRecptnRepository, noteTrnsmitRepository, noteRepository);
        order.verify(noteRecptnRepository).deleteAll(List.of(recptn));
        order.verify(noteTrnsmitRepository).delete(sndng);
        order.verify(noteRepository).deleteById(noteSn);
    }

    @Test
    @DisplayName("[보안 H1] 쪽지 삭제 - 소유자 아니면 ACCESS_DENIED (IDOR 차단)")
    void deleteNote_notOwner_accessDenied() {
        // given: 발신자는 user1인데 요청자는 attacker
        Long relationSn = 2L;
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngSn(relationSn).sndrId("user1").build();
        given(noteTrnsmitRepository.findById(relationSn)).willReturn(Optional.of(trnsmit));

        // when & then
        assertThatThrownBy(() -> noteService.deleteNote(relationSn, "sent", "attacker"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(trnsmit.getDelYn()).isNotEqualTo("Y"); // 소프트삭제조차 되지 않음
    }

    @Test
    @DisplayName("쪽지 발송 - 공백/NULL 수신자 거부(INVALID_INPUT_VALUE)")
    void sendNote_blankRecipients_rejected() throws Exception {
        // given: 전부 공백인 수신자 → NULL-rcvr 사본(수거 영구봉쇄 원천) 생성 차단
        NoteDto dto = NoteDto.builder().noteSj("S").noteCn("M").rcverId("  , ,").build();

        // when & then
        assertThatThrownBy(() -> noteService.sendNote("user1", dto))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(noteRecptnRepository, never()).save(any());
    }

    @Test
    @DisplayName("보낸 쪽지 상세 - 소프트삭제된 건은 RESOURCE_NOT_FOUND")
    void getNoteDetail_sent_softDeleted_notFound() {
        Long relationSn = 2L;
        Note note = Note.builder().noteSn(1L).build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngSn(relationSn).note(note).sndrId("user1").delYn("Y").build();
        given(noteTrnsmitRepository.findById(relationSn)).willReturn(Optional.of(trnsmit));

        assertThatThrownBy(() -> noteService.getNoteDetail(1L, "sent", relationSn, "user1"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }
}
