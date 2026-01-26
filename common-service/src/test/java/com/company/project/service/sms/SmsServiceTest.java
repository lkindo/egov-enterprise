package com.company.project.service.sms;

import com.company.project.domain.sms.Sms;
import com.company.project.domain.sms.SmsRecptn;
import com.company.project.domain.sms.SmsRepository;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.Executor;
import java.util.function.Consumer;

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
    private SmsSender smsSender;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private Executor taskExecutor;

    @InjectMocks
    private SmsService smsService;

    @Test
    void sendSms_Success() {
        // Setup TransactionTemplate mock
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> action = invocation.getArgument(0);
            return action.doInTransaction(null);
        });
        doAnswer(invocation -> {
            Consumer<Object> action = invocation.getArgument(0);
            action.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        // Setup Executor mock to run immediately
        doAnswer(invocation -> {
            Runnable r = invocation.getArgument(0);
            r.run();
            return null;
        }).when(taskExecutor).execute(any());

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

        // When
        String smsId = smsService.sendSms(userId, smsDto);

        // Then
        ArgumentCaptor<Sms> smsCaptor = ArgumentCaptor.forClass(Sms.class);
        // Expect 2 saves: Initial save and Final update
        verify(smsRepository, times(2)).save(smsCaptor.capture());

        Sms capturedSms = smsCaptor.getAllValues().get(1);
        assertNotNull(capturedSms);
        assertEquals(userId, capturedSms.getUniqId());

        // Verify interactions
        verify(smsSender).send("01012345678", "Test Message", "021234567");

        // Verify status update (Success)
        SmsRecptn recipient = capturedSms.getRecipients().get(0);
        assertEquals("0000", recipient.getResultCode());
        assertEquals("SUCCESS", recipient.getResultMssage());
    }

    @Test
    void sendSms_Failure() {
        // Setup TransactionTemplate mock
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> action = invocation.getArgument(0);
            return action.doInTransaction(null);
        });
        doAnswer(invocation -> {
            Consumer<Object> action = invocation.getArgument(0);
            action.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        // Setup Executor mock to run immediately
        doAnswer(invocation -> {
            Runnable r = invocation.getArgument(0);
            r.run();
            return null;
        }).when(taskExecutor).execute(any());

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

        when(smsSender.send(anyString(), anyString(), anyString())).thenReturn(false);
        when(smsRepository.save(any(Sms.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        String smsId = smsService.sendSms(userId, smsDto);

        // Then
        ArgumentCaptor<Sms> smsCaptor = ArgumentCaptor.forClass(Sms.class);
        // Expect 2 saves: Initial save and Final update
        verify(smsRepository, times(2)).save(smsCaptor.capture());

        Sms capturedSms = smsCaptor.getAllValues().get(1);

        // Verify interactions
        verify(smsSender).send("01012345678", "Test Message", "021234567");

        // Verify status update (Failure)
        SmsRecptn recipient = capturedSms.getRecipients().get(0);
        assertEquals("9999", recipient.getResultCode());
        assertEquals("FAILED", recipient.getResultMssage());
    }
}
