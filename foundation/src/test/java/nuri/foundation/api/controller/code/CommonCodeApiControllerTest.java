package nuri.foundation.api.controller.code;

import nuri.foundation.service.code.CommonCodeService;
import nuri.foundation.service.code.dto.CmmnClCodeDto;
import nuri.foundation.service.code.dto.CmmnCodeDto;
import nuri.foundation.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.domain.common.BaseSearchDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("CommonCodeApiController 단위 테스트")
class CommonCodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommonCodeService commonCodeService;

    @InjectMocks
    private CommonCodeApiController commonCodeApiController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(commonCodeApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("분류코드 목록 조회")
    void getClCodeList() throws Exception {
        when(commonCodeService.selectCmmnClCodeList(any(BaseSearchDto.class))).thenReturn(List.of(new CmmnClCodeDto()));
        when(commonCodeService.selectCmmnClCodeListTotCnt(any(BaseSearchDto.class))).thenReturn(1);

        mockMvc.perform(get("/api/v1/admin/system/codes/cl")
                .param("pageIndex", "1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("공통코드 상세 조회")
    void getCmmnCode() throws Exception {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setCdId("TEST");
        when(commonCodeService.selectCmmnCodeDetail(any(CmmnCodeDto.class))).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn/TEST")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cdId").value("TEST"));
    }

    @Test
    @DisplayName("상세코드 등록")
    void createDetailCode() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCodeId("C1");
        dto.setCode("D1");
        dto.setUseYn("Y");

        mockMvc.perform(post("/api/v1/admin/system/codes/detail")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 수정")
    void updateDetailCode() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCodeId("C1");
        dto.setCode("D1");
        dto.setUseYn("Y");

        mockMvc.perform(put("/api/v1/admin/system/codes/detail/C1/D1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 삭제")
    void deleteDetailCode() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/codes/detail/C1/D1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
