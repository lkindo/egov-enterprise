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
import nuri.business.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteService extends BaseAbstractService {

    private final NoteDomainRepository noteRepository;
    private final NoteTrnsmitDomainRepository noteTrnsmitRepository;
    private final NoteRecptnDomainRepository noteRecptnRepository;

    @org.springframework.beans.factory.annotation.Qualifier("egovNoteIdGnrService")
    private final EgovIdGnrService egovNoteIdGnrService;

    public Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable) {
        return noteRecptnRepository
                .searchNoteRecptns(null, searchWrd, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable) {
        return noteTrnsmitRepository
                .searchNoteTrnsmits(null, searchWrd, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public NoteDto getNoteDetail(String noteId, String type, String relationId, String currentUserId) {
        if ("sent".equals(type)) {
            NoteTrnsmit trnsmit = noteTrnsmitRepository.findById(relationId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
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
            NoteRecptn recptn = noteRecptnRepository.findById(relationId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
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
            String noteId = egovNoteIdGnrService.getNextStringId();
            Note note = Note.builder()
                    .noteId(noteId)
                    .noteTtl(dto.getNoteSj())
                    .noteCn(dto.getNoteCn())
                    .build();
            noteRepository.save(note);

            String trnsmitId = egovNoteIdGnrService.getNextStringId();
            NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                    .noteSndngId(trnsmitId)
                    .note(note)
                    .sndrId(dsptchUserId)
                    .build();
            noteTrnsmitRepository.save(trnsmit);

            if (dto.getRcverId() != null) {
                String[] rcverIds = dto.getRcverId().split(",");
                boolean anyRecipient = false;
                for (String raw : rcverIds) {
                    // [V2_21] 공백/NULL 수신자 방어 — rcvr_id NULL 사본은 어떤 수신자도 소유하지 못해
                    // 논리삭제(IDOR 가드 통과 불가)가 영원히 불가능 → 물리 수거를 구조적으로 봉쇄한다. 원천 차단.
                    if (raw == null || raw.trim().isEmpty()) {
                        continue;
                    }
                    anyRecipient = true;
                    NoteRecptn recptn = NoteRecptn.builder()
                            .noteRcptnId(egovNoteIdGnrService.getNextStringId())
                            .note(note)
                            .noteDsptch(trnsmit)
                            .rcvrId(raw.trim())
                            .openYn("N")
                            .rcptnSeCd("0")
                            .build();
                    noteRecptnRepository.save(recptn);
                }
                if (!anyRecipient) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
                }
            }
        } catch (BusinessException e) {
            throw e; // 입력 검증 등 의도된 비즈니스 예외는 그대로 전파
        } catch (Exception e) {
            log.error("Failed to send note", e);
            throw new BusinessException("쪽지 발송 중 오류가 발생했습니다.", CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 쪽지 삭제(파티별 논리삭제, V2_21). 발신자·수신자는 자기 사본만 숨기며 상대 이력은 보존한다.
     * 양측(발신 + 소속 전 수신)이 모두 삭제되면 물리 수거한다.
     */
    @Transactional
    public void deleteNote(String relationId, String type, String currentUserId) {
        if ("sent".equals(type)) {
            NoteTrnsmit trnsmit = noteTrnsmitRepository.findById(relationId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            // [보안 H1] 발신자 본인만 삭제 가능(IDOR 차단)
            if (currentUserId == null || !currentUserId.equals(trnsmit.getSndrId())) {
                throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
            }
            trnsmit.markDeleted();
            purgeIfBothPartiesDeleted(trnsmit.getNoteSndngId());
        } else {
            NoteRecptn recptn = noteRecptnRepository.findById(relationId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            // [보안 H1] 수신자 본인만 삭제 가능(IDOR 차단)
            if (currentUserId == null || !currentUserId.equals(recptn.getRcvrId())) {
                throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
            }
            recptn.markDeleted();
            if (recptn.getNoteDsptch() != null) {
                purgeIfBothPartiesDeleted(recptn.getNoteDsptch().getNoteSndngId());
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
    private void purgeIfBothPartiesDeleted(String noteSndngId) {
        NoteTrnsmit sndng = noteTrnsmitRepository.findByIdForUpdate(noteSndngId).orElse(null);
        if (sndng == null || !"Y".equals(sndng.getDelYn())) {
            return; // 발신자가 아직 삭제하지 않음 → 보류
        }
        // 수신 사본 중 미삭제(del_yn='N')가 하나라도 있으면 보류
        if (noteRecptnRepository.countByNoteDsptchNoteSndngIdAndDelYn(noteSndngId, "N") > 0) {
            return;
        }
        // 양측 모두 삭제 → 물리 수거 (자식 → 부모 순)
        String noteId = sndng.getNote() != null ? sndng.getNote().getNoteId() : null;
        noteRecptnRepository.deleteAll(noteRecptnRepository.findByNoteDsptchNoteSndngId(noteSndngId));
        noteRecptnRepository.flush();
        noteTrnsmitRepository.delete(sndng);
        noteTrnsmitRepository.flush();
        // 쪽지 본문(info)은 이를 참조하는 다른 발신/수신이 전혀 없을 때만 삭제(다중 발신 대비 안전)
        if (noteId != null
                && noteTrnsmitRepository.countByNoteNoteId(noteId) == 0
                && noteRecptnRepository.countByNoteNoteId(noteId) == 0) {
            noteRepository.deleteById(noteId);
        }
    }

    private NoteDto convertToDto(NoteTrnsmit entity) {
        return NoteDto.builder()
                .noteDsptchId(entity.getNoteSndngId())
                .noteSj(entity.getNote() != null ? entity.getNote().getNoteTtl() : null)
                .noteCn(entity.getNote() != null ? entity.getNote().getNoteCn() : null)
                .dsptchUserId(entity.getSndrId())
                .crtDt(entity.getCrtDt())
                .build();
    }

    private NoteDto convertToDto(NoteRecptn entity) {
        return NoteDto.builder()
                .noteDsptchId(entity.getNoteDsptch() != null ? entity.getNoteDsptch().getNoteSndngId() : null)
                .noteRecptnId(entity.getNoteRcptnId())
                .noteId(entity.getNote() != null ? entity.getNote().getNoteId() : null)
                .noteSj(entity.getNote() != null ? entity.getNote().getNoteTtl() : null)
                .noteCn(entity.getNote() != null ? entity.getNote().getNoteCn() : null)
                .dsptchUserId(entity.getNoteDsptch() != null ? entity.getNoteDsptch().getSndrId() : null)
                .rcverId(entity.getRcvrId())
                .openYn(entity.getOpenYn())
                .recptnSe(entity.getRcptnSeCd())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
