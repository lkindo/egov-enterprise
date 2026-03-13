package com.company.project.api.controller.system;

import com.company.project.service.program.ProgramService;
import com.company.project.service.program.dto.ProgramDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProgramAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ProgramAdminController 테스트")
class ProgramAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProgramService programService;

    private final String BASE_URL = "/api/v1/admin/system/programs";

    @Test
    @DisplayName("프로그램 상세 조회 성공")
    void getProgram_Success() throws Exception {
        given(programService.selectProgrmById(anyString())).willReturn(
                ProgramDto.builder().progrmFileNm("MyProg").progrmKoreanNm("My Program").build()
        );

        mockMvc.perform(get(BASE_URL + "/MyProg")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progrmKoreanNm").value("My Program"));
    }
}
