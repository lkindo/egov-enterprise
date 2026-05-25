package nuri.foundation.api.controller.code;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.code.InstitutionCodeService;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeRecptnDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("InstitutionCodeApiController 단위 테스트")
class InstitutionCodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private InstitutionCodeService institutionCodeService;

    @InjectMocks
    private InstitutionCodeApiController institutionCodeApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(institutionCodeApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("기관코드 목록 조회")
    void getInstitutionCodeList() throws Exception {
        List<InstitutionCodeDto> list = List.of(new InstitutionCodeDto());
        when(institutionCodeService.selectInstitutionCodeList(any(BaseSearchDto.class))).thenReturn(list);
        when(institutionCodeService.selectInstitutionCodeListTotCnt(any(BaseSearchDto.class))).thenReturn(1);

        mockMvc.perform(get("/api/v1/admin/system/codes/institution")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("기관코드 상세 조회")
    void getInstitutionCodeDetail() throws Exception {
        InstitutionCodeDto dto = new InstitutionCodeDto();
        dto.setInstCd("INST1");
        when(institutionCodeService.selectInstitutionCodeDetail(any(InstitutionCodeDto.class))).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/institution/INST1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.instCd").value("INST1"));
    }

    @Test
    @DisplayName("기관코드 수신 내역 조회")
    void getInstitutionCodeRecptnList() throws Exception {
        List<InstitutionCodeRecptnDto> list = List.of(new InstitutionCodeRecptnDto());
        when(institutionCodeService.selectInstitutionCodeRecptnList(any(BaseSearchDto.class))).thenReturn(list);

        mockMvc.perform(get("/api/v1/admin/system/codes/institution/receptions")
                .param("pageIndex", "1")
                .param("processSe", "1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("기관코드 수신 처리 (익명)")
    void processInstitutionCodeRecptn_Anonymous() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/codes/institution/receptions/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocrnYmd\":\"20240101\", \"instCd\":\"I1\", \"opertSn\":1}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
