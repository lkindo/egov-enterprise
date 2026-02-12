package com.company.project.service.ntm.dto;

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
    
    private String noteTrnsmitId;
    private String trnsmiterId;
    private String trnsmiterNm;
    
    private String noteRecptnId;
    private String rcverId;
    private String rcverNm;
    private String openYn;
    private String recptnSe;
    
    private LocalDateTime regDate;
    private List<NoteRecipientDto> recipients;
}
