package com.company.project.api.controller.system.user;

import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.repository.UserAbsenceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAbsenceApiController 단위 테스트")
class UserAbsenceApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private UserAbsenceRepository userAbsenceRepository;

    @InjectMocks
    private UserAbsenceApiController userAbsenceApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userAbsenceApiController).build();
    }

    @Test
    @DisplayName("사용자 부재 정보 목록 조회 테스트")
    void getAbsencesTest() throws Exception {
        when(userAbsenceRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/user-absences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("사용자 부재 상태 상세 조회 테스트")
    void getAbsenceTest() throws Exception {
        String emplyrId = "USR_001";
        UserAbsence absence = UserAbsence.builder().emplyrId(emplyrId).userAbsnceAt("Y").build();
        when(userAbsenceRepository.findById(emplyrId)).thenReturn(Optional.of(absence));

        mockMvc.perform(get("/api/v1/admin/system/user-absences/{emplyrId}", emplyrId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.emplyrId").value(emplyrId))
                .andExpect(jsonPath("$.data.userAbsnceAt").value("Y"));
    }

    @Test
    @DisplayName("사용자 부재 상태 업데이트 테스트")
    void updateAbsenceTest() throws Exception {
        String emplyrId = "USR_001";
        UserAbsenceApiController.UserAbsenceDto dto = UserAbsenceApiController.UserAbsenceDto.builder()
                .emplyrId(emplyrId)
                .userAbsnceAt("N")
                .build();

        when(userAbsenceRepository.findById(emplyrId)).thenReturn(Optional.of(UserAbsence.builder().emplyrId(emplyrId).build()));

        mockMvc.perform(put("/api/v1/admin/system/user-absences/{emplyrId}", emplyrId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
