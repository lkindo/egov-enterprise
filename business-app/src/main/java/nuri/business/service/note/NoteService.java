package nuri.business.service.note;

import nuri.business.service.note.dto.NoteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NoteService {

    Page<NoteDto> getReceivedNotes(String userId, String searchWrd, Pageable pageable);

    Page<NoteDto> getSentNotes(String userId, String searchWrd, Pageable pageable);

    // [보안 H1] 소유자 검증을 위해 요청자(currentUserId) 전달 — 임의 사용자의 타인 쪽지 열람/삭제(IDOR) 차단.
    NoteDto getNoteDetail(String noteId, String type, String relationId, String currentUserId);

    void sendNote(String userId, NoteDto noteDto);

    void deleteNote(String relationId, String type, String currentUserId);
}
