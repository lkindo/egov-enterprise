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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("HelpApiController 단위 테스트")
class HelpApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EgovHelpService helpService;

    @InjectMocks
    private HelpApiController helpApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(helpApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
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
}
