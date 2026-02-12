package com.company.project.service.ntm;

import com.company.project.service.ntm.dto.NoteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NoteService {
    
    Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable);
    
    Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable);
    
    NoteDto getNoteDetail(String noteId, String type, String relationId); // type: recv, sent
    
    void sendNote(String userId, NoteDto noteDto);
    
    void deleteNote(String relationId, String type); // relationId: noteRecptnId or noteTrnsmitId
}
