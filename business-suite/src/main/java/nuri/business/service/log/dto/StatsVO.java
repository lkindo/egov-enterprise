package nuri.business.service.log.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * 통계 정보를 담기 위한 VO 클래스
 */
@Getter
@Setter
public class StatsVO {
    private String statsDate;
    private String conectMethod;
    private long statsCo;
    private long creatCo;
    private long updtCo;
    private long inqireCo;
    private long deleteCo;
    private long outptCo;
    private long errorCo;

    // 게시판(BBS) 통계
    private String mxmmInqireBbsId;
    private String mxmmInqireBbsNm;
    private long maxStatsCo;
    private String mummInqireBbsId;
    private String mummInqireBbsNm;
    private long minStatsCo;
    private String topNtcepersonId;
    private long topNtcepersonCo;
}
