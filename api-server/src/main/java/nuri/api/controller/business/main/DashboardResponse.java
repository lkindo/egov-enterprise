package nuri.api.controller.business.main;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardDto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 메인 대시보드의 고정 API 계약.
 *
 * <p>내부 {@code DashboardItemProvider} SPI는 확장 가능한 Map을 계속 사용하되, 브라우저가
 * 의존하는 핵심 필드는 이 DTO에서 타입과 필수 여부를 고정한다. 추가 provider 값은
 * {@link JsonAnyGetter}로 기존 wire 호환성을 유지한다.</p>
 */
@Schema(name = "DashboardResponse")
public final class DashboardResponse {

    private static final String TASK_LIST = "taskList";
    private static final String NOTICE_LIST = "notiList";
    private static final String PENDING_APPROVAL_COUNT = "pendingApprovalCount";

    private final List<BoardDto> taskList;
    private final List<BoardDto> notiList;
    private final long pendingApprovalCount;
    private final Map<String, Object> extensions;

    private DashboardResponse(
            List<BoardDto> taskList,
            List<BoardDto> notiList,
            long pendingApprovalCount,
            Map<String, Object> extensions) {
        this.taskList = taskList;
        this.notiList = notiList;
        this.pendingApprovalCount = pendingApprovalCount;
        this.extensions = extensions;
    }

    static DashboardResponse from(Map<String, Object> values) {
        Map<String, Object> extensions = new LinkedHashMap<>(values);
        List<BoardDto> taskList = boardItems(extensions.remove(TASK_LIST), TASK_LIST);
        List<BoardDto> notiList = boardItems(extensions.remove(NOTICE_LIST), NOTICE_LIST);
        long pendingApprovalCount = nonNegativeCount(
                extensions.remove(PENDING_APPROVAL_COUNT), PENDING_APPROVAL_COUNT);
        return new DashboardResponse(
                taskList,
                notiList,
                pendingApprovalCount,
                Map.copyOf(extensions));
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    public List<BoardDto> getTaskList() {
        return taskList;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    public List<BoardDto> getNotiList() {
        return notiList;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0")
    public long getPendingApprovalCount() {
        return pendingApprovalCount;
    }

    @JsonAnyGetter
    @Schema(hidden = true)
    public Map<String, Object> getExtensions() {
        return extensions;
    }

    private static List<BoardDto> boardItems(Object value, String field) {
        if (value == null) {
            return List.of();
        }
        if (!(value instanceof List<?> rawItems)) {
            throw new IllegalStateException("대시보드 " + field + " 계약이 올바르지 않습니다.");
        }
        List<BoardDto> items = new ArrayList<>(rawItems.size());
        for (Object rawItem : rawItems) {
            if (!(rawItem instanceof BoardDto item)) {
                throw new IllegalStateException("대시보드 " + field + " 계약이 올바르지 않습니다.");
            }
            items.add(item);
        }
        return List.copyOf(items);
    }

    private static long nonNegativeCount(Object value, String field) {
        if (value == null) {
            return 0L;
        }
        if (!(value instanceof Number number)) {
            throw new IllegalStateException("대시보드 " + field + " 계약이 올바르지 않습니다.");
        }
        long count = number.longValue();
        if (count < 0 || number.doubleValue() != count) {
            throw new IllegalStateException("대시보드 " + field + " 계약이 올바르지 않습니다.");
        }
        return count;
    }
}
