package com.company.project.core.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> resultList;
    private PaginationInfo paginationInfo;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationInfo {
        private int currentPageNo;
        private int recordCountPerPage;
        private int pageSize;
        private long totalRecordCount;
        private int totalPageCount;
    }

    public static <T> PageResponse<T> of(List<T> list, int currentPage, int size, long total) {
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) total / size);
        return PageResponse.<T>builder()
                .resultList(list)
                .paginationInfo(PaginationInfo.builder()
                        .currentPageNo(currentPage)
                        .recordCountPerPage(size)
                        .pageSize(10) // default
                        .totalRecordCount(total)
                        .totalPageCount(totalPages)
                        .build())
                .build();
    }

    public static <T> PageResponse<T> of(org.springframework.data.domain.Page<T> page) {
        return PageResponse.<T>builder()
                .resultList(page.getContent())
                .paginationInfo(PaginationInfo.builder()
                        .currentPageNo(page.getNumber() + 1)
                        .recordCountPerPage(page.getSize())
                        .pageSize(10) // default
                        .totalRecordCount(page.getTotalElements())
                        .totalPageCount(page.getTotalPages())
                        .build())
                .build();
    }
}
