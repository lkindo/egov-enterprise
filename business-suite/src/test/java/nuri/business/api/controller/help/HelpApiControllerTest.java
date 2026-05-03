package nuri.business.api.controller.help;

import nuri.business.service.help.EgovHelpService;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@ExtendWith(MockitoExtension.class)
@DisplayName("HelpApiController 단위 테스트")
class HelpApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private EgovHelpService helpService;

    @InjectMocks
    private HelpApiController helpApiController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        
        org.springframework.web.method.support.HandlerMethodArgumentResolver principalResolver = new org.springframework.web.method.support.HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(org.springframework.security.core.userdetails.UserDetails.class);
            }
            @Override
            public Object resolveArgument(org.springframework.core.MethodParameter parameter, org.springframework.web.method.support.ModelAndViewContainer mavContainer, org.springframework.web.context.request.NativeWebRequest webRequest, org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                return new org.springframework.security.core.userdetails.User("user", "password", Collections.emptyList());
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(helpApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver(), principalResolver)
                .build();
    }

    @Test
    @DisplayName("도움말(Hpcm) 목록 조회 테스트")
    void getHpcmListTest() throws Exception {
        Page<HpcmDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(helpService.getHpcmList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/help/hpcm")
                        .param("keyword", "test")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("도움말 상세 조회")
    void getHpcmTest() throws Exception {
        HpcmDto dto = HpcmDto.builder().hpcmId("H1").build();
        when(helpService.getHpcm("H1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/help/hpcm/H1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("도움말 등록")
    void insertHpcmTest() throws Exception {
        HpcmDto dto = HpcmDto.builder().hpcmDf("Def").build();
        when(helpService.createHpcm(anyString(), any(HpcmDto.class))).thenReturn("H1");

        mockMvc.perform(post("/api/v1/help/hpcm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("H1"));
    }

    @Test
    @DisplayName("도움말 수정")
    void updateHpcmTest() throws Exception {
        HpcmDto dto = HpcmDto.builder().hpcmId("H1").hpcmDf("Def").build();
        doNothing().when(helpService).updateHpcm(eq("H1"), anyString(), any(HpcmDto.class));

        mockMvc.perform(put("/api/v1/help/hpcm/H1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("도움말 삭제")
    void deleteHpcmTest() throws Exception {
        doNothing().when(helpService).deleteHpcm("H1");

        mockMvc.perform(delete("/api/v1/help/hpcm/H1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 목록 조회 테스트")
    void getManualsTest() throws Exception {
        Page<OnlineManualDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(helpService.getOnlineManualList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/help/manuals")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 상세 조회")
    void getManualTest() throws Exception {
        OnlineManualDto dto = OnlineManualDto.builder().onlineMnlId("M1").build();
        when(helpService.getOnlineManual("M1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/help/manuals/M1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 등록")
    void createManualTest() throws Exception {
        OnlineManualDto dto = OnlineManualDto.builder().onlineMnlNm("Manual").build();
        when(helpService.createOnlineManual(anyString(), any(OnlineManualDto.class))).thenReturn("M1");

        mockMvc.perform(post("/api/v1/help/manuals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("M1"));
    }

    @Test
    @DisplayName("온라인 매뉴얼 수정")
    void updateManualTest() throws Exception {
        OnlineManualDto dto = OnlineManualDto.builder().onlineMnlId("M1").onlineMnlNm("Manual").build();
        doNothing().when(helpService).updateOnlineManual(eq("M1"), anyString(), any(OnlineManualDto.class));

        mockMvc.perform(put("/api/v1/help/manuals/M1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 삭제")
    void deleteManualTest() throws Exception {
        doNothing().when(helpService).deleteOnlineManual("M1");

        mockMvc.perform(delete("/api/v1/help/manuals/M1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
