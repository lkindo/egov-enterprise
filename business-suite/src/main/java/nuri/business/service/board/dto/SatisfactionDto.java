package nuri.business.service.board.dto;

import nuri.business.domain.board.Satisfaction;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SatisfactionDto {
    private Long satisfactionId;
    private String bbsId;
    private String pstId;
    private String stsfdgCn;
    private Integer stsfdgLevel;
    private String writerId;
    private String writerNm;
    private String password;
    private String useYn;
    private LocalDateTime createdDate;

    // legacy
    public String getBoardId() { return bbsId; }
    public void setBoardId(String v) { this.bbsId = v; }
    public String getArticleId() { return pstId; }
    public void setArticleId(String v) { this.pstId = v; }
    public Integer getSatisfactionLevel() { return stsfdgLevel; }
    public void setSatisfactionLevel(Integer v) { this.stsfdgLevel = v; }
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }

    public static SatisfactionDto from(Satisfaction entity) {
        if (entity == null) return null;
        return SatisfactionDto.builder()
                .satisfactionId(entity.getStsfdgId())
                .bbsId(entity.getBbsId())
                .pstId(entity.getPstId())
                .stsfdgCn(entity.getStsfdgCn())
                .stsfdgLevel(entity.getStsfdgLevel())
                .writerId(entity.getCreatedBy())
                .useYn(entity.getUseYn())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
