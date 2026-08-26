package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.OutputStream;
import java.util.List;

/**
 * 로그 전체 결과 xlsx export 의 공통 규칙.
 *
 * <p>다섯 로그 컨트롤러가 같은 형태의 export 를 제공하므로 상한 가드·스트리밍·응답 헤더를 한 곳에
 * 모은다. 컨트롤러는 <b>어떤 행을, 어떤 열 이름으로</b> 쓸지만 정하고 나머지는 여기 규칙을 따른다.
 *
 * <p>[왜 상한인가 — 무제한 스트리밍 금지] 이 경로는 페이지 무관 <b>전체</b> 결과를 내보낸다.
 * 상한이 없으면 검색 조건이 느슨할 때 단일 HTTP 요청 하나가 수백만 행을 조회·직렬화하며 DB
 * 커넥션과 서블릿 스레드를 무기한 점유한다(백엔드 헌법 제9조 2항 — 커넥션 점유 시간 최소화,
 * 제14조 — OOM 방어). SXSSF 가 워크북 메모리는 창 크기로 억제하지만 <b>조회 결과 List 자체는
 * 힙에 실린다</b>. 그래서 행 수를 먼저 세고, 상한 초과면 400 으로 즉시 실패시켜 기간 필터 등으로
 * 조건을 좁히도록 강제한다.
 *
 * <p>[헌법 제6조 3항 binary/stream 예외] 공통 래퍼 밖 반환은 ① {@code Content-Disposition: attachment}
 * ② 명시적 {@code produces} ③ {@code ResponseContractLinterTest} binary 허용 census 등재의 세 조건으로
 * 허용된다. 이 헬퍼는 ①을 구조적으로 보장하고, ②·③ 은 각 컨트롤러가 선언한다.
 */
final class LogExcelExport {

    /** export 미디어 타입 — OOXML 스프레드시트(.xlsx). */
    static final String XLSX_MEDIA_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /** 서버측 전체 결과 export 의 행 상한. */
    static final int MAX_EXPORT_ROWS = 100_000;

    /** SXSSF 메모리 창 — 이 행 수를 넘는 행은 임시 파일로 flush 되어 힙에 남지 않는다. */
    private static final int SXSSF_ROW_WINDOW = 200;

    private LogExcelExport() {
    }

    /** 한 행을 워크북에 쓰는 방법. 컨트롤러가 자기 DTO 를 아는 유일한 지점이다. */
    @FunctionalInterface
    interface RowWriter<T> {
        void write(Row row, T item);
    }

    /**
     * 상한을 넘는 조회는 파일을 만들기 전에 실패시킨다.
     *
     * <p>0건이어도 실패시키지 않는다 — 조건에 맞는 결과가 없다는 사실 자체가 감사 증거이며,
     * 빈 파일은 그 사실을 정확히 전달한다.
     */
    static void assertWithinCap(int totalCount) {
        if (totalCount > MAX_EXPORT_ROWS) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "export 대상이 " + totalCount + "행으로 상한(" + MAX_EXPORT_ROWS
                            + "행)을 초과합니다. 검색 기간이나 조건을 좁혀 다시 시도하십시오.");
        }
    }

    /**
     * 확보된 행을 xlsx 첨부 응답으로 만든다.
     *
     * <p>⚠ {@code rows} 는 <b>호출 시점에 이미 조회가 끝난</b> 목록이어야 한다. 스트리밍 람다는
     * 요청 스레드 밖에서 실행되므로 그 안에서 조회하면 트랜잭션·보안 컨텍스트가 없다.
     */
    static <T> ResponseEntity<StreamingResponseBody> attachment(
            String fileName, String sheetName, String[] headers, List<T> rows, RowWriter<T> writer) {

        StreamingResponseBody body = out -> writeXlsx(out, sheetName, headers, rows, writer);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(XLSX_MEDIA_TYPE))
                .body(body);
    }

    /** try-with-resources 가 SXSSF 임시 파일까지 정리한다. */
    private static <T> void writeXlsx(
            OutputStream out, String sheetName, String[] headers, List<T> rows, RowWriter<T> writer)
            throws IOException {

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(SXSSF_ROW_WINDOW)) {
            Sheet sheet = workbook.createSheet(sheetName);
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            int rowIndex = 1;
            for (T item : rows) {
                writer.write(sheet.createRow(rowIndex++), item);
            }
            workbook.write(out);
        }
    }

    /** 빈 셀과 {@code "null"} 문자열을 구분한다 — 후자는 데이터로 오인된다. */
    static String nullSafe(String value) {
        return value != null ? value : "";
    }

    /** 숫자형 식별자·카운트를 문자열 셀로 쓴다(엑셀 자동 서식으로 값이 변형되지 않게). */
    static String nullSafe(Number value) {
        return value != null ? String.valueOf(value) : "";
    }
}
