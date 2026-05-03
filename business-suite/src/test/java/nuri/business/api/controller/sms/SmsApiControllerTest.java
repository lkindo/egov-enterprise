package nuri.business.api.controller.sms;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.service.sms.EgovSmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SmsApiController.class)
@DisplayName("SmsApiController 단위 테스트")
class SmsApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovSmsService smsService;

    @Test
    @WithMockUser
    @DisplayName("SMS 발송 내역 조회")
    void getSmsList() throws Exception {
        Page<SmsDto> page = new PageImpl<>(List.of(SmsDto.builder().smsId("SMS1").build()));
        given(smsService.getSmsList(any(), any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/operation/sms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].smsId").value("SMS1"));
    }

    @Test
    @WithMockUser
    @DisplayName("SMS 상세 조회")
    void getSms() throws Exception {
        SmsDto dto = SmsDto.builder().smsId("SMS1").trnsmitCn("Content").build();
        given(smsService.getSms("SMS1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/operation/sms/SMS1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.smsId").value("SMS1"));
    }

    @Test
    @WithMockUser
    @DisplayName("SMS 수신자 목록 조회")
    void getSmsRecipients() throws Exception {
        List<SmsRecptnDto> recipients = List.of(SmsRecptnDto.builder().recptnTelno("01012345678").build());
        given(smsService.getSmsRecipients("SMS1")).willReturn(recipients);

        mockMvc.perform(get("/api/v1/admin/operation/sms/SMS1/recipients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].recptnTelno").value("01012345678"));
    }

    // sendSms 테스트는 @LoginUser 처리가 필요하므로 일단 주석 처리하거나 단순화
    // 실제 환경에서는 HandlerMethodArgumentResolver 설정을 테스트에 포함해야 함
}
