package com.company.project.core.response;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class PageResponse<T> {
    private List<T> resultList;
    private PaginationInfo paginationInfo;

    @Getter
    @Builder
    public static class PaginationInfo {
        private int currentPageNo;
        private int recordCountPerPage;
        private int pageSize;
        private long totalRecordCount;
        private int totalPageCount;
    }

    public static <T> PageResponse<T> of(List<T> list, int currentPage, int size, long total) {
        int totalPages = (int) Math.ceil((double) total / size);
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
}