package nuri.api.controller;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 잘못된 요청 입력이 500 이 아니라 400 으로 끝나는지 운영 보안 체인 위에서 확인한다 — 모든 프로필에 남는 표면만 쓴다.
 *
 * <p>[2026-09-24 ZAP API 스캔] 첫 인증 API 스캔의 500 응답 대부분이 입력 오류였다. 예외 처리기 단위 테스트는 예외
 * 객체를 직접 넣으므로, 실제 요청에서 예외가 그 형태로 처리기에 닿는지는 여기서만 증명된다. 게시판·쪽지처럼
 * collaboration pack 이 소유한 표면은 {@link CollaborationInputErrorIntegrationTest} 가 본다 — URL 문자열만 쓰는
 * 테스트는 그 pack 이 빠진 프로필에 남아 404 로 실패하기 때문이다.
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
class ClientInputErrorIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("필수 요청 파라미터가 비어 있으면 400 이고 빠진 이름을 알려 준다")
    void missingRequiredParameterIsBadRequest() throws Exception {
        mvc.perform(get("/api/v1/menus/left").param("menuNo", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("C001"))
                .andExpect(jsonPath("$.message", containsString("menuNo")));
    }
}
