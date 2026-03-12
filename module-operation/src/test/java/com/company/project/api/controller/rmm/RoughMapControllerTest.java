package com.company.project.api.controller.rmm;

import com.company.project.TestApplication;
import com.company.project.service.roughmap.EgovRoughMapService;
import com.company.project.service.roughmap.dto.RoughMapDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoughMapController.class)
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("RoughMapController 테스트")
class RoughMapControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EgovRoughMapService roughMapService;

    @Test
    @DisplayName("약도 목록 조회 테스트")
    @WithMockUser
    void getRoughMapsTest() throws Exception {
        given(roughMapService.getRoughMapList(anyString(), any())).willReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/rough-maps").param("keyword", "Test"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("약도 상세 조회 테스트")
    @WithMockUser
    void getRoughMapTest() throws Exception {
        given(roughMapService.getRoughMap("R1")).willReturn(RoughMapDto.builder().roughMapId("R1").build());

        mockMvc.perform(get("/api/v1/rough-maps/R1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("약도 등록 테스트")
    @WithMockUser
    void insertRoughMapTest() throws Exception {
        RoughMapDto dto = RoughMapDto.builder().roughMapSj("New Map").build();

        mockMvc.perform(post("/api/v1/rough-maps")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("약도 수정 테스트")
    @WithMockUser
    void updateRoughMapTest() throws Exception {
        RoughMapDto dto = RoughMapDto.builder().roughMapSj("Updated Map").build();

        mockMvc.perform(put("/api/v1/rough-maps/R1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("약도 삭제 테스트")
    @WithMockUser
    void deleteRoughMapTest() throws Exception {
        mockMvc.perform(delete("/api/v1/rough-maps/R1")
                        .with(csrf()))
                .andExpect(status().isOk());
    }
}
