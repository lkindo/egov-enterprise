package nuri.foundation.service.operation;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.operation.EventInfo;
import nuri.foundation.repository.operation.EventInfoRepository;
import nuri.foundation.service.operation.dto.EventInfoDto;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@DisplayName("EventInfoService 단위 테스트")
class EventInfoServiceTest {

    @InjectMocks
    private EventInfoService eventInfoService;

    @Mock
    private EventInfoRepository eventInfoRepository;

    @Test
    @DisplayName("이벤트 목록 조회")
    void getEventList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        EventInfo eventInfo = EventInfo.builder().eventId("EVT_01").eventCn("Test Event").build();
        Page<EventInfo> page = new PageImpl<>(List.of(eventInfo));
        
        given(eventInfoRepository.findAll(pageable)).willReturn(page);

        // when
        Page<EventInfoDto> result = eventInfoService.getEventList(null, pageable);


        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEventId()).isEqualTo("EVT_01");
        assertThat(result.getContent().get(0).getEventCn()).isEqualTo("Test Event");
    }

    @Test
    @DisplayName("이벤트 상세 조회 - 성공")
    void getEvent_Success() {
        // given
        EventInfo eventInfo = EventInfo.builder().eventId("EVT_01").eventCn("Test Event").build();
        given(eventInfoRepository.findById("EVT_01")).willReturn(Optional.of(eventInfo));

        // when
        EventInfoDto result = eventInfoService.getEvent("EVT_01");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getEventId()).isEqualTo("EVT_01");
        assertThat(result.getEventCn()).isEqualTo("Test Event");
    }

    @Test
    @DisplayName("이벤트 상세 조회 - 실패 (존재하지 않음)")
    void getEvent_Fail_NotFound() {
        // given
        given(eventInfoRepository.findById("EVT_99")).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> eventInfoService.getEvent("EVT_99"));
    }

    @Test
    @DisplayName("이벤트 생성 - 성공")
    void createEvent() {
        // given
        String userId = "user1";
        EventInfoDto dto = EventInfoDto.builder().eventCn("New Event").bsnsYear("2024").build();
        
        given(eventInfoRepository.save(any(EventInfo.class))).willAnswer(inv -> inv.getArgument(0));

        // when
        String createdEventId = eventInfoService.createEvent(userId, dto);

        // then
        assertThat(createdEventId).isNotNull();
        assertThat(createdEventId).startsWith("EVT_");
        verify(eventInfoRepository, times(1)).save(any(EventInfo.class));
    }

    @Test
    @DisplayName("이벤트 수정 - 성공")
    void updateEvent() {
        // given
        EventInfo existingEvent = EventInfo.builder().eventId("EVT_01").eventCn("Old Event").build();
        given(eventInfoRepository.findById("EVT_01")).willReturn(Optional.of(existingEvent));
        
        EventInfoDto updateDto = EventInfoDto.builder().eventCn("Updated Event").bsnsYear("2025").build();

        // when
        eventInfoService.updateEvent("EVT_01", "user1", updateDto);

        // then
        verify(eventInfoRepository, times(1)).save(any(EventInfo.class));
    }

    @Test
    @DisplayName("이벤트 수정 - 실패 (존재하지 않음)")
    void updateEvent_Fail_NotFound() {
        // given
        given(eventInfoRepository.findById("EVT_99")).willReturn(Optional.empty());
        EventInfoDto updateDto = EventInfoDto.builder().eventCn("Updated Event").build();

        // when & then
        assertThrows(BusinessException.class, () -> eventInfoService.updateEvent("EVT_99", "user1", updateDto));
    }

    @Test
    @DisplayName("이벤트 삭제 - 성공")
    void deleteEvent() {
        // given
        EventInfo existingEvent = EventInfo.builder().eventId("EVT_01").build();
        given(eventInfoRepository.findById("EVT_01")).willReturn(Optional.of(existingEvent));

        // when
        eventInfoService.deleteEvent("EVT_01");

        // then
        verify(eventInfoRepository, times(1)).delete(existingEvent);
    }
}
