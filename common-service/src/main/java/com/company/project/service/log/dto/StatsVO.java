package com.company.project.service.log.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * ?듦퀎 ?뺣낫瑜??꾪븳 VO ?대옒??
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

    // BBS 愿??
    private String mxmmInqireBbsId;
    private String mxmmInqireBbsNm;
    private long maxStatsCo;
    private String mummInqireBbsId;
    private String mummInqireBbsNm;
    private long minStatsCo;
    private String topNtcepersonId;
    private long topNtcepersonCo;
}
