package nuri.foundation.core.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * 표준화된 페이징 응답 DTO
 *
 * <p>[ADR-0036] {@code page} 는 요청과 같은 1 기반 번호다. 다섯 필드는 늘 실리므로 스펙에서도 필수다 —
 * 필수가 아니면 생성 계약이 선택·nullable 이 되어 프런트가 실행 시점에 다시 검사해야 했다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "현재 페이지의 항목")
    private List<T> list;
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "전체 건수")
    private long total;
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "현재 페이지 번호(1부터, 요청의 page 와 같다)")
    private int page;
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "페이지당 건수")
    private int size;
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "전체 페이지 수")
    private int totalPage;

    /** 목록과 1 기반 번호를 직접 받는다. 호출자는 요청의 1 기반 {@code page} 를 그대로 넘긴다. */
    public static <T> PageResponse<T> of(List<T> list, int currentPage, int size, long total) {
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) total / size);
        return PageResponse.<T>builder()
                .list(list == null ? List.of() : list)
                .total(total)
                .page(currentPage)
                .size(size)
                .totalPage(totalPages)
                .build();
    }

    /** Spring Data 의 0 기반 {@link org.springframework.data.domain.Page} 를 외부 1 기반 번호로 바꾼다. */
    public static <T> PageResponse<T> of(org.springframework.data.domain.Page<T> page) {
        return PageResponse.<T>builder()
                .list(page.getContent())
                .total(page.getTotalElements())
                .page(page.getNumber() + 1)
                .size(page.getSize())
                .totalPage(page.getTotalPages())
                .build();
    }
}
