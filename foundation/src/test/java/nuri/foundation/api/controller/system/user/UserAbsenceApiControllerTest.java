package nuri.foundation.api.controller.system.user;

import nuri.foundation.domain.user.dto.UserAbsenceDto;
import nuri.foundation.service.system.user.UserAbsenceService;
import nuri.foundation.support.IntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@AutoConfigureMockMvc
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
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnceAt("Y").build();
        given(userAbsenceService.getAbsences()).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/admin/system/user-absences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].emplyrId").value("user1"));
    }

    @Test
    @DisplayName("사용자 부재 상태 상세 조회")
    void getAbsence() throws Exception {
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnceAt("Y").build();
        given(userAbsenceService.getAbsence("user1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/user-absences/user1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emplyrId").value("user1"));
    }

    @Test
    @DisplayName("사용자 부재 상태 업데이트")
    void updateAbsence() throws Exception {
        UserAbsenceDto dto = UserAbsenceDto.builder().userAbsnceAt("Y").build();

        mockMvc.perform(put("/api/v1/admin/system/user-absences/user1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }
}
