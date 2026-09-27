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

    @Mock
    private nuri.business.service.code.CommonCodeChangeService commonCodeChangeService;

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
    @DisplayName("[DIP B5 F11] 변경 이력은 그룹 ID·페이지를 서비스로 넘기고 페이지 모양으로 돌려준다")
    void getChangeHistory() throws Exception {
        org.springframework.data.domain.PageRequest page = org.springframework.data.domain.PageRequest.of(1, 5);
        when(commonCodeChangeService.getChanges(org.mockito.ArgumentMatchers.eq("GRP1"), org.mockito.ArgumentMatchers.isNull(), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(new nuri.business.service.code.dto.CommonCodeChangeDto(
                        7L, "CODE", "UPDATE", "CL1", "GRP1", null, "명칭", "명칭: A", "명칭: B", "김갑",
                        java.time.LocalDateTime.of(2026, 9, 27, 10, 0))), page, 6));

        mockMvc.perform(get("/api/v1/admin/system/codes/change-history")
                .param("cdId", "GRP1").param("page", "1").param("size", "5")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].chgArtclNm").value("명칭"))
                .andExpect(jsonPath("$.data.list[0].chgUserNm").value("김갑"))
                .andExpect(jsonPath("$.data.total").value(6));
        org.mockito.ArgumentCaptor<org.springframework.data.domain.Pageable> captor =
                org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        org.mockito.Mockito.verify(commonCodeChangeService).getChanges(org.mockito.ArgumentMatchers.eq("GRP1"), org.mockito.ArgumentMatchers.isNull(), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getPageNumber()).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getPageSize()).isEqualTo(5);
    }

    @Test
    @DisplayName("[DIP B5 F11] 분류 코드로 조회하면 그 분류 자신의 이력 조건을 서비스에 넘긴다")
    void getChangeHistoryByClassification() throws Exception {
        when(commonCodeChangeService.getChanges(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq("CL1"), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/admin/system/codes/change-history")
                .param("clsfCd", "CL1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
        org.mockito.Mockito.verify(commonCodeChangeService).getChanges(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq("CL1"), any(org.springframework.data.domain.Pageable.class));
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
