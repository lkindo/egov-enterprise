package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;
import java.util.List;

/** {@code atchFileSn}: 그 차수에 올린 첨부 묶음(V2_151, 없으면 null). */
public record ApprovalRevisionDto(int atrzCycl, String docTtl, String docCn, String aprvYn,
                                  String reqYmd, LocalDateTime atrzDt, List<ApprovalStageDto> stages,
                                  Long atchFileSn) {

    /** 첨부가 없는 차수. */
    public ApprovalRevisionDto(int atrzCycl, String docTtl, String docCn, String aprvYn,
                               String reqYmd, LocalDateTime atrzDt, List<ApprovalStageDto> stages) {
        this(atrzCycl, docTtl, docCn, aprvYn, reqYmd, atrzDt, stages, null);
    }
}
