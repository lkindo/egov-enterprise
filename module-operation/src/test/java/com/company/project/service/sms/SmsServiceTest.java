package com.company.project.service.sms;

import com.company.project.domain.sms.Sms;
import com.company.project.domain.sms.SmsRecptnRepository;
import com.company.project.domain.sms.SmsRepository;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmsService 테스트")
class SmsServiceTest {

    @Mock
    private SmsRepository smsRepository;

    @Mock
    private SmsRecptnRepository smsRecptnRepository;

    @Mock
    private SmsSender smsSender;

    @InjectMocks
    private SmsService smsService;

    @Test
    @DisplayName("SMS 상세 조회 성공")
    void getSms_Success() {
        // Given
        Sms sms = Sms.builder().smsId("S1").trnsmitTelno("01012341234").trnsmitCn("Hello").build();
        given(smsRepository.findById("S1")).willReturn(Optional.of(sms));

        // When
        SmsDto result = smsService.getSms("S1");

        // Then
        assertNotNull(result);
        assertEquals("S1", result.getSmsId());
    }

    @Test
    @DisplayName("SMS 발송 성공")
    void sendSms_Success() {
        // Given
        SmsDto dto = SmsDto.builder()
                .trnsmitTelno("01012341234")
                .trnsmitCn("Test")
                .recipients(List.of(SmsRecptnDto.builder().recptnTelno("01056785678").build()))
                .build();

        // When
        String smsId = smsService.sendSms("user", dto);

        // Then
        assertNotNull(smsId);
        assertTrue(smsId.startsWith("SMS_"));
        verify(smsRepository).save(any(Sms.class));
        verify(smsRecptnRepository).save(any());
        verify(smsSender).send(anyString(), anyString(), anyString());
    }
}
