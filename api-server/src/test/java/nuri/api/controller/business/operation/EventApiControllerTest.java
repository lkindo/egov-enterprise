package nuri.api.controller.business.operation;

import nuri.business.service.event.EventInfoService;
import nuri.business.service.event.dto.EventInfoDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
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

/**
 * 행사 API 검증. 외부인사·포상 컨트롤러 시험은 각자의 시험 파일에 둔다 — 한 파일에 섞으면 행사만 고른 구성에서
 * 포상 타입 참조 때문에 행사 시험까지 연쇄로 사라진다.
 */
class EventApiControllerTest {

    private MockMvc eventMockMvc;

    private EventInfoService eventService;

    private ObjectMapper objectMapper = JsonMapper.builder().configureForJackson2().build();

    @BeforeEach
    void setUp() {
        eventService = mock(EventInfoService.class);

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
    }

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
        EventInfoDto dto = EventInfoDto.builder().evntNm("Integration test event").build();
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
}
