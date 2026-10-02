package nuri.business.service.operation;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.operation.EventInfo;
import nuri.business.domain.operation.EventInfoRepository;
import nuri.business.service.operation.dto.EventInfoDto;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

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

    @Mock
    private nuri.business.domain.operation.ExternalHrRepository externalHrRepository;

    @BeforeEach
    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private static void authorize(String permission) {
        authenticate(List.of(permission), List.of());
    }

    private static void authenticate(List<String> permissions, List<String> groups) {
        var principal = CustomUserDetails.builder().userId("operator").esntlId("OPERATOR")
                .enabled(true).permissions(permissions).groups(groups).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, groups.isEmpty()
                        ? principal.getAuthorities() : groups.stream().map(SimpleGrantedAuthority::new).toList()));
    }

    static Stream<Arguments> deniedWrites() {
        return Stream.of("CREATE", "UPDATE", "DELETE").flatMap(operation ->
                Stream.of("NONE", "ANONYMOUS", "USER", "WRONG", "ROLE")
                        .map(identity -> Arguments.of(operation, identity)));
    }

    @ParameterizedTest
    @MethodSource("deniedWrites")
    void managementWriteRequiresItsExactPermissionBeforeDependencies(String operation, String identity) {
        switch (identity) {
            case "ANONYMOUS" -> SecurityContextHolder.getContext().setAuthentication(
                    new AnonymousAuthenticationToken("fixture", "anonymous",
                            List.of(new SimpleGrantedAuthority("EVENT_" + operation))));
            case "USER" -> authenticate(List.of(), List.of());
            case "WRONG" -> authorize(operation.equals("CREATE") ? "EVENT_UPDATE" : "EVENT_CREATE");
            case "ROLE" -> authenticate(List.of(), List.of("ROLE_ADMIN", "ROLE_SYSTEM"));
            default -> SecurityContextHolder.clearContext();
        }
        EventInfo foreign = EventInfo.builder().evntSn(1L).evntNm("foreign event").build();
        foreign.setFrstRgtrId("foreign-writer");
        if (operation.equals("UPDATE")) {
            org.mockito.Mockito.lenient().when(eventInfoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(foreign));
        } else if (operation.equals("DELETE")) {
            org.mockito.Mockito.lenient().when(eventInfoRepository.findById(1L)).thenReturn(Optional.of(foreign));
        }
        Runnable write = switch (operation) {
            case "CREATE" -> () -> eventInfoService.createEvent("foreign-writer", EventInfoDto.builder().evntNm("new").build());
            case "UPDATE" -> () -> eventInfoService.updateEvent(1L, "foreign-writer", EventInfoDto.builder().evntNm("changed").build());
            default -> () -> eventInfoService.deleteEvent(1L);
        };
        org.assertj.core.api.Assertions.assertThatThrownBy(write::run)
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        org.mockito.Mockito.verifyNoInteractions(eventInfoRepository, externalHrRepository);
        assertThat(foreign.getEvntNm()).isEqualTo("foreign event");
    }

    @Test
    void createStartsUnapprovedAndRejectsApprovalInjection() {
        authorize("EVENT_CREATE");
        given(eventInfoRepository.save(any(EventInfo.class))).willAnswer(invocation -> invocation.getArgument(0));
        eventInfoService.createEvent("writer", EventInfoDto.builder().evntNm("새 행사").build());
        var saved = org.mockito.ArgumentCaptor.forClass(EventInfo.class);
        verify(eventInfoRepository).save(saved.capture());
        assertThat(saved.getValue().getEvntAprvYn()).isEqualTo("N");
        assertThat(saved.getValue().getEvntAprvYmd()).isNull();
        org.mockito.Mockito.clearInvocations(eventInfoRepository);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> eventInfoService.createEvent("writer",
                EventInfoDto.builder().evntAprvYn("Y").evntAprvYmd("20260928").build()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        org.mockito.Mockito.verifyNoInteractions(eventInfoRepository);
    }

    @Test
    void updatePreservesApprovalWhenOmittedOrResentAndRejectsChanges() {
        authorize("EVENT_UPDATE");
        EventInfo existing = EventInfo.builder().evntSn(1L).evntNm("기존")
                .evntAprvYn("Y").evntAprvYmd("20260927").build();
        given(eventInfoRepository.findByIdForUpdate(1L)).willReturn(Optional.of(existing));
        eventInfoService.updateEvent(1L, "writer", EventInfoDto.builder().evntNm("정정").build());
        eventInfoService.updateEvent(1L, "writer", EventInfoDto.builder().evntNm("정정")
                .evntAprvYn("Y").evntAprvYmd("2026-09-27").build());
        var saved = org.mockito.ArgumentCaptor.forClass(EventInfo.class);
        verify(eventInfoRepository, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).allSatisfy(event -> {
            assertThat(event.getEvntAprvYn()).isEqualTo("Y");
            assertThat(event.getEvntAprvYmd()).isEqualTo("20260927");
        });
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> eventInfoService.updateEvent(1L, "writer",
                EventInfoDto.builder().evntNm("변조").evntAprvYn("N").build()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> eventInfoService.updateEvent(1L, "writer",
                EventInfoDto.builder().evntNm("변조").evntAprvYmd("").build()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        verify(eventInfoRepository, times(2)).save(any());
    }

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
        authorize("EVENT_CREATE");
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
        authorize("EVENT_UPDATE");
        // given
        EventInfo existingEvent = EventInfo.builder().evntSn(1L).evntCn("Old Event").build();
        existingEvent.setFrstRgtrId("foreign-writer");
        given(eventInfoRepository.findByIdForUpdate(1L)).willReturn(Optional.of(existingEvent));
        
        EventInfoDto updateDto = EventInfoDto.builder().evntCn("Updated Event").bizYr("2025").build();

        // when
        eventInfoService.updateEvent(1L, "user1", updateDto);

        // then
        verify(eventInfoRepository, times(1)).save(any(EventInfo.class));
        var saved = org.mockito.ArgumentCaptor.forClass(EventInfo.class);
        verify(eventInfoRepository).save(saved.capture());
        assertThat(saved.getValue().getFrstRgtrId()).isEqualTo("foreign-writer");
    }

    @Test
    @DisplayName("이벤트 수정 - 실패 (존재하지 않음)")
    void updateEvent_Fail_NotFound() {
        authorize("EVENT_UPDATE");
        // given
        given(eventInfoRepository.findByIdForUpdate(99L)).willReturn(Optional.empty());
        EventInfoDto updateDto = EventInfoDto.builder().evntCn("Updated Event").build();

        // when & then
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> eventInfoService.updateEvent(99L, "user1", updateDto))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("이벤트 삭제 - 성공")
    void deleteEvent() {
        authorize("EVENT_DELETE");
        // given
        EventInfo existingEvent = EventInfo.builder().evntSn(1L).build();
        existingEvent.setFrstRgtrId("foreign-writer");
        given(eventInfoRepository.findById(1L)).willReturn(Optional.of(existingEvent));

        // when
        eventInfoService.deleteEvent(1L);

        // then
        verify(eventInfoRepository, times(1)).delete(existingEvent);
    }

    @Test
    @DisplayName("🚨 외부인사가 등록된 행사는 건수를 밝혀 409 로 거부하고 지우지 않는다 (DIP V9)")
    void deleteEvent_rejectsWhenExternalHrExists() {
        authorize("EVENT_DELETE");
        EventInfo existingEvent = EventInfo.builder().evntSn(1L).build();
        given(eventInfoRepository.findById(1L)).willReturn(Optional.of(existingEvent));
        given(externalHrRepository.countByEvntSn(1L)).willReturn(3L);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> eventInfoService.deleteEvent(1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE)
                .hasMessageContaining("외부인사 3명");
        verify(eventInfoRepository, org.mockito.Mockito.never()).delete(any(EventInfo.class));
    }
}
