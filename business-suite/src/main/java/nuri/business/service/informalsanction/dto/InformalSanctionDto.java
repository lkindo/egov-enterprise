package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.InformalSanction;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "비정형 결재 DTO (표준화)")
public class InformalSanctionDto {

    @JsonProperty("informalSanctionId")
    @Schema(description = "비정형 결재 ID")
    private String ifmlAtrzId;

    @JsonProperty("jobSeCode")
    @Schema(description = "업무 구분 코드")
    private String taskSeCd;

    @JsonProperty("jobSeNm")
    @Schema(description = "업무 구분 명")
    private String taskSeNm;

    @JsonProperty("applicantId")
    @Schema(description = "신청자 ID")
    private String aplcntId;

    @JsonProperty("applicantNm")
    @Schema(description = "신청자 명")
    private String aplcntNm;

    @JsonProperty("requestDe")
    @Schema(description = "신청 일자")
    private String reqYmd;

    @JsonProperty("sanctionerId")
    @Schema(description = "결재자 ID")
    private String aprvrId;

    @JsonProperty("sanctionerNm")
    @Schema(description = "결재자 명")
    private String aprvrNm;

    @JsonProperty("sanctionerOrgnztNm")
    @Schema(description = "결재자 조직 명")
    private String aprvrOrgnztNm;

    @JsonProperty("confmAt")
    @Schema(description = "승인 여부")
    private String aprvYn;

    @JsonProperty("sanctionDt")
    @Schema(description = "결재 일시")
    private LocalDateTime atrzDt;

    @JsonProperty("returnResn")
    @Schema(description = "반려 사유")
    private String rjctRsnCn;

    @JsonProperty("createdBy")
    @Schema(description = "등록자 ID")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    // legacy
    @JsonIgnore
    public String getInformalSanctionId() { return ifmlAtrzId; }
    @JsonIgnore
    public void setInformalSanctionId(String informalSanctionId) { this.ifmlAtrzId = informalSanctionId; }
    @JsonIgnore
    public String getJobSeCode() { return taskSeCd; }
    @JsonIgnore
    public void setJobSeCode(String jobSeCode) { this.taskSeCd = jobSeCode; }
    @JsonIgnore
    public String getJobSeNm() { return taskSeNm; }
    @JsonIgnore
    public void setJobSeNm(String jobSeNm) { this.taskSeNm = jobSeNm; }
    @JsonIgnore
    public String getApplicantId() { return aplcntId; }
    @JsonIgnore
    public void setApplicantId(String applicantId) { this.aplcntId = applicantId; }
    @JsonIgnore
    public String getApplicantNm() { return aplcntNm; }
    @JsonIgnore
    public void setApplicantNm(String applicantNm) { this.aplcntNm = applicantNm; }
    @JsonIgnore
    public String getRequestDe() { return reqYmd; }
    @JsonIgnore
    public void setRequestDe(String requestDe) { this.reqYmd = requestDe; }
    @JsonIgnore
    public String getSanctionerId() { return aprvrId; }
    @JsonIgnore
    public void setSanctionerId(String sanctionerId) { this.aprvrId = sanctionerId; }
    @JsonIgnore
    public String getSanctionerNm() { return aprvrNm; }
    @JsonIgnore
    public void setSanctionerNm(String sanctionerNm) { this.aprvrNm = sanctionerNm; }
    @JsonIgnore
    public String getSanctionerOrgnztNm() { return aprvrOrgnztNm; }
    @JsonIgnore
    public void setSanctionerOrgnztNm(String sanctionerOrgnztNm) { this.aprvrOrgnztNm = sanctionerOrgnztNm; }
    @JsonIgnore
    public String getConfmAt() { return aprvYn; }
    @JsonIgnore
    public void setConfmAt(String confmAt) { this.aprvYn = confmAt; }
    @JsonIgnore
    public LocalDateTime getSanctionDt() { return atrzDt; }
    @JsonIgnore
    public void setSanctionDt(LocalDateTime sanctionDt) { this.atrzDt = sanctionDt; }
    @JsonIgnore
    public String getReturnResn() { return rjctRsnCn; }
    @JsonIgnore
    public void setReturnResn(String returnResn) { this.rjctRsnCn = returnResn; }

    @JsonIgnore
    public String getInfrmlSanctnId() { return ifmlAtrzId; }
    @JsonIgnore
    public String getApplcntId() { return aplcntId; }
    @JsonIgnore
    public String getReqstDe() { return reqYmd; }
    @JsonIgnore
    public String getSancltNm() { return taskSeNm; }

    public static InformalSanctionDto from(InformalSanction entity) {
        if (entity == null)
            return null;
        return InformalSanctionDto.builder()
                .ifmlAtrzId(entity.getIfmlAtrzId())
                .taskSeCd(entity.getTaskSeCd())
                .aplcntId(entity.getAplcntId())
                .reqYmd(entity.getReqYmd())
                .aprvrId(entity.getAprvrId())
                .aprvYn(entity.getAprvYn())
                .atrzDt(entity.getAtrzDt())
                .rjctRsnCn(entity.getRjctRsnCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
