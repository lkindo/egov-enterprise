package egovframework.let.sym.cal.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 휴일 검색 VO
 */
public class RestdeVO extends ComDefaultVO {

    private static final long serialVersionUID = 1L;

    private String searchYear;
    private String searchMonth;

    public String getSearchYear() {
        return searchYear;
    }

    public void setSearchYear(String searchYear) {
        this.searchYear = searchYear;
    }

    public String getSearchMonth() {
        return searchMonth;
    }

    public void setSearchMonth(String searchMonth) {
        this.searchMonth = searchMonth;
    }
}
