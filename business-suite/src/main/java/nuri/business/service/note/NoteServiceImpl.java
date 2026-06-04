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
public class NoteServiceImpl extends BaseAbstractService implements NoteService {

    private final NoteDomainRepository noteRepository;
    private final NoteTrnsmitDomainRepository noteTrnsmitRepository;
    private final NoteRecptnDomainRepository noteRecptnRepository;

    @org.springframework.beans.factory.annotation.Qualifier("egovNoteIdGnrService")
    private final EgovIdGnrService egovNoteIdGnrService;

    @Override
    public Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable) {
        return noteRecptnRepository
                .searchNoteRecptns(null, searchWrd, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable) {
        return noteTrnsmitRepository
                .searchNoteTrnsmits(null, searchWrd, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public NoteDto getNoteDetail(String noteId, String type, String relationId) {
        if ("sent".equals(type)) {
            return noteTrnsmitRepository.findById(relationId)
                    .map(this::convertToDto)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        } else {
            return noteRecptnRepository.findById(relationId)
                    .map(this::convertToDto)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        }
    }

    @Override
    @Transactional
    public void sendNote(String dsptchUserId, NoteDto dto) {
        try {
            String noteId = egovNoteIdGnrService.getNextStringId();
            Note note = Note.builder()
                    .noteId(noteId)
                    .noteTtl(dto.getNoteSj())
                    .noteCn(dto.getNoteCn())
                    .frstRgtrId(dsptchUserId)
                    .build();
            noteRepository.save(note);

            String trnsmitId = egovNoteIdGnrService.getNextStringId();
            NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                    .noteSndngId(trnsmitId)
                    .note(note)
                    .sndrId(dsptchUserId)
                    .frstRgtrId(dsptchUserId)
                    .build();
            noteTrnsmitRepository.save(trnsmit);

            if (dto.getRcverId() != null) {
                String[] rcverIds = dto.getRcverId().split(",");
                for (String rcverId : rcverIds) {
                    NoteRecptn recptn = NoteRecptn.builder()
                            .noteRcptnId(egovNoteIdGnrService.getNextStringId())
                            .note(note)
                            .noteDsptch(trnsmit)
                            .rcvrId(rcverId.trim())
                            .openYn("N")
                            .rcptnSeCd("0")
                            .frstRgtrId(dsptchUserId)
                            .build();
                    noteRecptnRepository.save(recptn);
                }
            }
        } catch (Exception e) {
            log.error("Failed to send note", e);
            throw new BusinessException("쪽지 발송 중 오류가 발생했습니다.", ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public void deleteNote(String relationId, String type) {
        if ("sent".equals(type)) {
            noteTrnsmitRepository.deleteById(relationId);
        } else {
            noteRecptnRepository.deleteById(relationId);
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
