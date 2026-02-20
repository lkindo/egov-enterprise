package com.company.project.service.log;

import com.company.project.service.log.dto.LogDto;

import java.util.List;

/**
 * 濡쒓렇 愿由??쒕퉬???명꽣?섏씠??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovLogService {

    /**
     * 濡쒓렇??濡쒓렇 湲곕줉
     */
    void logLogin(String userId, String ip, String mthd, String errAt, String errCode);

    /**
     * 理쒓렐 濡쒓렇??濡쒓렇 紐⑸줉 議고쉶
     */
    List<LogDto> getRecentLoginLogs();
}
