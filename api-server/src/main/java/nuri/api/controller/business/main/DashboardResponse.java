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
 *
 * <p>[2026-10-20] 결재 대기 건수({@code pendingApprovalCount})를 걷었다. 요청마다 결재선을 셌지만 읽는 화면이 없었다 —
 * 업무 홈의 결재 대기 카드는 결재 기능이 자기 API(결재 대기 목록의 전체 건수)로 센다(DEC-OPS-281).</p>
 */
@Schema(name = "DashboardResponse")
public final class DashboardResponse {

    private static final String TASK_LIST = "taskList";
    private static final String NOTICE_LIST = "notiList";
    private static final String TASK_LIST_TOTAL = "taskListTotal";
    private static final String NOTICE_LIST_TOTAL = "notiListTotal";
    private static final String TASK_LIST_UNAVAILABLE = "taskListUnavailable";
    private static final String NOTICE_LIST_UNAVAILABLE = "notiListUnavailable";

    private final List<BoardDto> taskList;
    private final List<BoardDto> notiList;
    private final Long taskListTotal;
    private final Long notiListTotal;
    private final boolean taskListUnavailable;
    private final boolean notiListUnavailable;
    private final Map<String, Object> extensions;

    private DashboardResponse(
            List<BoardDto> taskList,
            List<BoardDto> notiList,
            Long taskListTotal,
            Long notiListTotal,
            boolean taskListUnavailable,
            boolean notiListUnavailable,
            Map<String, Object> extensions) {
        this.taskList = taskList;
        this.notiList = notiList;
        this.taskListTotal = taskListTotal;
        this.notiListTotal = notiListTotal;
        this.taskListUnavailable = taskListUnavailable;
        this.notiListUnavailable = notiListUnavailable;
        this.extensions = extensions;
    }

    static DashboardResponse from(Map<String, Object> values) {
        Map<String, Object> extensions = new LinkedHashMap<>(values);
        List<BoardDto> taskList = boardItems(extensions.remove(TASK_LIST), TASK_LIST);
        List<BoardDto> notiList = boardItems(extensions.remove(NOTICE_LIST), NOTICE_LIST);
        Long taskListTotal = nonNegativeCount(extensions.remove(TASK_LIST_TOTAL), TASK_LIST_TOTAL);
        Long notiListTotal = nonNegativeCount(extensions.remove(NOTICE_LIST_TOTAL), NOTICE_LIST_TOTAL);
        boolean taskListUnavailable = flag(extensions.remove(TASK_LIST_UNAVAILABLE), TASK_LIST_UNAVAILABLE);
        boolean notiListUnavailable = flag(extensions.remove(NOTICE_LIST_UNAVAILABLE), NOTICE_LIST_UNAVAILABLE);
        return new DashboardResponse(
                taskList,
                notiList,
                taskListTotal,
                notiListTotal,
                taskListUnavailable,
                notiListUnavailable,
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
     * 업무게시판으로 지정한 게시판을 지금 이용할 수 없는지(사용 안 함이거나 없음).
     *
     * <p>[2026-10-26 ADR-0043, SET-07] 운영 상태와 조회 실패를 가른다 — true 면 목록은 비고 전체 글 수는 {@code null} 이며, 화면은
     * '지금 이 게시판을 운영하지 않습니다'로 그린다. 조회 실패나 게시판 공급자가 없으면 false 다(그때 목록이 비고 전체 글 수가
     * {@code null} 이면 '불러오지 못했습니다').</p>
     */
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
            description = "업무게시판으로 지정한 게시판을 지금 이용할 수 없음(사용 안 함이거나 없음). 조회 실패는 false")
    public boolean isTaskListUnavailable() {
        return taskListUnavailable;
    }

    /** 공지 게시판으로 지정한 게시판을 지금 이용할 수 없는지. 의미는 {@link #isTaskListUnavailable()} 와 같다. */
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
            description = "공지 게시판으로 지정한 게시판을 지금 이용할 수 없음(사용 안 함이거나 없음). 조회 실패는 false")
    public boolean isNotiListUnavailable() {
        return notiListUnavailable;
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

    /** 공급자가 싣지 않았으면 false(이용할 수 없다고 말할 근거가 없다)다. */
    private static boolean flag(Object value, String field) {
        if (value == null) {
            return false;
        }
        if (!(value instanceof Boolean bool)) {
            throw new IllegalStateException("대시보드 " + field + " 계약이 올바르지 않습니다.");
        }
        return bool;
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
