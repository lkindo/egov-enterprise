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
import org.springframework.test.util.ReflectionTestUtils;

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
        lenient().when(smsRepository.save(any(Sms.class))).thenAnswer(invocation -> {
            Sms saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "smsTrsmSn", 101L);
            return saved;
        });
    }

    @Test
    @DisplayName("SMS 목록 조회 테스트")
    void getSmsListTest() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Sms sms = sms(101L, "01011112222", "Hello");
        Page<Sms> page = new PageImpl<>(List.of(sms), pageable, 1);
        when(smsRepository.searchSms(anyString(), anyString(), any(Pageable.class))).thenReturn(page);

        // When
        Page<SmsDto> result = smsService.getSmsList("Hello", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSmsTrsmSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("SMS 단건 조회 테스트")
    void getSmsTest() {
        // Given
        Sms sms = sms(101L, "01011112222", "Hello");
        when(smsRepository.findById(101L)).thenReturn(Optional.of(sms));

        // When
        SmsDto result = smsService.getSms(101L);

        // Then
        assertThat(result.getSmsTrsmSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("SMS 단건 조회 실패 테스트")
    void getSmsFailTest() {
        // Given
        when(smsRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> smsService.getSms(999L))
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
        
        when(smsRecptnRepository.save(any(SmsRecptn.class))).thenAnswer(i -> i.getArgument(0));

        // When
        Long smsTrsmSn = smsService.sendSms("user01", dto);

        // Then
        assertThat(smsTrsmSn).isEqualTo(101L);
        verify(smsRepository).save(any(Sms.class));
        verify(smsRecptnRepository).save(any(SmsRecptn.class));
        verify(smsAsyncProcessor).processSending(eq(smsTrsmSn), eq("01011112222"), eq("Test Message"));
    }

    @Test
    @DisplayName("SMS 비동기 큐 포화는 수신자 대기 건을 명시적 실패로 전환")
    void sendSms_executorRejected_marksBatchFailure() {
        SmsDto dto = SmsDto.builder()
                .sndngTelno("01011112222")
                .sndngCn("Test Message")
                .recipients(List.of(SmsRecptnDto.builder().rcptnTelno("01033334444").build()))
                .build();
        doThrow(new java.util.concurrent.RejectedExecutionException("full"))
                .when(smsAsyncProcessor).processSending(anyLong(), anyString(), anyString());

        Long smsTrsmSn = smsService.sendSms("user01", dto);

        verify(smsAsyncProcessor).markBatchRejected(smsTrsmSn);
    }

    @Test
    @DisplayName("SMS 수신자 목록 조회 테스트")
    void getSmsRecipientsTest() {
        // Given
        SmsRecptn recptn = SmsRecptn.builder().smsTrsmSn(101L).rcptnTelno("01033334444").rsltCd("S").build();
        when(smsRecptnRepository.findByIdSmsTrsmSn(101L)).thenReturn(List.of(recptn));

        // When
        List<SmsRecptnDto> result = smsService.getSmsRecipients(101L);

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

        Long smsTrsmSn = smsService.sendSms("user01", dto);

        assertThat(smsTrsmSn).isEqualTo(101L);
        verify(smsRepository).save(any(Sms.class));
        verify(smsRecptnRepository, never()).save(any());
        verify(smsAsyncProcessor, never()).processSending(anyLong(), anyString(), anyString());
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

    private Sms sms(Long smsTrsmSn, String sndngTelno, String sndngCn) {
        Sms sms = Sms.builder().sndngTelno(sndngTelno).sndngCn(sndngCn).build();
        ReflectionTestUtils.setField(sms, "smsTrsmSn", smsTrsmSn);
        return sms;
    }
}
