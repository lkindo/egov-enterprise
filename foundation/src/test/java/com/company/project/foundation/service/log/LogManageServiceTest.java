package com.company.project.foundation.service.log;

import com.company.project.foundation.domain.log.SysLog;
import com.company.project.foundation.domain.log.SysLogRepository;
import com.company.project.foundation.service.log.dto.SysLogDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LogManageService 테스트")
class LogManageServiceTest {

    @Mock
    private SysLogRepository sysLogRepository;

    @InjectMocks
    private LogManageService logManageService;

    @Nested
    @DisplayName("시스템 로그 등록 테스트")
    class InsertSysLogTests {

        @Test
        @DisplayName("시스템 로그 등록 성공")
        void testInsertSysLog_Success() {
            // Given
            SysLogDto dto = SysLogDto.builder()
                    .requstId("REQ_001")
                    .srvcNm("UserService")
                    .methodNm("getUser")
                    .processSeCode("REQ")
                    .processTime("100")
                    .rqesterId("admin")
                    .rqesterIp("127.0.0.1")
                    .build();

            // When
            logManageService.insertSysLog(dto);

            // Then
            verify(sysLogRepository, times(1)).save(any(SysLog.class));
        }
    }

    @Nested
    @DisplayName("시스템 로그 조회 테스트")
    class SelectSysLogTests {

        @Test
        @DisplayName("시스템 로그 목록 조회 성공")
        void testSelectSysLogList_Success() {
            // Given
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);
            searchVO.setSearchKeyword("UserService");

            SysLog log1 = SysLog.builder()
                    .requstId("REQ_001")
                    .srvcNm("UserService")
                    .build();

            Page<SysLog> page = new PageImpl<>(Arrays.asList(log1));
            when(sysLogRepository.searchSysLogs(anyString(), any(), any(), any(Pageable.class)))
                    .thenReturn(page);

            // When
            List<SysLogDto> result = logManageService.selectSysLogList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("REQ_001", result.get(0).getRequstId());
            assertEquals("UserService", result.get(0).getSrvcNm());
            verify(sysLogRepository, times(1)).searchSysLogs(eq("UserService"), any(), any(), any(Pageable.class));
        }

        @Test
        @DisplayName("시스템 로그 목록 총 갯수 조회 성공")
        void testSelectSysLogListTotCnt_Success() {
            // Given
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setSearchKeyword("test");

            Page<SysLog> page = new PageImpl<>(Arrays.asList(SysLog.builder().build()), Pageable.unpaged(), 5);
            when(sysLogRepository.searchSysLogs(anyString(), any(), any(), any(Pageable.class)))
                    .thenReturn(page);

            // When
            int count = logManageService.selectSysLogListTotCnt(searchVO);

            // Then
            assertEquals(5, count);
        }

        @Test
        @DisplayName("시스템 로그 상세 조회 성공")
        void testSelectSysLog_Success() {
            // Given
            String requestId = "REQ_001";
            SysLog log = SysLog.builder()
                    .requstId(requestId)
                    .srvcNm("UserService")
                    .build();

            when(sysLogRepository.findById(requestId)).thenReturn(Optional.of(log));

            // When
            SysLogDto result = logManageService.selectSysLog(requestId);

            // Then
            assertNotNull(result);
            assertEquals(requestId, result.getRequstId());
            assertEquals("UserService", result.getSrvcNm());
        }

        @Test
        @DisplayName("존재하지 않는 시스템 로그 조회 시 null 반환")
        void testSelectSysLog_NotFound() {
            // Given
            String requestId = "NON_EXIST";
            when(sysLogRepository.findById(requestId)).thenReturn(Optional.empty());

            // When
            SysLogDto result = logManageService.selectSysLog(requestId);

            // Then
            assertNull(result);
        }
    }
}
