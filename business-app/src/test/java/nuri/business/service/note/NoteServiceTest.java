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

    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;

    @Mock
    private nuri.business.service.file.AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private NoteService noteService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("받은 쪽지 목록 조회")
    void getReceivedNotes() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(noteRecptnRepository.searchNoteRecptns(anyString(), anyString(), any())).willReturn(new PageImpl<>(List.of()));

        // when
        noteService.getReceivedNotes("user1", "word", pageable);

        // then
        verify(noteRecptnRepository).searchNoteRecptns(eq("word"), eq("user1"), eq(pageable));
    }

    @Test
    @DisplayName("보낸 쪽지 목록 조회")
    void getSentNotes() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(noteTrnsmitRepository.searchNoteTrnsmits(anyString(), anyString(), any())).willReturn(new PageImpl<>(List.of()));

        // when
        noteService.getSentNotes("user1", "word", pageable);

        // then
        verify(noteTrnsmitRepository).searchNoteTrnsmits(eq("word"), eq("user1"), eq(pageable));
    }

    @Test
    @DisplayName("쪽지 발송 시 첨부파일 일련번호(atchFileSn)를 인가 검증 후 저장한다")
    void sendNote_persistsAttachmentAfterPolicyCheck() {
        nuri.business.domain.user.entity.User activeUser = nuri.business.domain.user.entity.User.builder()
                .userId("rcvr1").esntlId("USR_RCVR_1").userNm("수신자").userSttsCd("P").pswd("{bcrypt}x").build();
        given(userRepository.findByEsntlIdIn(List.of("USR_RCVR_1"))).willReturn(List.of(activeUser));

        nuri.business.service.note.dto.NoteDto dto = nuri.business.service.note.dto.NoteDto.builder()
                .rcverId("USR_RCVR_1")
                .noteSj("첨부 쪽지")
                .noteCn("내용")
                .atchFileSn(777L)
                .build();

        noteService.sendNote("USR_SNDR_1", dto);

        verify(attachmentAssignmentPolicy).assertAssignable(777L);
        org.mockito.ArgumentCaptor<nuri.business.domain.note.Note> noteCaptor =
                org.mockito.ArgumentCaptor.forClass(nuri.business.domain.note.Note.class);
        verify(noteRepository).save(noteCaptor.capture());
        org.assertj.core.api.Assertions.assertThat(noteCaptor.getValue().getAtchFileSn()).isEqualTo(777L);
    }

    @Test
    @DisplayName("🚨 화면을 거치지 않은 요청도 수신자 100명·ID 20자 경계에서 400 이고 사용자 조회 전에 멈춘다 (2026-10-27)")
    void sendNote_rejectsReceiverListBeyondScreenBounds() {
        String tooMany = java.util.stream.IntStream.rangeClosed(1, 101)
                .mapToObj(i -> "USR" + i).collect(java.util.stream.Collectors.joining(","));
        String tooLong = "U".repeat(21);

        for (String[] c : new String[][]{{tooMany, "최대 100명"}, {tooLong, "개별 최대 20자"}}) {
            nuri.business.service.note.dto.NoteDto dto = nuri.business.service.note.dto.NoteDto.builder()
                    .rcverId(c[0]).noteSj("제목").noteCn("내용").build();
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> noteService.sendNote("USR_SNDR_1", dto))
                    .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE)
                    .hasMessageContaining(c[1]);
        }
        org.mockito.Mockito.verifyNoInteractions(userRepository);

        // 경계값(100명·20자)은 통과해 사용자 조회로 간다.
        String hundred = java.util.stream.IntStream.rangeClosed(1, 100)
                .mapToObj(i -> String.format("%020d", i)).collect(java.util.stream.Collectors.joining(","));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> noteService.sendNote("USR_SNDR_1",
                        nuri.business.service.note.dto.NoteDto.builder().rcverId(hundred).noteSj("제목").noteCn("내용").build()))
                .hasMessageNotContaining("최대 100명")
                .hasMessageNotContaining("개별 최대 20자");
        verify(userRepository).findByEsntlIdIn(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    @DisplayName("쪽지 삭제 — 한쪽만 지우면 첨부를 유지하고, 양측 모두 지워 본문(Note)을 물리 삭제할 때만 flush 후 미참조 첨부를 수거한다")
    void deleteNote_releasesAttachmentOnlyWhenNoteIsPhysicallyPurged() {
        nuri.business.domain.note.Note note = nuri.business.domain.note.Note.builder()
                .noteSn(50L).noteTtl("첨부 쪽지").atchFileSn(777L).build();
        nuri.business.domain.note.NoteTrnsmit trnsmit = nuri.business.domain.note.NoteTrnsmit.builder()
                .noteSndngSn(10L).note(note).sndrId("USR_SNDR_1").build();
        nuri.business.domain.note.NoteRecptn recptn = nuri.business.domain.note.NoteRecptn.builder()
                .noteRcptnSn(20L).note(note).noteDsptch(trnsmit).rcvrId("USR_RCVR_1").openYn("N").rcptnSeCd("0").build();

        given(noteTrnsmitRepository.findById(10L)).willReturn(java.util.Optional.of(trnsmit));
        given(noteTrnsmitRepository.findByIdForUpdate(10L)).willReturn(java.util.Optional.of(trnsmit));
        given(noteRecptnRepository.countByNoteDsptchNoteSndngSnAndDelYn(10L, "N")).willReturn(1L);

        // 1) 발신자만 삭제(수신자는 아직 미삭제) → 본문·첨부 모두 보존
        noteService.deleteNote(10L, "sent", "USR_SNDR_1");
        org.mockito.Mockito.verify(noteRepository, org.mockito.Mockito.never()).deleteById(anyLong());
        org.mockito.Mockito.verify(attachmentAssignmentPolicy, org.mockito.Mockito.never()).releaseIfUnreferenced(any());

        // 2) 수신자도 삭제(양측 모두 삭제 + 잔여 참조 0) → 본문 물리 삭제 → flush → 미참조 첨부 수거
        given(noteRecptnRepository.findById(20L)).willReturn(java.util.Optional.of(recptn));
        given(noteRecptnRepository.countByNoteDsptchNoteSndngSnAndDelYn(10L, "N")).willReturn(0L);
        given(noteRecptnRepository.findByNoteDsptchNoteSndngSn(10L)).willReturn(List.of(recptn));
        given(noteTrnsmitRepository.countByNoteNoteSn(50L)).willReturn(0L);
        given(noteRecptnRepository.countByNoteNoteSn(50L)).willReturn(0L);

        noteService.deleteNote(20L, "received", "USR_RCVR_1");

        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(noteRepository, attachmentAssignmentPolicy);
        inOrder.verify(noteRepository).deleteById(50L);
        inOrder.verify(noteRepository).flush();
        inOrder.verify(attachmentAssignmentPolicy).releaseIfUnreferenced(777L);
    }
}
