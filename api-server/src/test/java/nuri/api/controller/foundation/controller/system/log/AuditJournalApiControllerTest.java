package nuri.api.controller.foundation.controller.system.log;

import nuri.api.support.XlsxExport;
import nuri.business.service.log.SensitiveAuditQueryService;
import nuri.business.service.log.dto.AuditJournalEntry;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.function.IntConsumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 민감 작업 감사 원장 열람 API(2026-10-20 조건 검색·작업 종류·내보내기).
 *
 * <p>사유 검사와 원장 기록은 감사 경계({@code SensitiveAuditInterceptor})가 맡는다 — {@code SensitiveResponseAuditTest} 가
 * 사유 없는 내보내기는 핸들러 전에 400 이고 원장에 남지 않으며, 사유가 있으면 설명에 실려 시도·완료가 남는다는 것을 본다.
 * 여기서는 권한 바인딩, 조건 전달, 파일 모양, 상한을 본다.
 */
@DisplayName("AuditJournalApiController")
class AuditJournalApiControllerTest {

    private final SensitiveAuditQueryService service = mock(SensitiveAuditQueryService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new AuditJournalApiController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static Method handler(String name) {
        return Arrays.stream(AuditJournalApiController.class.getDeclaredMethods())
                .filter(method -> method.getName().equals(name)).findFirst().orElseThrow();
    }

    @Test
    @DisplayName("목록·작업 종류·내보내기는 모두 ADT_LOG_READ 하나로 열린다 — 내보내기용 권한을 새로 두지 않는다")
    void everyHandlerIsBoundToTheDedicatedPermission() {
        for (String name : List.of("getAuditJournal", "getAuditJournalOperations", "exportAuditJournal")) {
            nuri.security.support.MethodPermissionContract.assertOperation(handler(name), "ADT_LOG_READ", false);
        }
    }

    @Test
    @DisplayName("내보내기는 원장에 남는 민감 작업이고 사유 파라미터를 감사 경계에 선언한다")
    void exportDeclaresItselfSensitiveWithAReason() {
        var declared = handler("exportAuditJournal").getAnnotation(nuri.foundation.core.annotation.SensitiveOperation.class);
        assertThat(declared).isNotNull();
        assertThat(declared.value()).isEqualTo("민감 작업 감사 원장 내보내기");
        assertThat(declared.reasonParameter()).isEqualTo("reason");
        // 작업 종류에는 개인정보가 없어 원장에 남기지 않는다(남기면 화면을 열 때마다 원장이 두 번 쌓인다).
        assertThat(handler("getAuditJournalOperations")
                .getAnnotation(nuri.foundation.core.annotation.SensitiveOperation.class)).isNull();
    }

    @Test
    @DisplayName("작업 종류는 원장에 남은 작업 이름 목록이다")
    void operationsAreTheLedgerOperationNames() throws Exception {
        when(service.operations()).thenReturn(List.of("ADMIN_PASSWORD_RESET", "UserApiController#resetPassword"));

        mvc.perform(get("/api/v1/admin/system/logs/audit/operations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("ADMIN_PASSWORD_RESET"))
                .andExpect(jsonPath("$.data[1]").value("UserApiController#resetPassword"));
    }

    @Test
    @DisplayName("목록의 조건(행위자·작업·기간)이 서비스까지 그대로 간다")
    void listConditionsReachTheService() throws Exception {
        when(service.search(any(), any(), any(), any(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        mvc.perform(get("/api/v1/admin/system/logs/audit")
                        .param("actorId", "admin").param("operation", "ADMIN_PASSWORD_RESET")
                        .param("fromDate", "2026-10-01").param("toDate", "2026-10-20"))
                .andExpect(status().isOk());

        verify(service).search("admin", "ADMIN_PASSWORD_RESET", "2026-10-01", "2026-10-20", 0, 20);
    }

    @Test
    @DisplayName("내보내기는 같은 조건으로 행을 받아 첨부 xlsx 로 내려 주고, 설명(사유 포함)을 열에 싣는다")
    void exportStreamsTheListConditionAsAttachment() throws Exception {
        AuditJournalEntry entry = new AuditJournalEntry("7", "req-7", "SUCCEEDED", "AuditJournalApiController#exportAuditJournal",
                "auditor", LocalDateTime.of(2026, 10, 20, 9, 30), null, "10.0.0.9",
                "민감 작업 감사 원장 내보내기 — 사유: 월간 점검", 200);
        when(service.exportEntries(eq("auditor"), isNull(), eq("2026-10-01"), eq("2026-10-20"), any())).thenReturn(List.of(entry));

        MvcResult started = mvc.perform(get("/api/v1/admin/system/logs/audit/export.xlsx")
                        .param("actorId", "auditor").param("fromDate", "2026-10-01").param("toDate", "2026-10-20")
                        .param("reason", "월간 점검"))
                .andExpect(request().asyncStarted())
                .andReturn();
        byte[] body = mvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-journal.xlsx\""))
                .andExpect(content().contentType(XlsxExport.XLSX_MEDIA_TYPE))
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(3).getStringCellValue()).isEqualTo("설명");
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).isEqualTo("7");
            assertThat(sheet.getRow(1).getCell(2).getStringCellValue()).isEqualTo("AuditJournalApiController#exportAuditJournal");
            assertThat(sheet.getRow(1).getCell(3).getStringCellValue()).contains("사유: 월간 점검");
            assertThat(sheet.getRow(1).getCell(8).getStringCellValue()).isEqualTo("200");
        }
    }

    @Test
    @DisplayName("상한은 로그 내보내기와 같은 행 상한이다 — 넘으면 파일을 만들기 전에 400 이다")
    void exportUsesTheSharedRowCap() throws Exception {
        doAnswer(invocation -> {
            IntConsumer withinCap = invocation.getArgument(4);
            withinCap.accept(XlsxExport.MAX_EXPORT_ROWS + 1);
            return List.of();
        }).when(service).exportEntries(any(), any(), any(), any(), any());

        mvc.perform(get("/api/v1/admin/system/logs/audit/export.xlsx").param("reason", "월간 점검"))
                .andExpect(request().asyncNotStarted())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("잘못된 조건은 서비스가 거부한 대로 400 이다")
    void exportRejectsInvalidConditions() throws Exception {
        when(service.exportEntries(any(), any(), eq("2026-10-01"), isNull(), any()))
                .thenThrow(new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 기간은 시작일과 종료일을 함께 입력하세요."));

        mvc.perform(get("/api/v1/admin/system/logs/audit/export.xlsx").param("fromDate", "2026-10-01").param("reason", "월간 점검"))
                .andExpect(status().isBadRequest());
    }
}
