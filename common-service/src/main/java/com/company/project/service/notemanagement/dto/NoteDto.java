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
@Schema(description = "쪽지 정보")
public class NoteDto {
    @Schema(description = "쪽지 ID")
    private String noteId;
    @Schema(description = "제목")
    private String noteSj;
    @Schema(description = "내용")
    private String noteCn;
    @Schema(description = "첨부 파일 ID")
    private String atchFileId;

    @Schema(description = "쪽지 발신 ID")
    private String noteTrnsmitId;
    @Schema(description = "발신자 ID")
    private String trnsmiterId;
    @Schema(description = "발신자 명")
    private String trnsmiterNm;

    @Schema(description = "쪽지 수신 ID")
    private String noteRecptnId;
    @Schema(description = "수신자 ID")
    private String rcverId;
    @Schema(description = "수신자 명")
    private String rcverNm;
    @Schema(description = "열람 여부")
    private String openYn;
    @Schema(description = "수신 구분")
    private String recptnSe;

    @Schema(description = "등록 일시")
    private LocalDateTime regDate;
    @Schema(description = "수신자 목록")
    private List<NoteRecipientDto> recipients;
}
