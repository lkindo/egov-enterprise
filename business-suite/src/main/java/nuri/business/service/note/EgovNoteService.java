package nuri.business.service.note;

import nuri.business.service.note.dto.NoteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovNoteService {
    Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable);
    Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable);
    NoteDto getNoteDetail(String noteId, String type, String relationId);
    void sendNote(String userId, NoteDto noteDto);
    void deleteNote(String relationId, String type);
}
