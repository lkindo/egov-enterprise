package nuri.api.controller.foundation.controller.code;

import nuri.business.core.exception.GlobalExceptionHandler;
import nuri.business.security.service.CustomUserDetails;
import nuri.business.service.code.AdministCodeService;
import nuri.business.service.code.dto.AdministCodeDto;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("AdministCodeApiController 단위 테스트")
class AdministCodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AdministCodeService administCodeService;

    @InjectMocks
    private AdministCodeApiController administCodeApiController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(administCodeApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("행정코드 목록 조회")
    void getAdministCodeList() throws Exception {
        Page<AdministCodeDto> page = new PageImpl<>(List.of(new AdministCodeDto()));
        when(administCodeService.getAdministCodeList(anyString(), any(PageRequest.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/codes/administ")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .param("searchKeyword", "test")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("행정코드 상세 조회")
    void getAdministCodeDetail() throws Exception {
        AdministCodeDto dto = new AdministCodeDto();
        dto.setAdmdstCd("A1");
        when(administCodeService.getAdministCodeDetail("A1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/administ/A1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.admdstCd").value("A1"));
    }

    @Test
    @DisplayName("행정코드 등록 (익명)")
    void createAdministCode_Anonymous() throws Exception {
        AdministCodeDto dto = new AdministCodeDto();
        dto.setAdmdstCd("A1");
        dto.setUseYn("Y");

        mockMvc.perform(post("/api/v1/admin/system/codes/administ")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("행정코드 등록 (인증)")
    void createAdministCode_Authenticated() throws Exception {
        CustomUserDetails userDetails = mock(CustomUserDetails.class);
        when(userDetails.getEsntlId()).thenReturn("USR_1");
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        AdministCodeDto dto = new AdministCodeDto();
        dto.setAdmdstCd("A1");
        dto.setUseYn("Y");

        mockMvc.perform(post("/api/v1/admin/system/codes/administ")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("행정코드 수정")
    void updateAdministCode() throws Exception {
        AdministCodeDto dto = new AdministCodeDto();
        dto.setAdmdstCd("A1");
        dto.setUseYn("Y");

        mockMvc.perform(put("/api/v1/admin/system/codes/administ/A1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("행정코드 삭제")
    void deleteAdministCode() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/codes/administ/A1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
