package com.company.project.service.auth;

import com.company.project.service.auth.dto.LoginRequest;
import com.company.project.service.auth.dto.TokenResponse;

/**
 * ?몄쬆 ?쒕퉬???명꽣?섏씠??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovAuthService {

    /**
     * 濡쒓렇??泥섎━ 諛??좏겙 諛쒓툒
     */
    TokenResponse login(LoginRequest request);
}
