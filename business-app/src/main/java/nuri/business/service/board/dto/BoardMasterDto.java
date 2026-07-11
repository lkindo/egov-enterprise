package nuri.business.service.board.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.board.BoardMaster;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardMasterDto {

    @Size(max = 20)
    private String bbsId;
    @Size(max = 100)
    @NotBlank
    private String bbsTtl;
    @Size(max = 4000)
    private String bbsExpln;
    @Size(max = 12)
    @NotBlank
    private String bbsTypeCd;
    private String bbsTypeCdNm; // 조인 컬럼명 표준화
    @Size(max = 12)
    @NotBlank
    private String bbsAtrbCd;
    private String bbsAtrbCdNm; // 조인 컬럼명 표준화
    private String ansPsbltyYn;
    private String fileAtchPsbltyYn;
    private Integer atchPsbltyFileQty;
    @NotNull
    private Long atchPsbltyFileSz;
    @Size(max = 20)
    private String tmpltId;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    @Size(max = 20)
    private String cmntyId;
    @Size(max = 20)
    private String blogId;
    @Size(max = 1)
    private String blogYn;
    private String ansYn;
    private String stsfdgYn;

    // Additional fields for completeness
    private String authFlag;
    private String tmplatCours;

    public static BoardMasterDto from(BoardMaster entity) {
        if (entity == null)
            return null;
        return BoardMasterDto.builder()
                .bbsId(entity.getBbsId())
                .bbsTtl(entity.getBbsTtl())
                .bbsExpln(entity.getBbsExpln())
                .bbsTypeCd(entity.getBbsTypeCd())
                .bbsAtrbCd(entity.getBbsAtrbCd())
                .ansPsbltyYn(entity.getAnsPsbltyYn())
                .fileAtchPsbltyYn(entity.getFileAtchPsbltyYn())
                .atchPsbltyFileQty(entity.getAtchPsbltyFileQty())
                .atchPsbltyFileSz(entity.getAtchPsbltyFileSz())
                .tmpltId(entity.getTmpltId())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .useYn(entity.getUseYn())
                .cmntyId(entity.getCmntyId())
                .blogId(entity.getBlogId())
                .blogYn(entity.getBlogYn())
                .ansYn(entity.getAnsYn())
                .stsfdgYn(entity.getStsfdgYn())
                .build();
    }
}
