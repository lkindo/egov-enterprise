package nuri.business.api.controller.admin.content.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.foundation.service.system.content.community.CommunityService;
import nuri.foundation.service.system.content.community.dto.CommunityDto;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommunityApiController 단위 테스트")
class CommunityApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private CommunityService communityService;

    @InjectMocks
    private CommunityApiController communityApiController;

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

        mockMvc = MockMvcBuilders.standaloneSetup(communityApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver(), principalResolver)
                .build();
    }

    @Test
    @DisplayName("커뮤니티 목록 조회")
    void getCommunities() throws Exception {
        Page<CommunityDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(communityService.getCommunityList(anyString(), anyString(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/content/community")
                        .param("searchCnd", "1")
                        .param("searchWrd", "test")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("커뮤니티 상세 조회")
    void getCommunity() throws Exception {
        CommunityDto dto = new CommunityDto();
        dto.setCmntyId("C1");
        when(communityService.getCommunity("C1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/content/community/C1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("커뮤니티 생성")
    void createCommunity() throws Exception {
        CommunityDto requestDto = new CommunityDto();
        requestDto.setCmntyTtl("New Community");
        
        CommunityDto responseDto = new CommunityDto();
        responseDto.setCmntyId("C1");
        
        when(communityService.createCommunity(eq("user"), any(CommunityDto.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/admin/content/community")
                        .with(SecurityMockMvcRequestPostProcessors.user("user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cmntyId").value("C1"));
    }

    @Test
    @DisplayName("커뮤니티 수정")
    void updateCommunity() throws Exception {
        CommunityDto dto = new CommunityDto();
        dto.setCmntyTtl("Updated Community");

        doNothing().when(communityService).updateCommunity(eq("user"), any(CommunityDto.class));

        mockMvc.perform(put("/api/v1/admin/content/community/C1")
                        .with(SecurityMockMvcRequestPostProcessors.user("user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("커뮤니티 삭제")
    void deleteCommunity() throws Exception {
        doNothing().when(communityService).deleteCommunity("C1", "user");

        mockMvc.perform(delete("/api/v1/admin/content/community/C1")
                        .with(SecurityMockMvcRequestPostProcessors.user("user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("포틀릿 커뮤니티 목록 조회")
    void getCommunityPortlet() throws Exception {
        List<CommunityDto> list = Collections.singletonList(new CommunityDto());
        when(communityService.getCommunityListPortlet()).thenReturn(list);

        mockMvc.perform(get("/api/v1/admin/content/community/portlet"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
