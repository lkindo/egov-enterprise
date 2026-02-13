package com.company.project.service.note.dto;

import com.company.project.domain.note.Note;
import lombok.*;

import java.time.LocalDateTime;

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
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static NoteDto from(Note entity) {
        return NoteDto.builder()
                .noteId(entity.getNoteId())
                .noteSj(entity.getNoteSj())
                .noteCn(entity.getNoteCn())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
