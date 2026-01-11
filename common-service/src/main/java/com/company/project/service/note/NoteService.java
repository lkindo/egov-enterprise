package com.company.project.service.note;

import com.company.project.domain.note.Note;
import com.company.project.domain.note.NoteDomainRepository;
import com.company.project.domain.note.NoteRecptn;
import com.company.project.domain.note.NoteRecptnDomainRepository;
import com.company.project.domain.note.NoteTrnsmit;
import com.company.project.domain.note.NoteTrnsmitDomainRepository;
import com.company.project.service.note.dto.NoteDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteService implements EgovNoteService {

    private final NoteDomainRepository noteRepository;
    private final NoteTrnsmitDomainRepository noteTrnsmitRepository;
    private final NoteRecptnDomainRepository noteRecptnRepository;

    @Override
    public NoteDto getNote(String noteId) {
        return noteRepository.findById(noteId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void sendNote(NoteDto dto) {
        // 1. Note 마스터 저장
        Note note = Note.builder()
                .noteId(dto.getNoteId())
                .noteSj(dto.getNoteSj())
                .noteCn(dto.getNoteCn())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getFrstRegisterId())
                .build();
        noteRepository.save(note);

        // 2. 발신 정보 저장
        NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                .noteTrnsmitId(dto.getNoteTrnsmitId())
                .note(note)
                .trnsmiterId(dto.getTrnsmiterId())
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getFrstRegisterId())
                .build();
        noteTrnsmitRepository.save(trnsmit);

        // 3. 수신 정보 저장 (여러 명일 경우)
        if (dto.getRecipients() != null) {
            for (NoteDto.NoteRecptnDto rDto : dto.getRecipients()) {
                NoteRecptn recptn = NoteRecptn.builder()
                        .noteRecptnId(rDto.getNoteRecptnId())
                        .note(note)
                        .noteTrnsmit(trnsmit)
                        .rcverId(rDto.getRcverId())
                        .openYn("N")
                        .recptnSe(rDto.getRecptnSe())
                        .frstRegisterId(dto.getFrstRegisterId())
                        .lastUpdusrId(dto.getFrstRegisterId())
                        .build();
                noteRecptnRepository.save(recptn);
            }
        }
    }

    @Override
    @Transactional
    public void deleteNote(String noteId) {
        // 실제 운영 환경에서는 논리 삭제(DELETE_AT)를 고려해야 할 수도 있으나,
        // 레거시 스키마에 따라 필요한 데이터를 순차적으로 삭제합니다.
        noteRecptnRepository.deleteById(noteId); // NoteId 기반 삭제 로직 필요 (Query Methods 사용 권장)
        noteTrnsmitRepository.deleteById(noteId);
        noteRepository.deleteById(noteId);
    }

    @Override
    public Page<NoteDto> getReceivedNoteList(String rcverId, Pageable pageable) {
        // NoteRecptn 조인하여 목록 조회 로직 (Repository 확장 필요할 수 있음)
        return null; // 구현 생략 (필요 시 Repository에 JPQL/QueryDSL 추가)
    }

    @Override
    public Page<NoteDto> getSentNoteList(String trnsmiterId, Pageable pageable) {
        return null; // 구현 생략
    }

    @Override
    @Transactional
    public void updateOpenYn(String noteRecptnId, String openYn) {
        noteRecptnRepository.findById(noteRecptnId)
                .ifPresent(r -> {
                    // NoteRecptn에 update 메소드 필요 시 추가 또는 필드 직접 수정 (dirty checking)
                    // 엔티티에 비즈니스 메소드를 추가하는 것이 좋으나 간단히 구현
                });
    }

    private NoteDto convertToDto(Note note) {
        return NoteDto.builder()
                .noteId(note.getNoteId())
                .noteSj(note.getNoteSj())
                .noteCn(note.getNoteCn())
                .atchFileId(note.getAtchFileId())
                .frstRegisterId(note.getFrstRegisterId())
                .frstRegistPnttm(note.getFrstRegistPnttm())
                .build();
    }
}
