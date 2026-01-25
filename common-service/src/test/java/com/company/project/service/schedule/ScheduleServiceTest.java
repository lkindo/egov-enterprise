package com.company.project.service.schedule;

import com.company.project.domain.schedule.ScheduleRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    @Test
    void testSelectEmpLyrPopup() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageSize(10);
        searchVO.setSearchCondition("USER_NM");
        searchVO.setSearchKeyword("John");

        User user = User.builder()
                .userId("user1")
                .esntlId("ESNTL001")
                .userNm("John Doe")
                .password("password")
                .offmTelno("02-123-4567")
                .homeadres("Seoul")
                .detailAdres("Gangnam")
                .build();

        Page<User> userPage = new PageImpl<>(Collections.singletonList(user));

        when(userRepository.searchUsers(eq(null), eq("USER_NM"), eq("John"), any(Pageable.class)))
                .thenReturn(userPage);

        // When
        List<Map<String, Object>> result = scheduleService.selectEmpLyrPopup(searchVO);

        // Then
        Assertions.assertEquals(1, result.size());
        Map<String, Object> map = result.get(0);
        Assertions.assertEquals("user1", map.get("emplyrId"));
        Assertions.assertEquals("John Doe", map.get("userNm"));
        Assertions.assertEquals("ESNTL001", map.get("esntlId"));
        Assertions.assertEquals("02-123-4567", map.get("offmTelno"));
        Assertions.assertEquals("Seoul", map.get("homeadres"));
        Assertions.assertEquals("Gangnam", map.get("detailAdres"));
    }
}
