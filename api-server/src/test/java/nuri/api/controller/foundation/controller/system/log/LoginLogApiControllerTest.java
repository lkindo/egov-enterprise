package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.LoginLogManageService;
import nuri.business.service.log.dto.LoginLogDto;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("LoginLogApiController 테스트")
class LoginLogApiControllerTest {

    private static final String EXPORT_URL = "/api/v1/admin/system/logs/login/export.xlsx";

    private MockMvc mockMvc;

    @Mock
    private LoginLogManageService loginLogManageService;

    @InjectMocks
    private LoginLogApiController loginLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(loginLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("로그인 로그 목록 조회 성공")
    void testGetLoginLogList() throws Exception {
        when(loginLogManageService.selectLoginLogList(any())).thenReturn(Collections.emptyList());
        when(loginLogManageService.selectLoginLogListTotCnt(any())).thenReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/logs/login"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("로그인 로그 상세 조회 성공")
    void testGetLoginLog() throws Exception {
        LoginLogDto dto = new LoginLogDto();
        dto.setLgnSn(101L);
        when(loginLogManageService.selectLoginLogDetail(anyLong())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/logs/login/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lgnSn").value(101));
    }

    @Test
    @DisplayName("xlsx export — 페이지 파라미터를 무시하고 전체 결과 행 수를 내보낸다 (제6조 3항 ①·② 헤더 검증 포함)")
    void testExportLoginLogs_fullResult_ignoresPaging() throws Exception {
        List<LoginLogDto> rows = List.of(
                loginLog(1L, "userA", "10.0.0.1", "PWD", "N", null, "2026-08-01T09:00"),
                loginLog(2L, "userB", "10.0.0.2", "PWD", "Y", "E001", "2026-08-02T09:00"),
                loginLog(3L, "userC", "10.0.0.3", "SSO", "N", null, "2026-08-03T09:00"));
        when(loginLogManageService.selectLoginLogListTotCnt(any())).thenReturn(rows.size());
        when(loginLogManageService.selectLoginLogList(any())).thenReturn(rows);

        // 화면 페이징 값(pageIndex=7, pageUnit=2)이 그대로면 2행만 나와야 하지만, export 는 전량이어야 한다.
        MvcResult asyncStarted = mockMvc.perform(get(EXPORT_URL)
                        .param("pageIndex", "7")
                        .param("pageUnit", "2")
                        .param("searchKeyword", "PWD")
                        .param("searchKeywordFrom", "2026-08-01")
                        .param("searchKeywordTo", "2026-08-31"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(asyncStarted))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"login-logs.xlsx\""))
                .andExpect(content().contentType(LoginLogApiController.XLSX_MEDIA_TYPE));

        // 검색 조건은 목록 API 와 동일 바인딩, 페이지만 전량으로 덮어써졌는지 캡처로 증명한다.
        ArgumentCaptor<BaseSearchDto> captor = ArgumentCaptor.forClass(BaseSearchDto.class);
        verify(loginLogManageService).selectLoginLogList(captor.capture());
        BaseSearchDto bound = captor.getValue();
        assertThat(bound.getSearchKeyword()).isEqualTo("PWD");
        assertThat(bound.getSearchKeywordFrom()).isEqualTo("2026-08-01");
        assertThat(bound.getSearchKeywordTo()).isEqualTo("2026-08-31");
        assertThat(bound.getPageIndex()).isEqualTo(1);
        assertThat(bound.getPageUnit()).isEqualTo(rows.size());

        byte[] body = asyncStarted.getResponse().getContentAsByteArray();
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            Sheet sheet = workbook.getSheetAt(0);
            // 헤더 1행 + 데이터 3행 → 마지막 행 인덱스 3 (전체 결과 행 수 = 조건 일치 건수)
            assertThat(sheet.getLastRowNum()).isEqualTo(rows.size());
            assertThat(sheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("userA");
            assertThat(sheet.getRow(2).getCell(5).getStringCellValue()).isEqualTo("E001");
            assertThat(sheet.getRow(3).getCell(3).getStringCellValue()).isEqualTo("SSO");
        }
    }

    @Test
    @DisplayName("xlsx export — 결과 0건이어도 헤더만 있는 정상 xlsx 를 내려준다")
    void testExportLoginLogs_emptyResult() throws Exception {
        when(loginLogManageService.selectLoginLogListTotCnt(any())).thenReturn(0);
        when(loginLogManageService.selectLoginLogList(any())).thenReturn(Collections.emptyList());

        MvcResult asyncStarted = mockMvc.perform(get(EXPORT_URL))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(asyncStarted))
                .andExpect(status().isOk());

        byte[] body = asyncStarted.getResponse().getContentAsByteArray();
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getLastRowNum()).isZero(); // 헤더 행만 존재
        }
    }

    @Test
    @DisplayName("xlsx export — 행 상한 초과 시 400 이며 본문 조회를 아예 시작하지 않는다")
    void testExportLoginLogs_overCap_returns400() throws Exception {
        when(loginLogManageService.selectLoginLogListTotCnt(any()))
                .thenReturn(LoginLogApiController.MAX_EXPORT_ROWS + 1);

        mockMvc.perform(get(EXPORT_URL))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(loginLogManageService, never()).selectLoginLogList(any());
    }

    private static LoginLogDto loginLog(Long sn, String id, String ip, String method,
                                        String errYn, String errCode, String creatDt) {
        return LoginLogDto.builder()
                .lgnSn(sn)
                .loginId(id)
                .loginIp(ip)
                .loginMthd(method)
                .errOccrrAt(errYn)
                .errorCode(errCode)
                .creatDt(creatDt)
                .build();
    }
}
