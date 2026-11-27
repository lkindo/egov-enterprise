package nuri.api.support;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class XlsxExportTest {

    @Test
    @DisplayName("수식 인젝션 트리거 접두사는 탐지하고 원본 문자열은 변조하지 않는다")
    void detectsFormulaTriggerWithoutMutatingAuditValues() {
        assertThat(XlsxExport.isFormulaTrigger(null)).isFalse();
        assertThat(XlsxExport.isFormulaTrigger("")).isFalse();
        assertThat(XlsxExport.isFormulaTrigger("=SUM(A1:A2)")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("+cmd|'/C calc'!A0")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("-1+1")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("@SUM(1,2)")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("\t=1+1")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("\r=1+1")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("  =cmd")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger(" \u000B +1")).isTrue();
        assertThat(XlsxExport.isFormulaTrigger("2026-11-27")).isFalse();
        assertThat(XlsxExport.nullSafe("2026-11-27")).isEqualTo("2026-11-27");
        assertThat(XlsxExport.nullSafe("+user")).isEqualTo("+user");
        assertThat(XlsxExport.nullSafe(123L)).isEqualTo("123");
    }

    @Test
    @DisplayName("attachment 스트림은 수식 트리거 셀에 quotePrefixed 스타일을 부여하면서 원본 값을 보존한다")
    void attachmentPreservesOriginalValuesWithQuotePrefixedStyle() throws Exception {
        List<String> payloads = List.of("=1+1", "+user", "-100", "@SUM(1,2)", "\t=cmd", "  =cmd");
        var response = XlsxExport.attachment("test.xlsx", "sheet",
                new String[]{"사용자", "설명"},
                payloads,
                (row, value) -> {
                    row.createCell(0).setCellValue(XlsxExport.nullSafe(value));
                    row.createCell(1).setCellValue(XlsxExport.nullSafe("정상 텍스트"));
                });

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        response.getBody().writeTo(out);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(out.toByteArray()))) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 0; i < payloads.size(); i++) {
                Cell triggerCell = sheet.getRow(i + 1).getCell(0);
                Cell normalCell = sheet.getRow(i + 1).getCell(1);

                assertThat(triggerCell.getCellType()).isEqualTo(CellType.STRING);
                assertThat(triggerCell.getStringCellValue()).isEqualTo(payloads.get(i));
                assertThat(triggerCell.getCellStyle().getQuotePrefixed()).isTrue();

                assertThat(normalCell.getCellType()).isEqualTo(CellType.STRING);
                assertThat(normalCell.getStringCellValue()).isEqualTo("정상 텍스트");
                assertThat(normalCell.getCellStyle().getQuotePrefixed()).isFalse();
            }
        }
    }
}
