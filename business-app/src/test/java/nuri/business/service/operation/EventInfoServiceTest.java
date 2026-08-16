package nuri.business.service.operation;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.operation.EventInfo;
import nuri.business.domain.operation.EventInfoRepository;
import nuri.business.service.operation.dto.EventInfoDto;
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

    @org.mockito.Spy
    nuri.business.service.operation.dto.EventInfoMapper eventInfoMapper = new nuri.business.service.operation.dto.EventInfoMapperImpl();

    @InjectMocks
    private EventInfoService eventInfoService;

    @Mock
    private EventInfoRepository eventInfoRepository;

    @Test
    @DisplayName("이벤트 목록 조회")
    void getEventList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        EventInfo eventInfo = EventInfo.builder().evntSn(1L).evntCn("Test Event").build();
        Page<EventInfo> page = new PageImpl<>(List.of(eventInfo));
        
        given(eventInfoRepository.findAll(pageable)).willReturn(page);

        // when
        Page<EventInfoDto> result = eventInfoService.getEventList(null, pageable);


        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEvntSn()).isEqualTo(1L);
        assertThat(result.getContent().get(0).getEvntCn()).isEqualTo("Test Event");
    }

    @Test
    @DisplayName("이벤트 상세 조회 - 성공")
    void getEvent_Success() {
        // given
        EventInfo eventInfo = EventInfo.builder().evntSn(1L).evntCn("Test Event").build();
        given(eventInfoRepository.findById(1L)).willReturn(Optional.of(eventInfo));

        // when
        EventInfoDto result = eventInfoService.getEvent(1L);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getEvntSn()).isEqualTo(1L);
        assertThat(result.getEvntCn()).isEqualTo("Test Event");
    }

    @Test
    @DisplayName("이벤트 상세 조회 - 실패 (존재하지 않음)")
    void getEvent_Fail_NotFound() {
        // given
        given(eventInfoRepository.findById(99L)).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> eventInfoService.getEvent(99L));
    }

    @Test
    @DisplayName("이벤트 생성 - 성공")
    void createEvent() {
        // given
        String userId = "user1";
        EventInfoDto dto = EventInfoDto.builder().evntCn("New Event").bizYr("2024").build();
        
        EventInfo saved = EventInfo.builder().evntSn(1L).evntCn("New Event").bizYr("2024").build();
        given(eventInfoRepository.save(any(EventInfo.class))).willReturn(saved);

        // when
        Long createdEventSn = eventInfoService.createEvent(userId, dto);

        // then
        assertThat(createdEventSn).isEqualTo(1L);
        verify(eventInfoRepository, times(1)).save(any(EventInfo.class));
    }

    @Test
    @DisplayName("이벤트 수정 - 성공")
    void updateEvent() {
        // given
        EventInfo existingEvent = EventInfo.builder().evntSn(1L).evntCn("Old Event").build();
        given(eventInfoRepository.findById(1L)).willReturn(Optional.of(existingEvent));
        
        EventInfoDto updateDto = EventInfoDto.builder().evntCn("Updated Event").bizYr("2025").build();

        // when
        eventInfoService.updateEvent(1L, "user1", updateDto);

        // then
        verify(eventInfoRepository, times(1)).save(any(EventInfo.class));
    }

    @Test
    @DisplayName("이벤트 수정 - 실패 (존재하지 않음)")
    void updateEvent_Fail_NotFound() {
        // given
        given(eventInfoRepository.findById(99L)).willReturn(Optional.empty());
        EventInfoDto updateDto = EventInfoDto.builder().evntCn("Updated Event").build();

        // when & then
        assertThrows(BusinessException.class, () -> eventInfoService.updateEvent(99L, "user1", updateDto));
    }

    @Test
    @DisplayName("이벤트 삭제 - 성공")
    void deleteEvent() {
        // given
        EventInfo existingEvent = EventInfo.builder().evntSn(1L).build();
        given(eventInfoRepository.findById(1L)).willReturn(Optional.of(existingEvent));

        // when
        eventInfoService.deleteEvent(1L);

        // then
        verify(eventInfoRepository, times(1)).delete(existingEvent);
    }
}
