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
    private static final String TASK_LIST_TOTAL = "taskListTotal";
    private static final String NOTICE_LIST_TOTAL = "notiListTotal";

    private final List<BoardDto> taskList;
    private final List<BoardDto> notiList;
    private final Long taskListTotal;
    private final Long notiListTotal;
    private final Long pendingApprovalCount;
    private final Map<String, Object> extensions;

    private DashboardResponse(
            List<BoardDto> taskList,
            List<BoardDto> notiList,
            Long taskListTotal,
            Long notiListTotal,
            Long pendingApprovalCount,
            Map<String, Object> extensions) {
        this.taskList = taskList;
        this.notiList = notiList;
        this.taskListTotal = taskListTotal;
        this.notiListTotal = notiListTotal;
        this.pendingApprovalCount = pendingApprovalCount;
        this.extensions = extensions;
    }

    static DashboardResponse from(Map<String, Object> values) {
        Map<String, Object> extensions = new LinkedHashMap<>(values);
        List<BoardDto> taskList = boardItems(extensions.remove(TASK_LIST), TASK_LIST);
        List<BoardDto> notiList = boardItems(extensions.remove(NOTICE_LIST), NOTICE_LIST);
        Long taskListTotal = nonNegativeCount(extensions.remove(TASK_LIST_TOTAL), TASK_LIST_TOTAL);
        Long notiListTotal = nonNegativeCount(extensions.remove(NOTICE_LIST_TOTAL), NOTICE_LIST_TOTAL);
        Long pendingApprovalCount = nonNegativeCount(
                extensions.remove(PENDING_APPROVAL_COUNT), PENDING_APPROVAL_COUNT);
        return new DashboardResponse(
                taskList,
                notiList,
                taskListTotal,
                notiListTotal,
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

    /**
     * 업무게시판의 전체 글 수(목록은 최근 5건).
     *
     * <p>[2026-09-26 DIP V1] 조회에 실패했거나 게시판 공급자가 없으면 {@code null} 이다 — 0 은 "글이 없다" 는
     * 사실 주장이다. 목록이 비어 있고 이 값이 {@code null} 이면 화면은 "불러오지 못했습니다" 라고 말한다.</p>
     */
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", nullable = true, types = {"integer", "null"})
    public Long getTaskListTotal() {
        return taskListTotal;
    }

    /** 공지 게시판의 전체 글 수. 의미는 {@link #getTaskListTotal()} 와 같다. */
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", nullable = true, types = {"integer", "null"})
    public Long getNotiListTotal() {
        return notiListTotal;
    }

    /**
     * 결재 대기 건수.
     *
     * <p>[2026-09-15 DEC-OPS-100] 셀 수 없을 때(결재 공급자가 없거나 조회에 실패했을 때)는 0 이 아니라
     * {@code null} 이다. 0 으로 채우면 화면이 "결재 대기 0건" 이라는 사실 주장을 한다(unknownAsZero).
     * 키는 늘 응답에 실린다(필수·nullable).</p>
     */
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", nullable = true, types = {"integer", "null"})
    public Long getPendingApprovalCount() {
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

    private static Long nonNegativeCount(Object value, String field) {
        if (value == null) {
            return null;
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
