package nuri.api.controller.foundation.controller.system.user;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.service.system.user.UserAbsenceService;
import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// [2026-08-20] @IntegrationTest → @ApiHttpIntegrationTest.
//   종전 stereotype 은 mock-security 프로파일 + permitAll @Primary 체인 + ApiSecurityConfig
//   스캔 배제의 3중 우회로 운영 보안 체인을 로드하지 않았다. 그래서 이 테스트들은 **자격증명 없이**
//   /api/v1/admin/** 를 호출해 200 을 단언하고 있었다 — 운영에서는 401 이다.
//   이제 운영 체인 위에서 돌고, 관리자 주체를 실어 인가를 통과시킨다.
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
@DisplayName("UserAbsenceApiController 통합 테스트(MockMvc)")
class UserAbsenceApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAbsenceService userAbsenceService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("사용자 부재 정보 목록 조회")
    void getAbsences() throws Exception {
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnYn("Y").build();
        given(userAbsenceService.getAbsences()).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/admin/system/user-absences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].userId").value("user1"));
    }

    @Test
    @DisplayName("사용자 부재 상태 상세 조회")
    void getAbsence() throws Exception {
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnYn("Y").build();
        given(userAbsenceService.getAbsence("user1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/user-absences/user1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value("user1"));
    }

    @Test
    @DisplayName("사용자 부재 상태 업데이트")
    void updateAbsence() throws Exception {
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnYn("Y").build();

        mockMvc.perform(put("/api/v1/admin/system/user-absences/user1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }
}
