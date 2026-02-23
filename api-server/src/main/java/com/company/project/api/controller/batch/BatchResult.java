package com.company.project.api.controller.batch;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BatchResult {
    private String batchResultId;
    private String batchSchdulId;
    private String batchOpertId;
    private String batchOpertNm;
    private String batchProgrm;
    private String paramtr;
    private String sttus;
    private String sttusNm;
    private String errorInfo;
    private String executBeginTime;
    private String executEndTime;
    private String frstRegisterId;
    private String frstRegisterPnttm;
    private String lastUpdusrId;
    private String lastUpdtPnttm;

    // Search and Pagination fields
    private int pageIndex = 1;
    private int pageUnit = 10;
    private int pageSize = 10;
    private int firstIndex = 0;
    private int lastIndex = 0;
    private int recordCountPerPage = 10;
    private String searchCondition = "";
    private String searchKeyword = "";
    private String searchKeywordFrom = "";
    private String searchKeywordTo = "";
}
