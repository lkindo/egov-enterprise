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

    /**
     * 쪽지 수신 알림은 foundation 이벤트로 요청한다. 목이 없으면 발송 경로에서 NPE 가 난다 —
     * 알림 요청이 실제로 발행 경로에 결속돼 있다는 증거이기도 하다.
     */
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

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

        /*
         * [2026-08-29] 수신자를 함께 싣는지 확인한다.
         *
         * 종전에는 convertToDto(NoteTrnsmit) 이 수신자 정보를 담지 않아 보낸 쪽지함의
         * '수신자' 열이 **모든 행에서 비어 있었다** — 발신자가 누구에게 보냈는지 목록에서
         * 알 수 없었다. 행마다 조회하면 페이지당 N+1 이므로 페이지의 발신 일련번호를 모아
         * 한 번만 조회한다(그 배치 호출이 일어나는지도 함께 고정한다).
         */
        NoteTrnsmit dsptch = NoteTrnsmit.builder().noteSndngSn(1L).build();
        given(noteRecptnRepository.findByNoteDsptchNoteSndngSnInAndDelYn(List.of(1L), "N"))
                .willReturn(List.of(
                        NoteRecptn.builder().noteRcptnSn(11L).noteDsptch(dsptch).rcvrId("rcv1").build(),
                        NoteRecptn.builder().noteRcptnSn(12L).noteDsptch(dsptch).rcvrId("rcv2").build()));

        // when
        Page<NoteDto> result = noteService.getSentNotes(userId, searchWrd, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRecipients())
                .as("수신자가 비면 발신함의 '수신자' 열이 다시 빈 칸이 된다")
                .hasSize(2)
                .extracting(r -> r.getRcverId())
                .containsExactlyInAnyOrder("rcv1", "rcv2");
        // 행 단위 조회로 되돌아가면(N+1) 이 단언이 잡는다.
        verify(noteRecptnRepository, never()).findByNoteDsptchNoteSndngSn(any());
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
        // [2026-09-02] 열람과 동시에 읽음 처리된다. 종전에는 openYn 을 'Y' 로 바꾸는 코드가
        //   저장소 어디에도 없어 수신함의 모든 쪽지가 영원히 '안 읽음' 이었다.
        assertThat(recptn.getOpenYn()).isEqualTo("Y");
        assertThat(result.getOpenYn()).isEqualTo("Y");
    }

    /**
     * 읽음 처리는 <b>소유자 검증 뒤에</b> 일어나야 한다. 순서가 뒤집히면 남의 수신 사본을
     * 조회 시도만으로 '읽음' 으로 만들 수 있다(접근은 거부되더라도 상태는 이미 바뀐 뒤다).
     */
    @Test
    @DisplayName("[보안 H1] 소유자가 아니면 읽음 처리도 일어나지 않는다")
    void getNoteDetail_received_notOwner_doesNotMarkOpened() {
        Long relationSn = 3L;
        Note note = Note.builder().noteSn(1L).noteTtl("T").noteCn("C").build();
        NoteRecptn recptn = NoteRecptn.builder()
                .noteRcptnSn(relationSn).note(note).rcvrId("user2").openYn("N").build();
        given(noteRecptnRepository.findById(relationSn)).willReturn(Optional.of(recptn));

        assertThatThrownBy(() -> noteService.getNoteDetail(1L, "received", relationSn, "attacker"))
                .isInstanceOf(BusinessException.class);

        assertThat(recptn.getOpenYn()).isEqualTo("N");
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

    /**
     * 쪽지가 도착하면 수신자에게 알린다.
     *
     * <p>종전에는 어떤 사건도 알림을 만들지 않아, 쪽지가 와도 종 아이콘이 조용했다. 수신자는
     * 쪽지함을 직접 열어 보기 전에는 알 방법이 없었다.
     */
    @Test
    @DisplayName("쪽지 발송 시 수신자마다 알림을 요청한다")
    void sendNote_requestsNotificationPerRecipient() {
        noteService.sendNote("user1", NoteDto.builder()
                .noteSj("회의 일정 공유").noteCn("본문").rcverId("user2, user3").build());

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher, times(2)).publishEvent(captor.capture());

        assertThat(captor.getAllValues())
                .extracting(nuri.foundation.core.event.NotificationRequestedEvent::receiverEsntlId)
                .containsExactlyInAnyOrder("user2", "user3");
        assertThat(captor.getAllValues().get(0).linkUrl()).isEqualTo("/note");
    }

    /**
     * 알림은 목록·종 아이콘·WebSocket 으로 퍼진다. 본문을 복제하면 쪽지의 열람 통제
     * ({@code NoteRecptn} 소유자 가드)를 우회하는 사본이 생긴다 — 제목만 싣는다.
     */
    @Test
    @DisplayName("알림에 쪽지 본문을 복제하지 않는다")
    void sendNote_notificationCarriesSubjectNotBody() {
        noteService.sendNote("user1", NoteDto.builder()
                .noteSj("회의 일정 공유").noteCn("대외비 본문 내용").rcverId("user2").build());

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        assertThat(captor.getValue().content()).isEqualTo("회의 일정 공유");
        assertThat(captor.getValue().content()).doesNotContain("대외비 본문 내용");
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
