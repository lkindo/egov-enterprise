package com.company.project.service.note;

import com.company.project.service.note.dto.NoteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovNoteService {
    NoteDto getNote(String noteId);

    void sendNote(NoteDto dto);

    void deleteNote(String noteId);

    // 수신/발신 목록 조회 (검색 조건 등은 추후 VO 등으로 확장 가능)
    Page<NoteDto> getReceivedNoteList(String rcverId, Pageable pageable);

    Page<NoteDto> getSentNoteList(String trnsmiterId, Pageable pageable);

    void updateOpenYn(String noteRecptnId, String openYn);
}
