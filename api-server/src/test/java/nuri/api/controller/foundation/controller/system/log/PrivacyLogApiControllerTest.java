package nuri.api.controller.foundation.controller.system.log;

import nuri.business.service.log.PrivacyLogManageService;
import nuri.business.service.log.dto.PrivacyLogDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("PrivacyLogApiController 테스트")
class PrivacyLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PrivacyLogManageService privacyLogManageService;

    @InjectMocks
    private PrivacyLogApiController privacyLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(privacyLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /** Exact operations preserve SYSTEM exclusion, even in a mixed group with an explicit grant. */
    @Test
    @DisplayName("개인정보 로그 기능 권한과 SYSTEM 배제를 함께 유지한다")
    void privacyLogListMustExcludeSystemRole() throws Exception {
        nuri.security.support.MethodPermissionContract.assertOperation(PrivacyLogApiController.class
                .getDeclaredMethod("getPrivacyLogList", nuri.business.domain.common.BaseSearchDto.class), "PRIVACY_READ", true);
        nuri.security.support.MethodPermissionContract.assertOperation(PrivacyLogApiController.class
                .getDeclaredMethod("exportPrivacyLogs", nuri.business.domain.common.BaseSearchDto.class), "PRIVACY_EXPORT", true);
    }

    /** 검색어가 서비스까지 도달하는지 — 목이 응답을 주므로 이 단언이 없으면 검색창이 죽어도 초록이다. */
    @Test
    @DisplayName("검색어가 서비스 계층까지 전달된다 — 파라미터 유실 차단")
    void testSearchKeywordReachesService() throws Exception {
        when(privacyLogManageService.selectPrivacyLogList(any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/v1/admin/system/logs/privacy")
                        .param("page", "1")
                        .param("searchKeyword", "주민등록번호"))
                .andExpect(status().isOk());

        var captor = ArgumentCaptor.forClass(nuri.business.domain.common.BaseSearchDto.class);
        verify(privacyLogManageService).selectPrivacyLogList(captor.capture());
        assertThat(captor.getValue().getSearchKeyword()).isEqualTo("주민등록번호");
    }

    @Test
    @DisplayName("목록 JSON 과 xlsx export 모두 정보주체 ID(trprId)를 포함한다")
    void privacyLogListAndExportExposeTrprId() throws Exception {
        PrivacyLogDto row = PrivacyLogDto.builder()
                .prvcLogSn(11L)
                .dmndId("REQ_011")
                .inqDt(LocalDateTime.of(2026, 11, 16, 9, 0, 0))
                .srvcNm("UserApiController#getUser")
                .inqInfo("사용자 상세")
                .trprId("USR_SUBJECT_11")
                .dmndUserId("admin")
                .dmndUserIpAddr("127.0.0.1")
                .build();
        when(privacyLogManageService.selectPrivacyLogList(any()))
                .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/logs/privacy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].trprId").value("USR_SUBJECT_11"));

        MvcResult started = mockMvc.perform(get("/api/v1/admin/system/logs/privacy/export.xlsx"))
                .andExpect(request().asyncStarted())
                .andReturn();
        MvcResult exportResult = mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andReturn();
        try (XSSFWorkbook workbook = new XSSFWorkbook(
                new ByteArrayInputStream(exportResult.getResponse().getContentAsByteArray()))) {
            var sheet = workbook.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(5).getStringCellValue()).isEqualTo("정보주체 ID");
            assertThat(sheet.getRow(1).getCell(5).getStringCellValue()).isEqualTo("USR_SUBJECT_11");
            assertThat(sheet.getRow(1).getCell(6).getStringCellValue()).isEqualTo("admin");
            assertThat(sheet.getRow(1).getCell(7).getStringCellValue()).isEqualTo("127.0.0.1");
        }
    }
}
