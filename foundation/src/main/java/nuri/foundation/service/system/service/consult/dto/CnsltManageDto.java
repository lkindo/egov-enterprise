package nuri.foundation.service.system.service.consult.dto;

import jakarta.validation.constraints.*;

import nuri.foundation.domain.system.service.consult.CnsltManage;
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
@Schema(description = "상담 관리 DTO")
public class CnsltManageDto {

    @Schema(description = "상담 ID")
    @Size(max = 20)
    private String dscsnId;

    @Schema(description = "상담 제목")
    @Size(max = 100)
    private String dscsnTtl;

    @Schema(description = "상담 내용")
    @Size(max = 4000)
    private String dscsnCn;

    @Schema(description = "공개 여부")
    @Size(max = 1)
    private String rlsYn;

    @Schema(description = "작성 비밀번호")
    @Size(max = 200)
    private String wrtPswd;

    @Schema(description = "작성자명")
    @Size(max = 100)
    private String wrterNm;

    @Schema(description = "지역 번호")
    @Size(max = 4)
    private String areaNo;

    @Schema(description = "중간 전화번호")
    @Size(max = 4)
    private String mdTelno;

    @Schema(description = "끝 전화번호")
    @Size(max = 4)
    private String endTelno;

    @Schema(description = "최초 이동전화 번호")
    @Size(max = 4)
    private String mblFrstTelno;

    @Schema(description = "중간 이동전화 번호")
    @Size(max = 4)
    private String mblMdTelno;

    @Schema(description = "끝 이동전화 번호")
    @Size(max = 4)
    private String mblEndTelno;

    @Schema(description = "이메일 주소")
    @Size(max = 50)
    private String emlAddr;

    @Schema(description = "이메일 답변 여부")
    @Size(max = 1)
    private String emlAnsYn;

    @Schema(description = "조회수")
    private Integer inqCnt;

    @Schema(description = "처리 상태 코드")
    private String qnaProcSttsCd;

    @Schema(description = "첨부파일 ID")
    @Size(max = 30)
    private String atchFileId;

    @Schema(description = "처리 내용")
    @Size(max = 4000)
    private String procCn;

    @Schema(description = "처리 일자")
    @Size(max = 20)
    private String mngYmd;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
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
