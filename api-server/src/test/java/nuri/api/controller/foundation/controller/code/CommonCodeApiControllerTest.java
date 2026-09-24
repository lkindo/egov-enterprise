package nuri.api.controller.foundation.controller.code;

import nuri.business.service.code.CommonCodeService;
import nuri.business.domain.code.exception.CodeErrorCode;
import nuri.business.service.code.dto.CmmnClCodeDto;
import nuri.business.service.code.dto.CmmnCodeDto;
import nuri.business.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.common.BaseSearchDto;
import tools.jackson.databind.ObjectMapper;
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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("CommonCodeApiController 단위 테스트")
class CommonCodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommonCodeService commonCodeService;

    @InjectMocks
    private CommonCodeApiController commonCodeApiController;

    private final ObjectMapper objectMapper = JsonMapper.builder().configureForJackson2().build();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        JsonMapper mapper = JsonMapper.builder()
                .configureForJackson2()
                .enable(MapperFeature.DETECT_PARAMETER_NAMES)
                .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        JacksonJsonHttpMessageConverter converter = new JacksonJsonHttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(commonCodeApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(converter)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    // --- Classification Code (분류코드) ---

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
    @DisplayName("분류코드 상세 조회")
    void getClCode() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClsfCd("CL01");
        when(commonCodeService.selectCmmnClCodeDetail(any(CmmnClCodeDto.class))).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/cl/CL01")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.clsfCd").value("CL01"));
    }

    @Test
    @DisplayName("분류코드 등록")
    void createClCode() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClsfCd("CL01");
        dto.setUseYn("Y");
        doNothing().when(commonCodeService).insertCmmnClCode(any());

        mockMvc.perform(post("/api/v1/admin/system/codes/cl")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("분류코드 수정")
    void updateClCode() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClsfCd("CL01");
        dto.setUseYn("Y");
        doNothing().when(commonCodeService).updateCmmnClCode(any());

        mockMvc.perform(put("/api/v1/admin/system/codes/cl/CL01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("분류코드 삭제")
    void deleteClCode() throws Exception {
        doNothing().when(commonCodeService).deleteCmmnClCode(any());

        mockMvc.perform(delete("/api/v1/admin/system/codes/cl/CL01")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // --- Common Code (공통코드) ---

    @Test
    @DisplayName("공통코드 목록 조회")
    void getCmmnCodeList() throws Exception {
        when(commonCodeService.selectCmmnCodeList(any(BaseSearchDto.class))).thenReturn(List.of(new CmmnCodeDto()));
        when(commonCodeService.selectCmmnCodeListTotCnt(any(BaseSearchDto.class))).thenReturn(1);

        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn")
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
    @DisplayName("공통코드 상세 미존재는 성공 null이 아니라 404")
    void getCmmnCodeNotFound() throws Exception {
        when(commonCodeService.selectCmmnCodeDetail(any(CmmnCodeDto.class)))
                .thenThrow(new BusinessException(CodeErrorCode.CODE_NOT_FOUND));

        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn/MISSING")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(CodeErrorCode.CODE_NOT_FOUND.getCode()));
    }

    @Test
    @DisplayName("공통코드 등록")
    void createCmmnCode() throws Exception {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setCdId("TEST");
        dto.setUseYn("Y");
        doNothing().when(commonCodeService).insertCmmnCode(any());

        mockMvc.perform(post("/api/v1/admin/system/codes/cmmn")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 수정")
    void updateCmmnCode() throws Exception {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setCdId("TEST");
        dto.setUseYn("Y");
        doNothing().when(commonCodeService).updateCmmnCode(any());

        mockMvc.perform(put("/api/v1/admin/system/codes/cmmn/TEST")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 삭제")
    void deleteCmmnCode() throws Exception {
        doNothing().when(commonCodeService).deleteCmmnCode(any());

        mockMvc.perform(delete("/api/v1/admin/system/codes/cmmn/TEST")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // --- Detail Code (상세코드) ---

    @Test
    @DisplayName("상세코드 목록 조회")
    void getDetailCodeList() throws Exception {
        when(commonCodeService.selectCmmnDetailCodeList(any(BaseSearchDto.class))).thenReturn(List.of(new CmmnDetailCodeDto()));
        when(commonCodeService.selectCmmnDetailCodeListTotCnt(any(BaseSearchDto.class))).thenReturn(1);

        mockMvc.perform(get("/api/v1/admin/system/codes/detail")
                .param("pageIndex", "1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("상세코드 상세 조회")
    void getDetailCode() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCdId("C1");
        dto.setDtlCd("D1");
        when(commonCodeService.selectCmmnDetailCodeDetail(any(CmmnDetailCodeDto.class))).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/detail/C1/D1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cdId").value("C1"));
    }

    @Test
    @DisplayName("상세코드 등록")
    void createDetailCode() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCdId("C1");
        dto.setDtlCd("D1");
        dto.setUseYn("Y");
        doNothing().when(commonCodeService).insertCmmnDetailCode(any());

        mockMvc.perform(post("/api/v1/admin/system/codes/detail")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 수정")
    void updateDetailCode() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCdId("C1");
        dto.setDtlCd("D1");
        dto.setUseYn("Y");
        doNothing().when(commonCodeService).updateCmmnDetailCode(any());

        mockMvc.perform(put("/api/v1/admin/system/codes/detail/C1/D1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 삭제")
    void deleteDetailCode() throws Exception {
        doNothing().when(commonCodeService).deleteCmmnDetailCode(any());

        mockMvc.perform(delete("/api/v1/admin/system/codes/detail/C1/D1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
