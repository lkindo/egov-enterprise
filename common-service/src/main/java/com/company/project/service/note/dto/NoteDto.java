package com.company.project.service.note.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteDto {
    private String noteId;
    private String noteSj;
    private String noteCn;
    private String atchFileId;

    // 발신 정보
    private String noteTrnsmitId;
    private String trnsmiterId;

    // 수신 정보 (목록용 또는 단일 수신자)
    private String noteRecptnId;
    private String rcverId;
    private String openYn;
    private String recptnSe;

    private LocalDateTime frstRegistPnttm;
    private String frstRegisterId;

    private List<NoteRecptnDto> recipients;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NoteRecptnDto {
        private String noteRecptnId;
        private String rcverId;
        private String openYn;
        private String recptnSe;
    }
}
