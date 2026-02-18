package com.company.project.service.note;

import com.company.project.domain.note.*;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.note.dto.NoteDto;
import com.company.project.service.note.dto.NoteRecptnDto;
import com.company.project.service.note.dto.NoteTrnsmitDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NoteService extends EgovAbstractServiceImpl {

    private final NoteDomainRepository noteRepository;
    private final NoteTrnsmitDomainRepository noteTrnsmitRepository;
    private final NoteRecptnDomainRepository noteRecptnRepository;
    private final UserRepository userRepository;

    private final EgovIdGnrService egovNoteIdGnrService;
    private final EgovIdGnrService egovNoteTrnsmitIdGnrService;
    private final EgovIdGnrService egovNoteRecptnIdGnrService;

    @Transactional
    public void sendNote(NoteDto noteDto, List<String> receiverIds, String senderId) throws Exception {
        String noteId = egovNoteIdGnrService.getNextStringId();
        Note note = Note.builder()
                .noteId(noteId)
                .noteSj(noteDto.getNoteSj())
                .noteCn(noteDto.getNoteCn())
                .atchFileId(noteDto.getAtchFileId())
                .frstRegisterId(senderId)
                .lastUpdusrId(senderId)
                .build();
        noteRepository.save(Objects.requireNonNull(note));

        String trnsmitId = egovNoteTrnsmitIdGnrService.getNextStringId();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                .noteTrnsmitId(trnsmitId)
                .note(note)
                .trnsmiterId(senderId)
                .deleteAt("N")
                .frstRegisterId(senderId)
                .lastUpdusrId(senderId)
                .build();
        noteTrnsmitRepository.save(Objects.requireNonNull(trnsmit));

        for (String rcverId : receiverIds) {
            String recptnId = egovNoteRecptnIdGnrService.getNextStringId();
            NoteRecptn recptn = NoteRecptn.builder()
                    .noteRecptnId(recptnId)
                    .note(note)
                    .noteTrnsmit(trnsmit)
                    .rcverId(rcverId)
                    .openYn("N")
                    .recptnSe("1") // Principal receiver
                    .frstRegisterId(senderId)
                    .lastUpdusrId(senderId)
                    .build();
            noteRecptnRepository.save(Objects.requireNonNull(recptn));
        }
    }

    @Transactional(readOnly = true)
    public Page<NoteTrnsmitDto> getSentNotes(String userId, Pageable pageable) {
        Page<NoteTrnsmit> page = noteTrnsmitRepository.findByTrnsmiterIdAndDeleteAt(userId, "N", pageable);

        // Fetch user names for display (Optimized if needed)
        return page.map(entity -> {
            NoteTrnsmitDto dto = NoteTrnsmitDto.from(entity);
            userRepository.findByEsntlId(entity.getTrnsmiterId()).ifPresent(u -> dto.setTrnsmiterNm(u.getUserNm()));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public Page<NoteRecptnDto> getReceivedNotes(String userId, Pageable pageable) {
        Page<NoteRecptn> page = noteRecptnRepository.findByRcverId(userId, pageable);

        return page.map(entity -> {
            NoteRecptnDto dto = NoteRecptnDto.from(entity);
            userRepository.findByEsntlId(entity.getNoteTrnsmit().getTrnsmiterId())
                    .ifPresent(u -> dto.setTrnsmiterNm(u.getUserNm()));
            return dto;
        });
    }

    @Transactional
    public NoteDto getNoteDetail(String noteId, String userId, String type) {
        Note note = noteRepository.findById(Objects.requireNonNull(noteId))
                .orElseThrow(() -> new RuntimeException("Note not found"));

        if ("RECEPTION".equals(type)) {
            noteRecptnRepository.findByNoteNoteIdAndRcverId(noteId, userId).ifPresent(r -> {
                // Mark as read
                if ("N".equals(r.getOpenYn())) {
                    // Using direct field update or custom method if preferred
                    // For now, simple update
                    NoteRecptn updated = NoteRecptn.builder()
                            .noteRecptnId(r.getNoteRecptnId())
                            .note(r.getNote())
                            .noteTrnsmit(r.getNoteTrnsmit())
                            .rcverId(r.getRcverId())
                            .openYn("Y")
                            .recptnSe(r.getRecptnSe())
                            .frstRegisterId(r.getFrstRegisterId())
                            .lastUpdusrId(userId)
                            .build();
                    noteRecptnRepository.save(Objects.requireNonNull(updated));
                }
            });
        }

        return NoteDto.from(note);
    }

    @Transactional
    public void deleteSentNote(String trnsmitId, String userId) {
        noteTrnsmitRepository.findById(Objects.requireNonNull(trnsmitId)).ifPresent(t -> {
            if (t.getTrnsmiterId().equals(userId)) {
                // Logic: In legacy, it might set DELETE_AT = 'Y'
                NoteTrnsmit updated = NoteTrnsmit.builder()
                        .noteTrnsmitId(t.getNoteTrnsmitId())
                        .note(t.getNote())
                        .trnsmiterId(t.getTrnsmiterId())
                        .deleteAt("Y")
                        .frstRegisterId(t.getFrstRegisterId())
                        .lastUpdusrId(userId)
                        .build();
                noteTrnsmitRepository.save(Objects.requireNonNull(updated));
            }
        });
    }

    @Transactional
    public void deleteReceivedNote(String recptnId, String userId) {
        noteRecptnRepository.findById(Objects.requireNonNull(recptnId)).ifPresent(r -> {
            if (r.getRcverId().equals(userId)) {
                noteRecptnRepository.delete(r);
            }
        });
    }
}
