package nuri.api.controller.business.help;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMapping;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 정렬 허용 목록(2026-11-25 품질 평가)을 실제 보안·인터셉터 체인 위에서 확인한다 — 도움말 목록은 관리 화면이 보내는 최신순
 * ({@code hlpSn,DESC})만 받는다. 경로를 컨트롤러에서 읽어 도움말 기능이 빠진 생성물에서는 이 시험도 함께 빠진다.
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
class HelpSortAllowlistIntegrationTest {

    private static final String HPCM = HelpApiController.class.getAnnotation(RequestMapping.class).value()[0] + "/hpcm";

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("허용 속성의 정렬은 통과하고, 형식이 맞아도 허용 목록 밖 속성은 400 이다")
    void onlyListedSortPropertiesAreAccepted() throws Exception {
        mvc.perform(get(HPCM).param("page", "1").param("size", "10").param("sort", "hlpSn,DESC"))
                .andExpect(status().isOk());
        // ignorecase 는 숫자 키(hlpSn)에 붙으면 저장소가 문자열 함수로 감싸 실패한다 — 허용 목록이 열지 않았으므로 400.
        for (String sort : new String[] {"hlpExpln,asc", "hlpSn,DESC&sort=hlpDfn", "hlpSn,DESC,ignorecase"}) {
            mvc.perform(get(HPCM).param("page", "1").param("size", "10").param("sort", sort.split("&sort=")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("C001"));
        }
    }
}
