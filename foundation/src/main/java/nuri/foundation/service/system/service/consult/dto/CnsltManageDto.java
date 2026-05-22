package nuri.foundation.service.system.service.consult.dto;

import nuri.foundation.domain.system.service.consult.CnsltManage;
import io.swagger.v3.oas.annotations.media.Schema;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Consultation Management DTO")
public class CnsltManageDto {

    @Schema(description = "Consultation ID")
    @JsonProperty("cnsltId")
    private String dscsnId;

    @Schema(description = "Consultation Subject")
    @JsonProperty("cnsltSj")
    private String dscsnTtl;

    @Schema(description = "Consultation Content")
    @JsonProperty("cnsltCn")
    private String dscsnCn;

    @Schema(description = "Public Status")
    @JsonProperty("othbcAt")
    private String rlsYn;

    @Schema(description = "Writing Password")
    @JsonProperty("writngPassword")
    private String wrtPswd;

    @Schema(description = "Writer Name")
    @JsonProperty("wrterNm")
    private String wrterNm;

    @Schema(description = "Area No")
    @JsonProperty("areaNo")
    private String areaNo;

    @Schema(description = "Middle Telno")
    @JsonProperty("middleTelno")
    private String mdTelno;

    @Schema(description = "End Telno")
    @JsonProperty("endTelno")
    private String endTelno;

    @Schema(description = "First Moblphon No")
    @JsonProperty("firstMoblphonNo")
    private String mblFrstTelno;

    @Schema(description = "Middle Mbtlnum")
    @JsonProperty("middleMbtlnum")
    private String mblMdTelno;

    @Schema(description = "End Mbtlnum")
    @JsonProperty("endMbtlnum")
    private String mblEndTelno;

    @Schema(description = "Email Address")
    @JsonProperty("emailAdres")
    private String emlAddr;

    @Schema(description = "Email Answer YN")
    @JsonProperty("emailAnswerAt")
    private String emlAnsYn;

    @Schema(description = "Inquiry Count")
    @JsonProperty("inqireCo")
    private Integer inqCnt;

    @Schema(description = "Process Status Code")
    @JsonProperty("qnaProcessSttusCode")
    private String qnaProcSttsCd;

    @Schema(description = "Attachment File ID")
    @JsonProperty("atchFileId")
    private String atchFileId;

    @Schema(description = "Management Content")
    @JsonProperty("managtCn")
    private String procCn;

    @Schema(description = "Management Date")
    @JsonProperty("managtDe")
    private String mngYmd;

    @Schema(description = "Created By ID")
    private String createdBy;

    @Schema(description = "Created Date")
    private LocalDateTime createdDate;

    public static CnsltManageDto from(CnsltManage entity) {
        if (entity == null)
            return null;
        return CnsltManageDto.builder()
                .dscsnId(entity.getDscsnId())
                .dscsnTtl(entity.getDscsnTtl())
                .dscsnCn(entity.getDscsnCn())
                .rlsYn(entity.getRlsYn())
                .wrtPswd(entity.getWrtPswd())
                .wrterNm(entity.getWrterNm())
                .areaNo(entity.getAreaNo())
                .mdTelno(entity.getMdTelno())
                .endTelno(entity.getEndTelno())
                .mblFrstTelno(entity.getMblFrstTelno())
                .mblMdTelno(entity.getMblMdTelno())
                .mblEndTelno(entity.getMblEndTelno())
                .emlAddr(entity.getEmlAddr())
                .emlAnsYn(entity.getEmlAnsYn())
                .inqCnt(entity.getInqCnt())
                .qnaProcSttsCd(entity.getQnaProcSttsCd())
                .atchFileId(entity.getAtchFileId())
                .procCn(entity.getProcCn())
                .mngYmd(entity.getMngYmd())
                .createdBy(entity.getFrstRegisterId())
                .createdDate(entity.getFrstRegisterPnttm())
                .build();
    }
}
