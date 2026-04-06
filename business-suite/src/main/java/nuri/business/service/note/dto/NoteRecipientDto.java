package nuri.business.service.note.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "쪽지 수신자 정보")
public class NoteRecipientDto {
    @Schema(description = "쪽지 수신 ID")
    private String noteRecptnId;
    @Schema(description = "수신자 ID")
    private String rcverId;
    @Schema(description = "수신자 명")
    private String rcverNm;
    @Schema(description = "수신 구분 (1: 수신, 2: 참조)")
    private String recptnSe;
}
