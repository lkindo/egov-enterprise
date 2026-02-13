package com.company.project.service.note.dto;

import com.company.project.domain.note.NoteTrnsmit;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteTrnsmitDto {
    private String noteTrnsmitId;
    private String noteId;
    private String noteSj;
    private String trnsmiterId;
    private String trnsmiterNm;
    private String deleteAt;
    private LocalDateTime frstRegistPnttm;

    public static NoteTrnsmitDto from(NoteTrnsmit entity) {
        return NoteTrnsmitDto.builder()
                .noteTrnsmitId(entity.getNoteTrnsmitId())
                .noteId(entity.getNote().getNoteId())
                .noteSj(entity.getNote().getNoteSj())
                .trnsmiterId(entity.getTrnsmiterId())
                .deleteAt(entity.getDeleteAt())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .build();
    }
}
