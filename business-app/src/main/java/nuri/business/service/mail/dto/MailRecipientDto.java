package nuri.business.service.mail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 메일 수신자 1명 — <b>사용자(esntlId) 또는 이메일 주소(emlAddr) 중 정확히 하나</b>로 지정한다.
 *
 * <p>[2026-09-05 DEC-OPS-035] 종전 화면은 수신자 이메일을 손으로 치고 쉼표로 이어 100자 컬럼
 * ({@code recptnPerson})에 넣었다 — 주소 셋이면 검증에서 막혔다. 이제 수신자마다 발송 이력 1건이
 * 생기므로 인원 제한은 컬럼 폭이 아니라 요청당 상한({@code SentMailDto.recipients} 의 {@code @Size})이다.
 * esntlId 는 서버가 코어 사용자 연락처로 해석하며, 그 주소는 응답으로 되돌아가지 않는다.
 * "둘 중 하나" 규칙은 서비스가 집행한다(둘 다 비었거나 둘 다 있으면 거부).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "메일 수신자 — esntlId(사용자) 또는 emlAddr(이메일 주소) 중 하나")
public class MailRecipientDto {

    @Schema(description = "사용자 고유 ID(esntlId). 지정하면 서버가 등록된 이메일 주소를 해석한다", maxLength = 20)
    @Size(max = 20)
    private String esntlId;

    @Schema(description = "이메일 주소(직접 입력·주소록). esntlId 와 함께 쓰지 않는다", maxLength = 320)
    @Email
    @Size(max = 320)
    private String emlAddr;
}
