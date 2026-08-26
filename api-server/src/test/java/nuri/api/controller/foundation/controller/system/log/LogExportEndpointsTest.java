package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.LogManageService;
import nuri.business.service.log.PrivacyLogManageService;
import nuri.business.service.log.UserLogManageService;
import nuri.business.service.log.WebLogManageService;
import nuri.business.service.log.dto.PrivacyLogDto;
import nuri.business.service.log.dto.SysLogDto;
import nuri.business.service.log.dto.UserLogDto;
import nuri.business.service.log.dto.WebLogDto;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로그 4종 전체 결과 xlsx export.
 *
 * <p>[무엇을 지키는가] 로그인 로그에만 있던 서버측 전량 export 를 나머지 4종에 붙였다
 * (2026-08-26). A6 의 "서버측 전체 내보내기" 필수 항목이며, 이것이 없는 동안 화면은
 * <b>현재 페이지만</b> 반출할 수 있었다.
 *
 * <p>세 가지를 고정한다 —
 * ① 검색 조건은 목록 API 와 <b>같은 모집단</b>으로 바인딩되고 페이지 파라미터만 전량으로 덮인다,
 * ② 응답은 첨부 파일 헤더와 xlsx 타입을 갖는다,
 * ③ 행 상한 초과는 파일을 만들기 전에 400 으로 실패한다(무제한 스트리밍 금지).
 */
@DisplayName("로그 전체 결과 export 엔드포인트")
class LogExportEndpointsTest {

    @Mock
    private LogManageService logManageService;
    @Mock
    private UserLogManageService userLogManageService;
    @Mock
    private WebLogManageService webLogManageService;
    @Mock
    private PrivacyLogManageService privacyLogManageService;

    @InjectMocks
    private SystemLogApiController systemLogApiController;
    @InjectMocks
    private UserLogApiController userLogApiController;
    @InjectMocks
    private WebLogApiController webLogApiController;
    @InjectMocks
    private PrivacyLogApiController privacyLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private MockMvc mvc(Object controller) {
        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static <T> Page<T> pageOf(List<T> content, long total) {
        return new PageImpl<>(content, PageRequest.of(0, Math.max(content.size(), 1)), total);
    }

    private static String[] firstDataRow(byte[] body, int cells) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            Sheet sheet = workbook.getSheetAt(0);
            String[] values = new String[cells];
            for (int i = 0; i < cells; i++) {
                values[i] = sheet.getRow(1).getCell(i).getStringCellValue();
            }
            return values;
        }
    }

    private byte[] download(MockMvc mockMvc, String url, String fileName) throws Exception {
        MvcResult started = mockMvc.perform(get(url)
                        .param("pageIndex", "7")
                        .param("pageUnit", "2")
                        .param("searchKeyword", "조회어")
                        .param("searchKeywordFrom", "20260801")
                        .param("searchKeywordTo", "20260831"))
                .andExpect(request().asyncStarted())
                .andReturn();

        return mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\""))
                .andExpect(content().contentType(LogExcelExport.XLSX_MEDIA_TYPE))
                .andReturn().getResponse().getContentAsByteArray();
    }

    @Test
    @DisplayName("시스템 로그 — 검색 조건은 유지하고 페이지만 전량으로 덮어쓴다")
    void exportsSystemLogs() throws Exception {
        SysLogDto row = new SysLogDto();
        row.setSysLogSn(11L);
        row.setSrvcNm("UserService");
        when(logManageService.selectSysLogListTotCnt(any())).thenReturn(3);
        when(logManageService.selectSysLogList(any())).thenReturn(List.of(row));

        byte[] body = download(mvc(systemLogApiController),
                "/api/v1/admin/system/logs/system/export.xlsx", "system-logs.xlsx");

        assertThat(firstDataRow(body, 3)[0]).isEqualTo("11");

        // 검색어·기간은 목록 API 와 같게, 페이지만 전량으로 덮였는지 캡처로 증명한다.
        ArgumentCaptor<BaseSearchDto> captor = ArgumentCaptor.forClass(BaseSearchDto.class);
        org.mockito.Mockito.verify(logManageService).selectSysLogList(captor.capture());
        BaseSearchDto bound = captor.getValue();
        assertThat(bound.getSearchKeyword()).isEqualTo("조회어");
        assertThat(bound.getSearchKeywordFrom()).isEqualTo("20260801");
        assertThat(bound.getSearchKeywordTo()).isEqualTo("20260831");
        assertThat(bound.getPageIndex()).isEqualTo(1);
        assertThat(bound.getPageUnit()).isNotEqualTo(2);
    }

    @Test
    @DisplayName("사용자 로그 — 총 건수를 먼저 세고 전량을 다시 조회한다")
    void exportsUserLogs() throws Exception {
        UserLogDto row = new UserLogDto("20260826", "userA", "홍길동", "UserService", "select",
                1, 0, 2, 0, 0, 0);
        when(userLogManageService.selectUserLogList(any())).thenReturn(pageOf(List.of(row), 1));

        byte[] body = download(mvc(userLogApiController),
                "/api/v1/admin/system/logs/user/export.xlsx", "user-logs.xlsx");

        assertThat(firstDataRow(body, 2)).containsExactly("20260826", "userA");
    }

    @Test
    @DisplayName("웹 로그 — 첨부 헤더와 xlsx 타입으로 내려간다")
    void exportsWebLogs() throws Exception {
        WebLogDto row = new WebLogDto(5L, "/api/v1/x", "userB", "10.0.0.1", "20260826", 12L);
        when(webLogManageService.selectWebLogList(any())).thenReturn(pageOf(List.of(row), 1));

        byte[] body = download(mvc(webLogApiController),
                "/api/v1/admin/system/logs/web/export.xlsx", "web-logs.xlsx");

        assertThat(firstDataRow(body, 2)).containsExactly("5", "/api/v1/x");
    }

    @Test
    @DisplayName("개인정보 조회 로그 — 조회일시를 문자열로 보존한다")
    void exportsPrivacyLogs() throws Exception {
        PrivacyLogDto row = new PrivacyLogDto(9L, "REQ-9", LocalDateTime.of(2026, 8, 26, 9, 30),
                "UserService", "주민등록번호", "userC", "10.0.0.2");
        when(privacyLogManageService.selectPrivacyLogList(any())).thenReturn(pageOf(List.of(row), 1));

        byte[] body = download(mvc(privacyLogApiController),
                "/api/v1/admin/system/logs/privacy/export.xlsx", "privacy-logs.xlsx");

        String[] cells = firstDataRow(body, 3);
        assertThat(cells[0]).isEqualTo("9");
        assertThat(cells[2]).contains("2026-08-26");
    }

    @Test
    @DisplayName("행 상한을 넘으면 파일을 만들기 전에 400 으로 실패한다")
    void rejectsOverCap() throws Exception {
        when(logManageService.selectSysLogListTotCnt(any()))
                .thenReturn(LogExcelExport.MAX_EXPORT_ROWS + 1);

        mvc(systemLogApiController)
                .perform(get("/api/v1/admin/system/logs/system/export.xlsx"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("상한 초과 요청은 전량 조회를 시도하지 않는다 — 힙에 올리기 전에 막는다")
    void doesNotFetchWhenOverCap() throws Exception {
        when(logManageService.selectSysLogListTotCnt(any()))
                .thenReturn(LogExcelExport.MAX_EXPORT_ROWS + 1);

        mvc(systemLogApiController)
                .perform(get("/api/v1/admin/system/logs/system/export.xlsx"))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(logManageService, org.mockito.Mockito.never())
                .selectSysLogList(any());
    }
}
