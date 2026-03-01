package com.company.project.service.notemanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "ìª½ì? ?˜ì‹ ???•ë³´")
public class NoteRecipientDto {
    @Schema(description = "ìª½ì? ?˜ì‹  ID")
    private String noteRecptnId;
    @Schema(description = "?˜ì‹ ??ID")
    private String rcverId;
    @Schema(description = "?˜ì‹ ??ëª?)
    private String rcverNm;
    @Schema(description = "?˜ì‹  êµ¬ë¶„ (1: ?˜ì‹ , 2: ì°¸ì¡°)")
    private String recptnSe;
}
