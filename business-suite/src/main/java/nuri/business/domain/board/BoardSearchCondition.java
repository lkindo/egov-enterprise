package nuri.business.domain.board;

import lombok.Data;
import org.springframework.lang.NonNull;

@Data
public class BoardSearchCondition {
    @NonNull
    private String bbsId;
    private String searchCnd;
    private String searchWrd;
    private String useYn;
    private String frstRgtrId;
    private java.time.LocalDateTime startDate;
    private java.time.LocalDateTime endDate;
    private String orderBy; // "date", "views", "comments"
    private String qnaSttsCd;
    private String qnaCatCd;

    // Legacy / Aliases
    public String getQnaStatus() { return qnaSttsCd; }
    public void setQnaStatus(String v) { this.qnaSttsCd = v; }
    public String getQnaCategory() { return qnaCatCd; }
    public void setQnaCategory(String v) { this.qnaCatCd = v; }

    // Default constructor for cases where full initialization isn't needed
    // immediately
    public BoardSearchCondition() {
        this.bbsId = "";
    }

    public BoardSearchCondition(@NonNull String bbsId) {
        this.bbsId = bbsId;
    }

    public void validateDates() {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new nuri.foundation.core.exception.BusinessException(
                "시작일은 종료일보다 빨라야 합니다.", nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
