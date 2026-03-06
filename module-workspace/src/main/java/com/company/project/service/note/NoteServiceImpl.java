package com.company.project.service.note;

import com.company.project.domain.note.*;
import com.company.project.service.note.dto.NoteDto;
import com.company.project.service.note.dto.NoteRecipientDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 쪽지 관리를 위한 서비스 구현 클래스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteServiceImpl implements NoteService {

    private final NoteDomainRepository noteRepository;
    private final NoteTrnsmitDomainRepository noteTrnsmitRepository;
    private final NoteRecptnDomainRepository noteRecptnRepository;

    private final EgovIdGnrService egovNoteManageIdGnrService;
    private final EgovIdGnrService egovNoteTrnsmitIdGnrService;
    private final EgovIdGnrService egovNoteRecptnIdGnrService;

    @Override
    public Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable) {
        if (searchWrd == null || searchWrd.isEmpty()) {
            return noteRecptnRepository.findByRcverId(Objects.requireNonNull(userId), Objects.requireNonNull(pageable))
                    .map(this::convertToDto);
        }
        return noteRecptnRepository.searchReceivedNotes(userId, searchWrd, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable) {
        if (searchWrd == null || searchWrd.isEmpty()) {
            return noteTrnsmitRepository
                    .findByTrnsmiterId(Objects.requireNonNull(userId), Objects.requireNonNull(pageable))
                    .map(this::convertToDto);
        }
        return noteTrnsmitRepository.searchSentNotes(userId, searchWrd, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public NoteDto getNoteDetail(String noteId, String type, String relationId) {
        Note note = noteRepository.findById(Objects.requireNonNull(noteId))
                .orElseThrow(() -> new IllegalArgumentException("Note not found: " + noteId));

        NoteDto dto = NoteDto.builder()
                .noteId(note.getNoteId())
                .noteSj(note.getNoteSj())
                .noteCn(note.getNoteCn())
                .atchFileId(note.getAtchFileId())
                .regDate(note.getFrstRegistPnttm())
                .build();

        if ("recv".equals(type)) {
            NoteRecptn recptn = noteRecptnRepository.findById(Objects.requireNonNull(relationId)).orElse(null);
            if (recptn != null) {
                dto.setNoteRecptnId(recptn.getNoteRecptnId());
                dto.setRcverId(recptn.getRcverId());
                dto.setOpenYn(recptn.getOpenYn());
                // 열람 여부 업데이트 (필요시)
            }
        } else if ("sent".equals(type)) {
            NoteTrnsmit trnsmit = noteTrnsmitRepository.findById(Objects.requireNonNull(relationId)).orElse(null);
            if (trnsmit != null) {
                dto.setNoteTrnsmitId(trnsmit.getNoteTrnsmitId());
                dto.setTrnsmiterId(trnsmit.getTrnsmiterId());
            }
        }

        return dto;
    }

    @Override
    @Transactional
    public void sendNote(String userId, NoteDto dto) {
        try {
            String noteId = egovNoteManageIdGnrService.getNextStringId();
            Note note = Note.builder()
                    .noteId(noteId)
                    .noteSj(dto.getNoteSj())
                    .noteCn(dto.getNoteCn())
                    .atchFileId(dto.getAtchFileId())
                    .frstRegisterId(userId)
                    .build();
            noteRepository.save(Objects.requireNonNull(note));

            String trnsmitId = egovNoteTrnsmitIdGnrService.getNextStringId();
            NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                    .noteTrnsmitId(trnsmitId)
                    .note(note)
                    .trnsmiterId(userId)
                    .deleteAt("N")
                    .frstRegisterId(userId)
                    .build();
            noteTrnsmitRepository.save(Objects.requireNonNull(trnsmit));

            if (dto.getRecipients() != null) {
                for (NoteRecipientDto rDto : dto.getRecipients()) {
                    String recptnId = egovNoteRecptnIdGnrService.getNextStringId();
                    NoteRecptn recptn = NoteRecptn.builder()
                            .noteRecptnId(recptnId)
                            .note(note)
                            .noteTrnsmit(trnsmit)
                            .rcverId(rDto.getRcverId())
                            .openYn("N")
                            .recptnSe(rDto.getRecptnSe())
                            .frstRegisterId(userId)
                            .build();
                    noteRecptnRepository.save(Objects.requireNonNull(recptn));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to send note", e);
        }
    }

    @Override
    @Transactional
    public void deleteNote(String relationId, String type) {
        if ("recv".equals(type)) {
            noteRecptnRepository.deleteById(Objects.requireNonNull(relationId));
        } else {
            noteTrnsmitRepository.findById(Objects.requireNonNull(relationId)).ifPresent(t -> {
                noteTrnsmitRepository.delete(Objects.requireNonNull(t));
            });
        }
    }

    private NoteDto convertToDto(NoteRecptn entity) {
        Note note = Objects.requireNonNull(entity.getNote());
        return NoteDto.builder()
                .noteId(note.getNoteId())
                .noteSj(note.getNoteSj())
                .noteRecptnId(entity.getNoteRecptnId())
                .rcverId(entity.getRcverId())
                .openYn(entity.getOpenYn())
                .regDate(entity.getFrstRegistPnttm())
                .build();
    }

    private NoteDto convertToDto(NoteTrnsmit entity) {
        Note note = Objects.requireNonNull(entity.getNote());
        return NoteDto.builder()
                .noteId(note.getNoteId())
                .noteSj(note.getNoteSj())
                .noteTrnsmitId(entity.getNoteTrnsmitId())
                .trnsmiterId(entity.getTrnsmiterId())
                .regDate(entity.getFrstRegistPnttm())
                .build();
    }
}
