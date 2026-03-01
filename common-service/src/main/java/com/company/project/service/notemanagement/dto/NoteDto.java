package com.company.project.service.notemanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "ìª½ì? ?•ë³´")
public class NoteDto {
    @Schema(description = "ìª½ì? ID")
    private String noteId;
    @Schema(description = "?œëª©")
    private String noteSj;
    @Schema(description = "?´ìš©")
    private String noteCn;
    @Schema(description = "ì²¨ë? ?Œì¼ ID")
    private String atchFileId;

    @Schema(description = "ìª½ì? ë°œì‹  ID")
    private String noteTrnsmitId;
    @Schema(description = "ë°œì‹ ??ID")
    private String trnsmiterId;
    @Schema(description = "ë°œì‹ ??ëª?)
    private String trnsmiterNm;

    @Schema(description = "ìª½ì? ?˜ì‹  ID")
    private String noteRecptnId;
    @Schema(description = "?˜ì‹ ??ID")
    private String rcverId;
    @Schema(description = "?˜ì‹ ??ëª?)
    private String rcverNm;
    @Schema(description = "?´ëŒ ?¬ë?")
    private String openYn;
    @Schema(description = "?˜ì‹  êµ¬ë¶„")
    private String recptnSe;

    @Schema(description = "?±ë¡ ?¼ì‹œ")
    private LocalDateTime regDate;
    @Schema(description = "?˜ì‹ ??ëª©ë¡")
    private List<NoteRecipientDto> recipients;
}
