package nuri.business.service.informalsanction.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 나의 결재선 저장 요청(2026-10-16 결재 동선 개선 D2, DEC-OPS-328).
 *
 * <p>이름 길이는 {@code tb_ifml_atrz_indv_apln.apln_nm}(결재선명 명V200)의 미러다. 결재선은 상신과 같은 단계 모양을 쓰며,
 * 결재자가 없는 단계는 받지 않는다. 결재자 자격(본인 아님·사용 중·결재 권한)은 서비스가 저장할 때 판정한다.
 *
 * <p>[기능 경계] 컨트롤러는 api-server 에 있지만 이 DTO 는 결재 도메인 패키지에 둔다 — 결재 타입을 참조하지 않는 요청 DTO 가
 * api-server 에 있으면 결재가 빠진 구성에 참조처 없이 남는다(임시저장 요청과 같다).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "나의 결재선 저장 요청 — 주인은 현재 사용자로 고정된다")
public class ApprovalSavedLineRequest {

    @Schema(description = "결재선 이름. 같은 사람의 결재선끼리 겹칠 수 없다", maxLength = 200)
    @NotBlank
    @Size(max = 200)
    private String aplnNm;

    @Schema(description = "진행 순서대로 나열한 결재 단계(1~10단계). 결재자가 없는 단계는 보낼 수 없다")
    @NotNull
    @Size(min = 1, max = 10)
    private List<@NotNull @Valid ApprovalStageRequest> stages;
}
