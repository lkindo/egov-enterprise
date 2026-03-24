package com.company.project.api.controller.sms;

import com.company.project.TestApplication;
import com.company.project.service.sms.EgovSmsService;
import com.company.project.service.sms.dto.SmsDto;
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
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SmsApiController.class)
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("SmsApiController 테스트")
class SmsApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EgovSmsService smsService;

    @Test
    @DisplayName("SMS 목록 조회 테스트")
    @WithMockUser
    void getSmsListTest() throws Exception {
        given(smsService.getSmsList(any(), any(), any())).willReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/admin/operation/sms")
                        .param("searchCondition", "1")
                        .param("searchKeyword", "Test"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SMS 상세 조회 테스트")
    @WithMockUser
    void getSmsTest() throws Exception {
        given(smsService.getSms("SMS_1")).willReturn(SmsDto.builder().smsId("SMS_1").build());

        mockMvc.perform(get("/api/v1/admin/operation/sms/SMS_1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SMS 전송 테스트")
    @WithMockUser(username = "user01")
    void sendSmsTest() throws Exception {
        SmsDto dto = SmsDto.builder().trnsmitTelno("01012345678").trnsmitCn("Test Message").build();
        given(smsService.sendSms(any(), any(SmsDto.class))).willReturn("SMS_1");

        mockMvc.perform(post("/api/v1/admin/operation/sms")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SMS 수신자 목록 조회 테스트")
    @WithMockUser
    void getSmsRecipientsTest() throws Exception {
        given(smsService.getSmsRecipients("SMS_1")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/operation/sms/SMS_1/recipients"))
                .andExpect(status().isOk());
    }
}
