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
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

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
                    .noteSj(dto.getNoteSj())
                    .noteCn(dto.getNoteCn())
                    .createdBy(dsptchUserId)
                    .build();
            noteRepository.save(note);

            String trnsmitId = egovNoteIdGnrService.getNextStringId();
            NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                    .noteDsptchId(trnsmitId)
                    .note(note)
                    .dsptchUserId(dsptchUserId)
                    .createdBy(dsptchUserId)
                    .build();
            noteTrnsmitRepository.save(trnsmit);

            if (dto.getRcverId() != null) {
                String[] rcverIds = dto.getRcverId().split(",");
                for (String rcverId : rcverIds) {
                    NoteRecptn recptn = NoteRecptn.builder()
                            .noteRecptnId(egovNoteIdGnrService.getNextStringId())
                            .note(note)
                            .noteDsptch(trnsmit)
                            .rcverId(rcverId.trim())
                            .openYn("N")
                            .recptnSeCd("0")
                            .createdBy(dsptchUserId)
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
                .noteDsptchId(entity.getNoteDsptchId())
                .noteSj(entity.getNote() != null ? entity.getNote().getNoteSj() : null)
                .noteCn(entity.getNote() != null ? entity.getNote().getNoteCn() : null)
                .dsptchUserId(entity.getDsptchUserId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }

    private NoteDto convertToDto(NoteRecptn entity) {
        return NoteDto.builder()
                .noteDsptchId(entity.getNoteDsptch() != null ? entity.getNoteDsptch().getNoteDsptchId() : null)
                .noteRecptnId(entity.getNoteRecptnId())
                .noteId(entity.getNote() != null ? entity.getNote().getNoteId() : null)
                .noteSj(entity.getNote() != null ? entity.getNote().getNoteSj() : null)
                .noteCn(entity.getNote() != null ? entity.getNote().getNoteCn() : null)
                .dsptchUserId(entity.getNoteDsptch() != null ? entity.getNoteDsptch().getDsptchUserId() : null)
                .rcverId(entity.getRcverId())
                .openYn(entity.getOpenYn())
                .recptnSe(entity.getRecptnSeCd())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }
}
