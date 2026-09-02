package nuri.business.service.note;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.note.Note;
import nuri.business.domain.note.NoteDomainRepository;
import nuri.business.domain.note.NoteRecptn;
import nuri.business.domain.note.NoteRecptnDomainRepository;
import nuri.business.domain.note.NoteTrnsmit;
import nuri.business.domain.note.NoteTrnsmitDomainRepository;
import nuri.business.service.note.dto.NoteDto;
import nuri.business.service.note.dto.NoteRecipientDto;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import nuri.foundation.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteService {

    private final NoteDomainRepository noteRepository;
    private final NoteTrnsmitDomainRepository noteTrnsmitRepository;
    private final NoteRecptnDomainRepository noteRecptnRepository;

    /**
     * 쪽지 수신 알림을 foundation 이벤트로 요청한다({@code NotificationService} 를 주입하지 않는다).
     *
     * <p>주입하면 note→notification 이라는 새 교차 도메인 결합이 생겨 GAP-ARCH-001 의 잔여
     * 목록이 늘어난다. 발행만 하면 어느 쪽도 상대를 import 하지 않는다.
     */
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable) {
        return noteRecptnRepository
                .searchNoteRecptns(null, searchWrd, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /**
     * 보낸 쪽지함.
     *
     * <p>[2026-08-29] 수신자를 함께 싣는다. 종전에는 {@code convertToDto(NoteTrnsmit)} 이
     * 수신자 정보를 담지 않아 화면의 '수신자' 열이 **모든 행에서 비어 있었다** — 발신자가
     * 누구에게 보냈는지 목록에서 알 수 없었다.
     *
     * <p>행마다 조회하면 페이지당 N+1 이므로 페이지의 발신 일련번호를 모아 한 번만 조회한다.
     * 수신자는 발신자 본인의 쪽지에 속한 값이라 추가 인가 판단이 필요 없다(이 메서드는 이미
     * sndrId = userId 로 스코핑된다).
     */
    public Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable) {
        Page<NoteTrnsmit> page = noteTrnsmitRepository
                .searchNoteTrnsmits(null, searchWrd, userId, Objects.requireNonNull(pageable));
        if (page.isEmpty()) {
            return page.map(this::convertToDto);
        }

        List<Long> sndngSns = page.getContent().stream()
                .map(NoteTrnsmit::getNoteSndngSn)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, List<NoteRecipientDto>> bySndngSn = noteRecptnRepository
                .findByNoteDsptchNoteSndngSnInAndDelYn(sndngSns, "N").stream()
                .filter(r -> r.getNoteDsptch() != null && r.getNoteDsptch().getNoteSndngSn() != null)
                .collect(Collectors.groupingBy(
                        r -> r.getNoteDsptch().getNoteSndngSn(),
                        Collectors.mapping(r -> NoteRecipientDto.builder()
                                .noteRcptnSn(r.getNoteRcptnSn())
                                .rcverId(r.getRcvrId())
                                .recptnSe(r.getRcptnSeCd())
                                .build(), Collectors.toList())));

        return page.map(entity -> {
            NoteDto dto = convertToDto(entity);
            dto.setRecipients(bySndngSn.getOrDefault(entity.getNoteSndngSn(), List.of()));
            return dto;
        });
    }

    public NoteDto getNoteDetail(Long noteSn, String type, Long relationSn, String currentUserId) {
        if ("sent".equals(type)) {
            NoteTrnsmit trnsmit = noteTrnsmitRepository.findById(relationSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            assertNoteRelation(noteSn, trnsmit.getNote());
            // [보안 H1] 발신자 본인만 조회 가능(IDOR 차단)
            if (currentUserId == null || !currentUserId.equals(trnsmit.getSndrId())) {
                throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
            }
            // [V2_21] 발신자가 삭제한 쪽지는 목록에서 숨긴 것과 일관되게 상세도 부재로 처리
            if ("Y".equals(trnsmit.getDelYn())) {
                throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
            }
            return convertToDto(trnsmit);
        } else {
            NoteRecptn recptn = noteRecptnRepository.findById(relationSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            assertNoteRelation(noteSn, recptn.getNote());
            // [보안 H1] 수신자 본인만 조회 가능(IDOR 차단)
            if (currentUserId == null || !currentUserId.equals(recptn.getRcvrId())) {
                throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
            }
            // [V2_21] 수신자가 삭제한 사본은 상세도 부재로 처리
            if ("Y".equals(recptn.getDelYn())) {
                throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
            }
            return convertToDto(recptn);
        }
    }

    @Transactional
    public void sendNote(String dsptchUserId, NoteDto dto) {
        try {
            Note note = Note.builder()
                    .noteTtl(dto.getNoteSj())
                    .noteCn(dto.getNoteCn())
                    .build();
            noteRepository.save(note);

            NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                    .note(note)
                    .sndrId(dsptchUserId)
                    .build();
            noteTrnsmitRepository.save(trnsmit);

            if (dto.getRcverId() != null) {
                String[] rcverIds = dto.getRcverId().split(",");
                boolean anyRecipient = false;
                java.util.List<String> notifyTargets = new java.util.ArrayList<>();
                for (String raw : rcverIds) {
                    // [V2_21] 공백/NULL 수신자 방어 — rcvr_id NULL 사본은 어떤 수신자도 소유하지 못해
                    // 논리삭제(IDOR 가드 통과 불가)가 영원히 불가능 → 물리 수거를 구조적으로 봉쇄한다. 원천 차단.
                    if (raw == null || raw.trim().isEmpty()) {
                        continue;
                    }
                    anyRecipient = true;
                    String receiverId = raw.trim();
                    NoteRecptn recptn = NoteRecptn.builder()
                            .note(note)
                            .noteDsptch(trnsmit)
                            .rcvrId(receiverId)
                            .openYn("N")
                            .rcptnSeCd("0")
                            .build();
                    noteRecptnRepository.save(recptn);
                    notifyTargets.add(receiverId);
                }
                if (!anyRecipient) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
                }
                publishReceivedNotifications(notifyTargets, dto.getNoteSj());
            }
        } catch (BusinessException e) {
            throw e; // 입력 검증 등 의도된 비즈니스 예외는 그대로 전파
        } catch (Exception e) {
            log.error("Failed to send note", e);
            throw new BusinessException("쪽지 발송 중 오류가 발생했습니다.", CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 쪽지 수신 알림 요청.
     *
     * <p><b>반드시 커밋 이후에 발행한다.</b> 커밋 전에 발행하면 롤백된 쪽지에 대한 알림이 남아
     * 사용자가 존재하지 않는 쪽지를 보러 간다. 쪽지함이 비어 있는데 알림만 있는 상태가 그것이다.
     *
     * <p><b>제목만 싣고 본문은 싣지 않는다.</b> 알림은 목록·종 아이콘·WebSocket 으로 퍼지므로
     * 본문을 복제하면 쪽지의 열람 통제({@code NoteRecptn} 소유자 가드)를 우회하는 사본이 생긴다.
     * 알림은 "왔다" 를 알리고, 내용은 쪽지함에서 본인이 연다.
     */
    private void publishReceivedNotifications(java.util.List<String> receiverIds, String subject) {
        if (receiverIds.isEmpty()) {
            return;
        }
        String title = org.springframework.util.StringUtils.hasText(subject) ? subject : "(제목 없음)";
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> {
            for (String receiverId : receiverIds) {
                eventPublisher.publishEvent(new nuri.foundation.core.event.NotificationRequestedEvent(
                        receiverId,
                        "새 쪽지",
                        title,
                        "/note"));
            }
        });
    }

    /**
     * 쪽지 삭제(파티별 논리삭제, V2_21). 발신자·수신자는 자기 사본만 숨기며 상대 이력은 보존한다.
     * 양측(발신 + 소속 전 수신)이 모두 삭제되면 물리 수거한다.
     */
    @Transactional
    public void deleteNote(Long relationSn, String type, String currentUserId) {
        if ("sent".equals(type)) {
            NoteTrnsmit trnsmit = noteTrnsmitRepository.findById(relationSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            // [보안 H1] 발신자 본인만 삭제 가능(IDOR 차단)
            if (currentUserId == null || !currentUserId.equals(trnsmit.getSndrId())) {
                throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
            }
            trnsmit.markDeleted();
            purgeIfBothPartiesDeleted(trnsmit.getNoteSndngSn());
        } else {
            NoteRecptn recptn = noteRecptnRepository.findById(relationSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            // [보안 H1] 수신자 본인만 삭제 가능(IDOR 차단)
            if (currentUserId == null || !currentUserId.equals(recptn.getRcvrId())) {
                throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
            }
            recptn.markDeleted();
            if (recptn.getNoteDsptch() != null) {
                purgeIfBothPartiesDeleted(recptn.getNoteDsptch().getNoteSndngSn());
            }
        }
    }

    /**
     * 발신·수신 양측이 모두 논리삭제된 경우에만 물리 수거.
     * <ul>
     *   <li><b>레이스 차단</b>: 부모 발신(sndng)을 PESSIMISTIC_WRITE 로 잠근 뒤 판정 — 두 당사자의
     *       동시 삭제가 '아무도 수거 안 함' 또는 '이중 수거'로 갈라지지 않도록 직렬화한다.</li>
     *   <li><b>cascade 혼용 금지</b>: Note.noteRecptns/noteTrnsmits(cascade=ALL) 에 의존하지 않고
     *       rcptn → flush → sndng → (잔여 참조 0 확인) info 순으로 명시 삭제해 FK 순서를 보장한다.</li>
     * </ul>
     */
    private void purgeIfBothPartiesDeleted(Long noteSndngSn) {
        NoteTrnsmit sndng = noteTrnsmitRepository.findByIdForUpdate(noteSndngSn).orElse(null);
        if (sndng == null || !"Y".equals(sndng.getDelYn())) {
            return; // 발신자가 아직 삭제하지 않음 → 보류
        }
        // 수신 사본 중 미삭제(del_yn='N')가 하나라도 있으면 보류
        if (noteRecptnRepository.countByNoteDsptchNoteSndngSnAndDelYn(noteSndngSn, "N") > 0) {
            return;
        }
        // 양측 모두 삭제 → 물리 수거 (자식 → 부모 순)
        Long noteSn = sndng.getNote() != null ? sndng.getNote().getNoteSn() : null;
        noteRecptnRepository.deleteAll(noteRecptnRepository.findByNoteDsptchNoteSndngSn(noteSndngSn));
        noteRecptnRepository.flush();
        noteTrnsmitRepository.delete(sndng);
        noteTrnsmitRepository.flush();
        // 쪽지 본문(info)은 이를 참조하는 다른 발신/수신이 전혀 없을 때만 삭제(다중 발신 대비 안전)
        if (noteSn != null
                && noteTrnsmitRepository.countByNoteNoteSn(noteSn) == 0
                && noteRecptnRepository.countByNoteNoteSn(noteSn) == 0) {
            noteRepository.deleteById(noteSn);
        }
    }

    private NoteDto convertToDto(NoteTrnsmit entity) {
        return NoteDto.builder()
                .noteSndngSn(entity.getNoteSndngSn())
                .noteSn(entity.getNote() != null ? entity.getNote().getNoteSn() : null)
                .noteSj(entity.getNote() != null ? entity.getNote().getNoteTtl() : null)
                .noteCn(entity.getNote() != null ? entity.getNote().getNoteCn() : null)
                .dsptchUserId(entity.getSndrId())
                .crtDt(entity.getCrtDt())
                .build();
    }

    private NoteDto convertToDto(NoteRecptn entity) {
        return NoteDto.builder()
                .noteSndngSn(entity.getNoteDsptch() != null ? entity.getNoteDsptch().getNoteSndngSn() : null)
                .noteRcptnSn(entity.getNoteRcptnSn())
                .noteSn(entity.getNote() != null ? entity.getNote().getNoteSn() : null)
                .noteSj(entity.getNote() != null ? entity.getNote().getNoteTtl() : null)
                .noteCn(entity.getNote() != null ? entity.getNote().getNoteCn() : null)
                .dsptchUserId(entity.getNoteDsptch() != null ? entity.getNoteDsptch().getSndrId() : null)
                .rcverId(entity.getRcvrId())
                .openYn(entity.getOpenYn())
                .recptnSe(entity.getRcptnSeCd())
                .crtDt(entity.getCrtDt())
                .build();
    }

    private void assertNoteRelation(Long noteSn, Note note) {
        if (note == null || !Objects.equals(noteSn, note.getNoteSn())) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
    }
}
