package nuri.foundation.api.controller.code;

import nuri.foundation.service.code.EgovCodeService;
import nuri.foundation.service.code.EgovCommonCodeService;
import nuri.foundation.service.code.InstitutionCodeService;
import nuri.foundation.service.code.dto.CodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("CodeApiController 단위 테스트")
class CodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EgovCodeService codeService;

    @Mock
    private EgovCommonCodeService commonCodeService;

    @Mock
    private InstitutionCodeService institutionCodeService;

    @InjectMocks
    private CommonCodeApiController codeApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(codeApiController).build();
    }

    @Test
    @DisplayName("특정 그룹의 코드 목록 조회")
    void getCodesByGroup() throws Exception {
        CodeDto dto = CodeDto.builder().code("C1").codeNm("Code 1").build();
        given(codeService.getDetailCodeList(anyString())).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/codes/COM001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value("C1"));
    }

    @Test
    @DisplayName("기관코드 목록 조회")
    void getInstitutionCodeList() throws Exception {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().insttCode("INST1").allInsttNm("Inst 1").build();
        List<InstitutionCodeDto> list = List.of(dto);
        given(institutionCodeService.selectInstitutionCodeList(any(BaseSearchDto.class))).willReturn(list);
        given(institutionCodeService.selectInstitutionCodeListTotCnt(any(BaseSearchDto.class))).willReturn(1);

        mockMvc.perform(get("/api/v1/codes/institutions")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].insttCode").value("INST1"));
    }
}
