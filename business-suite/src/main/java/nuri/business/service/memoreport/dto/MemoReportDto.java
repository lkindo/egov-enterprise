package nuri.business.service.memoreport.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.memoreport.MemoReport;
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
@Schema(description = "메모보고 정보")
public class MemoReportDto {

    @Schema(description = "보고아이디")
    private String rptId;

    @Schema(description = "보고제목")
    private String rptTtl;

    @Schema(description = "보고일자")
    private String memoRptYmd;

    @Schema(description = "작성자아이디")
    private String userId;

    @Schema(description = "작성자명")
    @Size(max = 100)
    private String wrterNm;

    @Schema(description = "보고대상자아이디")
    private String rptrId;

    @Schema(description = "보고대상자명")
    private String rptrNm;

    @Schema(description = "보고내용")
    private String rptCn;

    @Schema(description = "첨부파일아이디")
    @Size(max = 30)
    private String atchFileId;

    @Schema(description = "지시사항내용")
    private String drctnMttr;

    @Schema(description = "지시사항등록일시")
    private String drctnMttrRegDt;

    @Schema(description = "보고대상자조회일시")
    private String rptrInqDt;

    @Schema(description = "생성일시")
    private LocalDateTime crtDt;

    public static MemoReportDto from(MemoReport entity) {
        if (entity == null) return null;
        return MemoReportDto.builder()
                .rptId(entity.getRptId())
                .rptTtl(entity.getRptTtl())
                .memoRptYmd(entity.getMemoRptYmd()) 
                .userId(entity.getUserId())
                .rptrId(entity.getRptrId())
                .rptCn(entity.getRptCn())
                .atchFileId(entity.getAtchFileId())
                .drctnMttr(entity.getDrctnMttr())
                .drctnMttrRegDt(entity.getDrctnMttrRegDt())
                .rptrInqDt(entity.getRptrInqDt())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
