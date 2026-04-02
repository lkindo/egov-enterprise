package com.company.project.foundation.service.auth;

import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;

/**
 * ?몄쬆 ??퉬???명꽣??씠??
 * - ?꾩옄???꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ⑹꾪븳 ?명꽣??씠???꾨?? */
public interface EgovAuthService {

    /**
     * 濡쒓泥섎????좏겙 諛쒓??     */
    TokenResponse login(LoginRequest request);
}
