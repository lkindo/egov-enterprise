package com.company.project.business.service.sms;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.business.domain.sms.Sms;
import com.company.project.business.domain.sms.SmsRecptn;
import com.company.project.business.domain.sms.SmsRecptnRepository;
import com.company.project.business.domain.sms.SmsRepository;
import com.company.project.business.service.sms.dto.SmsDto;
import com.company.project.business.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmsService 테스트")
class SmsServiceTest {

    @Mock
    private SmsRepository smsRepository;

    @Mock
    private SmsRecptnRepository smsRecptnRepository;

    @Mock
    private SmsAsyncProcessor smsAsyncProcessor;

    @InjectMocks
    private SmsService smsService;

    @Test
    @DisplayName("SMS 목록 조회 테스트")
    void getSmsListTest() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Sms sms = Sms.builder().smsId("SMS_001").trnsmitTelno("01011112222").trnsmitCn("Hello").build();
        Page<Sms> page = new PageImpl<>(List.of(sms), pageable, 1);
        when(smsRepository.searchSms(anyString(), anyString(), any(Pageable.class))).thenReturn(page);

        // When
        Page<SmsDto> result = smsService.getSmsList("Hello", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSmsId()).isEqualTo("SMS_001");
    }

    @Test
    @DisplayName("SMS 단건 조회 테스트")
    void getSmsTest() {
        // Given
        Sms sms = Sms.builder().smsId("SMS_001").trnsmitTelno("01011112222").trnsmitCn("Hello").build();
        when(smsRepository.findById("SMS_001")).thenReturn(Optional.of(sms));

        // When
        SmsDto result = smsService.getSms("SMS_001");

        // Then
        assertThat(result.getSmsId()).isEqualTo("SMS_001");
    }

    @Test
    @DisplayName("SMS 단건 조회 실패 테스트")
    void getSmsFailTest() {
        // Given
        when(smsRepository.findById("INVALID")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> smsService.getSms("INVALID"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("SMS 발송 테스트")
    void sendSmsTest() {
        // Given
        SmsDto dto = SmsDto.builder()
                .trnsmitTelno("01011112222")
                .trnsmitCn("Test Message")
                .recipients(List.of(SmsRecptnDto.builder().recptnTelno("01033334444").build()))
                .build();
        
        when(smsRepository.save(any(Sms.class))).thenAnswer(i -> i.getArgument(0));
        when(smsRecptnRepository.save(any(SmsRecptn.class))).thenAnswer(i -> i.getArgument(0));

        // When
        String smsId = smsService.sendSms("user01", dto);

        // Then
        assertThat(smsId).startsWith("SMS_");
        verify(smsRepository).save(any(Sms.class));
        verify(smsRecptnRepository).save(any(SmsRecptn.class));
        verify(smsAsyncProcessor).processSending(eq(smsId), eq("01011112222"), eq("Test Message"));
    }

    @Test
    @DisplayName("SMS 수신자 목록 조회 테스트")
    void getSmsRecipientsTest() {
        // Given
        SmsRecptn recptn = SmsRecptn.builder().smsId("SMS_001").recptnTelno("01033334444").resultCode("S").build();
        when(smsRecptnRepository.findByIdSmsId("SMS_001")).thenReturn(List.of(recptn));

        // When
        List<SmsRecptnDto> result = smsService.getSmsRecipients("SMS_001");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRecptnTelno()).isEqualTo("01033334444");
    }
}
