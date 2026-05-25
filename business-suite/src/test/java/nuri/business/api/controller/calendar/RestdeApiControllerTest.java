package nuri.business.api.controller.calendar;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.service.calendar.RestdeService;
import nuri.business.service.calendar.dto.RestdeDto;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

@WebMvcTest(RestdeApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("RestdeApiController 테스트")
class RestdeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private RestdeService restdeService;

    @Test
    @DisplayName("휴일 목록 조회 성공 - Jackson 가드 필드명 호환 검증")
    void getRestdeList_Success() throws Exception {
        // Given
        RestdeDto dto = RestdeDto.builder()
                .hldySn(1)
                .hldyYmd("20260525")
                .hldyNm("석가탄신일")
                .hldyExpln("부처님오신날")
                .hldySeCd("01")
                .build();
        Page<RestdeDto> page = new PageImpl<>(List.of(dto));
        given(restdeService.getRestdeList(any(), any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/calendar/holidays")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].hldySn").value(1))
                .andExpect(jsonPath("$.data.list[0].hldyYmd").value("20260525"))
                .andExpect(jsonPath("$.data.list[0].hldyNm").value("석가탄신일"))
                .andExpect(jsonPath("$.data.list[0].hldyExpln").value("부처님오신날"))
                .andExpect(jsonPath("$.data.list[0].hldySeCd").value("01"));
    }

    @Test
    @DisplayName("휴일 상세 조회 성공 - Jackson 가드 필드명 호환 검증")
    void getRestde_Success() throws Exception {
        // Given
        RestdeDto dto = RestdeDto.builder()
                .hldySn(2)
                .hldyYmd("20261225")
                .hldyNm("성탄절")
                .hldyExpln("크리스마스")
                .hldySeCd("02")
                .build();
        given(restdeService.getRestde(anyInt())).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/calendar/holidays/2")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hldySn").value(2))
                .andExpect(jsonPath("$.data.hldyYmd").value("20261225"))
                .andExpect(jsonPath("$.data.hldyNm").value("성탄절"))
                .andExpect(jsonPath("$.data.hldyExpln").value("크리스마스"))
                .andExpect(jsonPath("$.data.hldySeCd").value("02"));
    }

    private Authentication getMockAuthentication() {
        CustomUserDetails userDetails = CustomUserDetails.builder()
                .esntlId("USRCNFRM_00000000001")
                .userId("user01")
                .userNm("테스터")
                .authorCode("ROLE_USER")
                .build();
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(getMockAuthentication());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("휴일 등록 성공")
    void createRestde_Success() throws Exception {
        // Given
        RestdeDto reqDto = RestdeDto.builder()
                .hldyYmd("20260505")
                .hldyNm("어린이날")
                .hldyExpln("어린이날 휴무")
                .hldySeCd("01")
                .build();
        given(restdeService.createRestde(any(RestdeDto.class))).willReturn(10);

        // When & Then
        mockMvc.perform(post("/api/v1/calendar/holidays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(10));
    }

    @Test
    @DisplayName("휴일 수정 성공")
    void updateRestde_Success() throws Exception {
        // Given
        RestdeDto reqDto = RestdeDto.builder()
                .hldyYmd("20260101")
                .hldyNm("신정 연휴")
                .build();

        // When & Then
        mockMvc.perform(put("/api/v1/calendar/holidays/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("휴일 삭제 성공")
    void deleteRestde_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/calendar/holidays/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
