package com.company.project.api.controller.batch;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BatchSchdul {
    private String batchSchdulId;
    private String batchOpertId;
    private String batchOpertNm;
    private String batchProgrm;
    private String paramtr;
    private String executCycle;
    private String executSchdulDe;
    private String executSchdulHour;
    private String executSchdulMnt;
    private String executSchdulSecnd;
    private String sttus;
    private String sttusNm;
    private String frstRegisterId;
    private String frstRegisterPnttm;
    private String lastUpdusrId;
    private String lastUpdtPnttm;

    private String executCycleNm;
    private String executSchdul;
    private String[] executSchdulDfkSes;

    // Search and Pagination fields
    private int pageIndex = 1;
    private int pageUnit = 10;
    private int pageSize = 10;
    private int firstIndex = 0;
    private int lastIndex = 0;
    private int recordCountPerPage = 10;
    private String searchCondition = "";
    private String searchKeyword = "";
}
