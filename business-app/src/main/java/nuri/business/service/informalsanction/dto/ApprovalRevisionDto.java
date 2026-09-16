package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ApprovalRevisionDto(int atrzCycl, String docTtl, String docCn, String aprvYn,
                                  String reqYmd, LocalDateTime atrzDt, List<ApprovalStageDto> stages) {
}
