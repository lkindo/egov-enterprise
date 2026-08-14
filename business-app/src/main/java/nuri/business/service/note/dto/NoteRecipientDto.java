package nuri.business.service.note.dto;

import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "쪽지 수신자 정보 DTO")
public class NoteRecipientDto {

    @NotNull
    @Schema(description = "쪽지 수신 일련번호")
    private Long noteRcptnSn;

    @NotBlank
    @Size(max = 20)
    @Schema(description = "수신자 ID")
    private String rcverId;

    @Size(max = 50)
    @Schema(description = "수신자 명")
    private String rcverNm;

    @NotBlank
    @Size(max = 12)
    @Schema(description = "수신 구분 (1: 수신, 2: 참조)")
    private String recptnSe;
}
