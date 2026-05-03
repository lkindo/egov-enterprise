package nuri.foundation.api.controller.code;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.service.code.InstitutionCodeService;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeRecptnDto;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
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
        Page<InstitutionCodeDto> page = new PageImpl<>(List.of(new InstitutionCodeDto()));
        when(institutionCodeService.getInstitutionCodeList(anyString(), any(PageRequest.class))).thenReturn(page);

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
        dto.setInsttCode("INST1");
        when(institutionCodeService.getInstitutionCodeDetail("INST1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/institution/INST1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.insttCode").value("INST1"));
    }

    @Test
    @DisplayName("기관코드 수신 내역 조회")
    void getInstitutionCodeRecptnList() throws Exception {
        Page<InstitutionCodeRecptnDto> page = new PageImpl<>(List.of(new InstitutionCodeRecptnDto()));
        when(institutionCodeService.getInstitutionCodeRecptnList(any(), any(), any())).thenReturn(page);

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
                .param("occrrncDe", "20240101")
                .param("insttCode", "I1")
                .param("opertSn", "1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("기관코드 수신 처리 (인증)")
    void processInstitutionCodeRecptn_Authenticated() throws Exception {
        CustomUserDetails userDetails = mock(CustomUserDetails.class);
        when(userDetails.getEsntlId()).thenReturn("USR_1");
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        mockMvc.perform(post("/api/v1/admin/system/codes/institution/receptions/process")
                .param("occrrncDe", "20240101")
                .param("insttCode", "I1")
                .param("opertSn", "1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
