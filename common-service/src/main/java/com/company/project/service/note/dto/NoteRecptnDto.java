package com.company.project.service.note.dto;

import com.company.project.domain.note.NoteRecptn;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteRecptnDto {
    private String noteRecptnId;
    private String noteId;
    private String noteSj;
    private String noteTrnsmitId;
    private String trnsmiterId;
    private String trnsmiterNm;
    private String rcverId;
    private String openYn;
    private String recptnSe;
    private LocalDateTime frstRegistPnttm;

    public static NoteRecptnDto from(NoteRecptn entity) {
        return NoteRecptnDto.builder()
                .noteRecptnId(entity.getNoteRecptnId())
                .noteId(entity.getNote().getNoteId())
                .noteSj(entity.getNote().getNoteSj())
                .noteTrnsmitId(entity.getNoteTrnsmit().getNoteTrnsmitId())
                .trnsmiterId(entity.getNoteTrnsmit().getTrnsmiterId())
                .rcverId(entity.getRcverId())
                .openYn(entity.getOpenYn())
                .recptnSe(entity.getRecptnSe())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .build();
    }
}
