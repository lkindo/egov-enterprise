package nuri.business.service.note.dto;

import jakarta.validation.constraints.*;

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
    @Schema(description = "쪽지 일련번호")
    private Long noteSn;
    @Schema(description = "제목")
    private String noteSj;
    @Schema(description = "내용")
    @Size(max = 4000)
    private String noteCn;
    @Schema(description = "첨부파일 일련번호")
    private Long atchFileSn;

    @Schema(description = "쪽지 발송 일련번호")
    private Long noteSndngSn;
    @Schema(description = "발신자 ID")
    private String dsptchUserId;
    @Schema(description = "발신자 명")
    private String trnsmiterNm;

    @Schema(description = "쪽지 수신 일련번호")
    private Long noteRcptnSn;
    @Schema(description = "수신자 ID")
    private String rcverId;
    @Schema(description = "수신자 명")
    private String rcverNm;
    @Schema(description = "열람 여부")
    @Size(max = 1)
    private String openYn;
    @Schema(description = "수신 구분")
    private String recptnSe;

    @Schema(description = "등록 일시")
    private LocalDateTime regDate;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime crtDt;

    @Schema(description = "수신자 목록")
    @Builder.Default
    private List<NoteRecipientDto> recipients = new java.util.ArrayList<>();
}
