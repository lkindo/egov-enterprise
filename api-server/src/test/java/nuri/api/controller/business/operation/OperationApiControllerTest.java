package nuri.api.controller.business.operation;

import nuri.business.service.operation.EventInfoService;
import nuri.business.service.operation.ExternalHrService;
import nuri.business.service.operation.RewardManageService;
import nuri.business.service.operation.dto.EventInfoDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OperationApiControllerTest {

    private MockMvc eventMockMvc;
    private MockMvc hrMockMvc;
    private MockMvc rewardMockMvc;
    
    private EventInfoService eventService;
    private ExternalHrService hrService;
    private RewardManageService rewardService;
    
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        eventService = mock(EventInfoService.class);
        hrService = mock(ExternalHrService.class);
        rewardService = mock(RewardManageService.class);
        
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(UserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                UserDetails user = mock(UserDetails.class);
                when(user.getUsername()).thenReturn("testAdmin");
                return user;
            }
        };

        eventMockMvc = MockMvcBuilders.standaloneSetup(new EventApiController(eventService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver(), userDetailsResolver)
                .build();
        
        hrMockMvc = MockMvcBuilders.standaloneSetup(new ExternalHrApiController(hrService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
        
        rewardMockMvc = MockMvcBuilders.standaloneSetup(new RewardManageApiController(rewardService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    // --- EventApiController Tests ---
    @Test
    @DisplayName("행사 목록 조회 - 성공")
    void getEventList_success() throws Exception {
        when(eventService.getEventList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        eventMockMvc.perform(get("/api/v1/admin/operation/events")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("행사 상세 조회 - 성공")
    void getEvent_success() throws Exception {
        when(eventService.getEvent(1L)).thenReturn(EventInfoDto.builder().evntSn(1L).build());
        eventMockMvc.perform(get("/api/v1/admin/operation/events/1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("행사 등록/수정/삭제 - 성공")
    void event_crud_success() throws Exception {
        EventInfoDto dto = EventInfoDto.builder().build();
        when(eventService.createEvent(anyString(), any())).thenReturn(1L);

        eventMockMvc.perform(post("/api/v1/admin/operation/events")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(1));

        eventMockMvc.perform(put("/api/v1/admin/operation/events/1")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        eventMockMvc.perform(delete("/api/v1/admin/operation/events/1")).andExpect(status().isOk());
    }

    // --- ExternalHrApiController Tests ---
    @Test
    @DisplayName("외부인력 조회 - 분기 검증")
    void hr_list_branch() throws Exception {
        when(hrService.getExternalHrList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        // Without name
        hrMockMvc.perform(get("/api/v1/admin/operation/external-hr")).andExpect(status().isOk());
        // With name
        hrMockMvc.perform(get("/api/v1/admin/operation/external-hr").param("name", "John")).andExpect(status().isOk());

        verify(hrService).getExternalHrList(isNull(), any());
        verify(hrService).getExternalHrList(eq("John"), any());
    }

    @Test
    @DisplayName("외부인력 등록 - 성공")
    void hr_create_success() throws Exception {
        hrMockMvc.perform(post("/api/v1/admin/operation/external-hr")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"evntSn\":1,\"otsdHrId\":\"HR1\"}"))
                .andExpect(status().isOk());
    }

    // --- RewardManageApiController Tests ---
    @Test
    @DisplayName("포상관리 조회 - 분기 검증")
    void reward_list_branch() throws Exception {
        when(rewardService.getRewardList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        // Without name
        rewardMockMvc.perform(get("/api/v1/admin/operation/rewards")).andExpect(status().isOk());
        // With name
        rewardMockMvc.perform(get("/api/v1/admin/operation/rewards").param("name", "Award")).andExpect(status().isOk());

        verify(rewardService).getRewardList(isNull(), any());
        verify(rewardService).getRewardList(eq("Award"), any());
    }

    @Test
    @DisplayName("포상 등록 - 성공")
    void reward_create_success() throws Exception {
        rewardMockMvc.perform(post("/api/v1/admin/operation/rewards")
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isOk());
    }
}
