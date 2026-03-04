package egovframework.com.cmm;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name : ComDefaultVO.java
 * @Description : ComDefaultVO class
 * @Modification Information
 * @
 *   @ ??륁젟????륁젟????륁젟??곸뒠
 *   @ ------- -------- ---------------------------
 *   @ 2009.02.01 鈺곌퀣???筌ㅼ뮇????밴쉐
 *
 * @author ?⑤벏???뺥돩??揶쏆뮆而?? 鈺곌퀣???
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 */
public class ComDefaultVO implements Serializable {

    private static final long serialVersionUID = -6062858939907510631L;

    /** 野꺜??기쒎쳞?*/
    private String searchCondition = "";

    /** 野꺜??톏yword */
    private String searchKeyword = "";

    /** 野꺜??깃텢??밸연?봔 */
    private String searchUseYn = "";

    /** ?袁⑹삺??륁뵠筌왖 */
    private int pageIndex = 1;

    /** ??륁뵠筌왖揶???*/
    private int pageUnit = 10;

    /** ??륁뵠筌왖???좑쭩?*/
    private int pageSize = 10;

    /** firstIndex */
    private int firstIndex = 1;

    /** lastIndex */
    private int lastIndex = 1;

    /** recordCountPerPage */
    private int recordCountPerPage = 10;

    /** 野꺜??톏ywordFrom */
    private String searchKeywordFrom = "";

    /** 野꺜??톏ywordTo */
    private String searchKeywordTo = "";

    public int getFirstIndex() {
        return firstIndex;
    }

    public void setFirstIndex(int firstIndex) {
        this.firstIndex = firstIndex;
    }

    public int getLastIndex() {
        return lastIndex;
    }

    public void setLastIndex(int lastIndex) {
        this.lastIndex = lastIndex;
    }

    public int getRecordCountPerPage() {
        return recordCountPerPage;
    }

    public void setRecordCountPerPage(int recordCountPerPage) {
        this.recordCountPerPage = recordCountPerPage;
    }

    public String getSearchCondition() {
        return searchCondition;
    }

    public void setSearchCondition(String searchCondition) {
        this.searchCondition = searchCondition;
    }

    public String getSearchKeyword() {
        return searchKeyword;
    }

    public void setSearchKeyword(String searchKeyword) {
        this.searchKeyword = searchKeyword;
    }

    public String getSearchUseYn() {
        return searchUseYn;
    }

    public void setSearchUseYn(String searchUseYn) {
        this.searchUseYn = searchUseYn;
    }

    public int getPageIndex() {
        return pageIndex;
    }

    public void setPageIndex(int pageIndex) {
        this.pageIndex = pageIndex;
    }

    public int getPageUnit() {
        return pageUnit;
    }

    public void setPageUnit(int pageUnit) {
        this.pageUnit = pageUnit;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    @Override
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }

    /**
     * searchKeywordFrom attribute???귐뗪쉘??뺣뼄.
     *
     * @return String
     */
    public String getSearchKeywordFrom() {
        return searchKeywordFrom;
    }

    /**
     * searchKeywordFrom attribute 揶쏅?????쇱젟??뺣뼄.
     *
     * @param searchKeywordFrom String
     */
    public void setSearchKeywordFrom(String searchKeywordFrom) {
        this.searchKeywordFrom = searchKeywordFrom;
    }

    /**
     * searchKeywordTo attribute???귐뗪쉘??뺣뼄.
     *
     * @return String
     */
    public String getSearchKeywordTo() {
        return searchKeywordTo;
    }

    /**
     * searchKeywordTo attribute 揶쏅?????쇱젟??뺣뼄.
     *
     * @param searchKeywordTo String
     */
    public void setSearchKeywordTo(String searchKeywordTo) {
        this.searchKeywordTo = searchKeywordTo;
    }
}
