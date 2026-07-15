package nuri.business.service.sms;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.sms.Sms;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.domain.sms.SmsRepository;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import nuri.business.service.sms.dto.SmsMapper;
import nuri.business.service.sms.dto.SmsMapperImpl;
import nuri.business.service.sms.dto.SmsRecptnMapper;
import nuri.business.service.sms.dto.SmsRecptnMapperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

    // 실제 MapStruct 생성 구현체를 주입해 필드 변환 커버리지를 그대로 유지한다 (mock 대체 아님).
    private final SmsMapper smsMapper = new SmsMapperImpl();
    private final SmsRecptnMapper smsRecptnMapper = new SmsRecptnMapperImpl();

    private SmsService smsService;

    @BeforeEach
    void setUp() {
        smsService = new SmsService(smsRepository, smsRecptnRepository, smsAsyncProcessor,
                smsMapper, smsRecptnMapper);
    }

    @Test
    @DisplayName("SMS 목록 조회 테스트")
    void getSmsListTest() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Sms sms = Sms.builder().smsId("SMS_001").sndngTelno("01011112222").sndngCn("Hello").build();
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
        Sms sms = Sms.builder().smsId("SMS_001").sndngTelno("01011112222").sndngCn("Hello").build();
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
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("SMS 발송 테스트")
    void sendSmsTest() {
        // Given
        SmsDto dto = SmsDto.builder()
                .sndngTelno("01011112222")
                .sndngCn("Test Message")
                .recipients(List.of(SmsRecptnDto.builder().rcptnTelno("01033334444").build()))
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
        SmsRecptn recptn = SmsRecptn.builder().smsId("SMS_001").rcptnTelno("01033334444").rsltCd("S").build();
        when(smsRecptnRepository.findByIdSmsId("SMS_001")).thenReturn(List.of(recptn));

        // When
        List<SmsRecptnDto> result = smsService.getSmsRecipients("SMS_001");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRcptnTelno()).isEqualTo("01033334444");
    }

    @Test
    @DisplayName("SMS 발송 - 수신자 없음")
    void sendSms_NoRecipients() {
        SmsDto dto = SmsDto.builder()
                .sndngTelno("01011112222")
                .sndngCn("No Recipient")
                .recipients(null)
                .build();

        String smsId = smsService.sendSms("user01", dto);

        assertThat(smsId).startsWith("SMS_");
        verify(smsRepository).save(any(Sms.class));
        verify(smsRecptnRepository, never()).save(any());
        verify(smsAsyncProcessor, never()).processSending(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("SMS 목록 조회 - 조건부 검색")
    void getSmsList_WithCondition() {
        Pageable pageable = PageRequest.of(0, 10);
        when(smsRepository.searchSms(anyString(), anyString(), any())).thenReturn(Page.empty());

        smsService.getSmsList("2", "key", pageable);

        verify(smsRepository).searchSms(eq("2"), eq("key"), eq(pageable));
    }

    @Test
    @DisplayName("SmsDto - null 엔티티 변환")
    void smsDto_FromNull() {
        assertThat(smsMapper.toDto(null)).isNull();
    }

    @Test
    @DisplayName("SmsRecptnDto - null 엔티티 변환")
    void smsRecptnDto_FromNull() {
        assertThat(smsRecptnMapper.toDto(null)).isNull();
    }
}
