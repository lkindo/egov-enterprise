package nuri.api.controller.business.sms;


import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.http.MediaType;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(SmsApiController.class)
@DisplayName("SmsApiController 단위 테스트")
class SmsApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private SmsService smsService;

    @Test
    @WithMockCustomUser
    @DisplayName("SMS 발송 내역 조회")
    void getSmsList() throws Exception {
        Page<SmsDto> page = new PageImpl<>(List.of(SmsDto.builder().smsTrsmSn(1L).build()));
        given(smsService.getSmsList(any(), any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/operation/sms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].smsTrsmSn").value(1));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("SMS 상세 조회")
    void getSms() throws Exception {
        SmsDto dto = SmsDto.builder().smsTrsmSn(1L).sndngCn("Content").build();
        given(smsService.getSms(1L)).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/operation/sms/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.smsTrsmSn").value(1));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("SMS 수신자 목록 조회")
    void getSmsRecipients() throws Exception {
        List<SmsRecptnDto> recipients = List.of(SmsRecptnDto.builder().rcptnTelno("01012345678").build());
        given(smsService.getSmsRecipients(1L)).willReturn(recipients);

        mockMvc.perform(get("/api/v1/admin/operation/sms/1/recipients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].rcptnTelno").value("01012345678"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("SMS 발송은 DB 수신번호 길이를 넘으면 400")
    void sendSmsRejectsRecipientLongerThanPhysicalContract() throws Exception {
        mockMvc.perform(post("/api/v1/admin/operation/sms")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sndngTelno": "02-1234-5678",
                                  "sndngCn": "test",
                                  "recipients": [{"rcptnTelno": "010-1234-56789"}]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("recipients[0].rcptnTelno"));

        verifyNoInteractions(smsService);
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("SMS 발송은 발신자·본문·수신자 목록을 필수로 요구")
    void sendSmsRejectsMissingWriteContract() throws Exception {
        mockMvc.perform(post("/api/v1/admin/operation/sms")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sndngTelno": " ", "sndngCn": " ", "recipients": []}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(smsService);
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("SMS 발송은 null 수신자를 검증 단계에서 거절")
    void sendSmsRejectsNullRecipient() throws Exception {
        mockMvc.perform(post("/api/v1/admin/operation/sms")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sndngTelno": "02-1234-5678",
                                  "sndngCn": "test",
                                  "recipients": [null]
                                }
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(smsService);
    }
}
