package com.company.project.service.sms;

import com.company.project.domain.sms.Sms;
import com.company.project.domain.sms.SmsRecptn;
import com.company.project.domain.sms.SmsRecptnRepository;
import com.company.project.domain.sms.SmsRepository;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
    void sendSms_Success() {
        // Given
        String userId = "TEST_USER";
        SmsRecptnDto recipientDto = SmsRecptnDto.builder()
                .recptnTelno("01012345678")
                .build();
        SmsDto smsDto = SmsDto.builder()
                .trnsmitTelno("021234567")
                .trnsmitCn("Test Message")
                .recipients(List.of(recipientDto))
                .build();

        when(smsSender.send(anyString(), anyString(), anyString())).thenReturn(true);
        when(smsRepository.save(any(Sms.class))).thenAnswer(invocation -> invocation.getArgument(0));

        smsService.sendSms(userId, smsDto);

        // Then
        ArgumentCaptor<Sms> smsCaptor = ArgumentCaptor.forClass(Sms.class);
        verify(smsRepository).save(smsCaptor.capture());

        Sms capturedSms = smsCaptor.getValue();
        assertNotNull(capturedSms);
        assertEquals("021234567", capturedSms.getTrnsmitTelno());

        verify(smsSender).send("021234567", "01012345678", "Test Message");
        verify(smsRecptnRepository).save(any(SmsRecptn.class));
    }

    @Test
    void sendSms_Failure() {
        // Given
        String userId = "TEST_USER";
        SmsRecptnDto recipientDto = SmsRecptnDto.builder()
                .recptnTelno("01012345678")
                .build();
        SmsDto smsDto = SmsDto.builder()
                .trnsmitTelno("021234567")
                .trnsmitCn("Test Message")
                .recipients(List.of(recipientDto))
                .build();

        when(smsSender.send(anyString(), anyString(), anyString())).thenThrow(new RuntimeException("Send error"));
        when(smsRepository.save(any(Sms.class))).thenAnswer(invocation -> invocation.getArgument(0));

        smsService.sendSms(userId, smsDto);

        // Then
        verify(smsSender).send("021234567", "01012345678", "Test Message");
        verify(smsRecptnRepository).save(any(SmsRecptn.class));
    }
}
