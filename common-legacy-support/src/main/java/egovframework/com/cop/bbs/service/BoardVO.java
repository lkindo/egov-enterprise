package egovframework.com.cop.bbs.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ????? ? VO ?????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------      --------    ---------------------------
 *   2009.3.19  ????         ????
 *   2009.06.29  ????	2??????? (????? ????
 *
 *      </pre>
 **/
public class BoardVO extends Board {

    private static final long serialVersionUID = 1L;

    /** ??? **/
    private String searchBgnDe = "";

    /** ???**/
    private String searchCnd = "";

    /** ?????**/
    private String searchEndDe = "";

    /** ????**/
    private String searchWrd = "";

    /** ???(DESC,ASC) **/
    private long sortOrdr = 0L;

    /** ????? **/
    private String searchUseYn = "";

    /** ??? **/
    private int pageIndex = 1;

    /** ????**/
    private int pageUnit = 10;

    /** ??????**/
    private int pageSize = 10;

    /** ???? ???**/
    private int firstIndex = 1;

    /** ????? ???**/
    private int lastIndex = 1;

    /** ??????????**/
    private int recordCountPerPage = 10;

    /** ??????**/
    private int rowNo = 0;

    /** ????? **/
    private String frstRegisterNm = "";

    /** ????? **/
    private String lastUpdusrNm = "";

    /** ???? **/
    private String isExpired = "N";

    /** ? ? ?? **/
    private String parntsSortOrdr = "";

    /** ? ??? ? **/
    private String parntsReplyLc = "";

    /** ??????**/
    private String bbsTyCode = "";

    /** ???????**/
    private String bbsAttrbCode = "";

    /** ????**/
    private String bbsNm = "";

    /** ?????? **/
    private String fileAtchPosblAt = "";

    /** ???????**/
    private int posblAtchFileNumber = 0;

    /** ????? **/
    private String replyPosblAt = "";

    /** ????? ??? **/
    private boolean plusCount = false;

    /** ??? ??? **/
    private String anonymousAt = "";

    /** ?? ?? ???(?? ???????? ??? **/
    private String subPageIndex = "";

    /** ?? ????**/
    private String commentCo = "";

    /** ???? **/
    private String sjBoldAt;

    /** ?? ??? **/
    private String noticeAt;

    /** ??? ??? **/
    private String secretAt;

    /** ?? ??(Legacy ??) **/
    private Long commentNo;

    public Long getCommentNo() {
        return commentNo;
    }

    public void setCommentNo(Long commentNo) {
        this.commentNo = commentNo;
    }

    /**
     * searchBgnDe attribute?????.
     * 
     * @return the searchBgnDe
     **/
    public String getSearchBgnDe() {
        return searchBgnDe;
    }

    /**
     * searchBgnDe attribute ???????.
     * 
     * @param searchBgnDe
     *                    the searchBgnDe to set
     **/
    public void setSearchBgnDe(String searchBgnDe) {
        this.searchBgnDe = searchBgnDe;
    }

    /**
     * searchCnd attribute?????.
     * 
     * @return the searchCnd
     **/
    public String getSearchCnd() {
        return searchCnd;
    }

    /**
     * searchCnd attribute ???????.
     * 
     * @param searchCnd
     *                  the searchCnd to set
     **/
    public void setSearchCnd(String searchCnd) {
        this.searchCnd = searchCnd;
    }

    /**
     * searchEndDe attribute?????.
     * 
     * @return the searchEndDe
     **/
    public String getSearchEndDe() {
        return searchEndDe;
    }

    /**
     * searchEndDe attribute ???????.
     * 
     * @param searchEndDe
     *                    the searchEndDe to set
     **/
    public void setSearchEndDe(String searchEndDe) {
        this.searchEndDe = searchEndDe;
    }

    /**
     * searchWrd attribute?????.
     * 
     * @return the searchWrd
     **/
    public String getSearchWrd() {
        return searchWrd;
    }

    /**
     * searchWrd attribute ???????.
     * 
     * @param searchWrd
     *                  the searchWrd to set
     **/
    public void setSearchWrd(String searchWrd) {
        this.searchWrd = searchWrd;
    }

    /**
     * sortOrdr attribute?????.
     * 
     * @return the sortOrdr
     **/
    public long getSortOrdr() {
        return sortOrdr;
    }

    /**
     * sortOrdr attribute ???????.
     * 
     * @param sortOrdr
     *                 the sortOrdr to set
     **/
    public void setSortOrdr(long sortOrdr) {
        this.sortOrdr = sortOrdr;
    }

    /**
     * searchUseYn attribute?????.
     * 
     * @return the searchUseYn
     **/
    public String getSearchUseYn() {
        return searchUseYn;
    }

    /**
     * searchUseYn attribute ???????.
     * 
     * @param searchUseYn
     *                    the searchUseYn to set
     **/
    public void setSearchUseYn(String searchUseYn) {
        this.searchUseYn = searchUseYn;
    }

    /**
     * pageIndex attribute?????.
     * 
     * @return the pageIndex
     **/
    public int getPageIndex() {
        return pageIndex;
    }

    /**
     * pageIndex attribute ???????.
     * 
     * @param pageIndex
     *                  the pageIndex to set
     **/
    public void setPageIndex(int pageIndex) {
        this.pageIndex = pageIndex;
    }

    /**
     * pageUnit attribute?????.
     * 
     * @return the pageUnit
     **/
    public int getPageUnit() {
        return pageUnit;
    }

    /**
     * pageUnit attribute ???????.
     * 
     * @param pageUnit
     *                 the pageUnit to set
     **/
    public void setPageUnit(int pageUnit) {
        this.pageUnit = pageUnit;
    }

    /**
     * pageSize attribute?????.
     * 
     * @return the pageSize
     **/
    public int getPageSize() {
        return pageSize;
    }

    /**
     * pageSize attribute ???????.
     * 
     * @param pageSize
     *                 the pageSize to set
     **/
    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    /**
     * firstIndex attribute?????.
     * 
     * @return the firstIndex
     **/
    public int getFirstIndex() {
        return firstIndex;
    }

    /**
     * firstIndex attribute ???????.
     * 
     * @param firstIndex
     *                   the firstIndex to set
     **/
    public void setFirstIndex(int firstIndex) {
        this.firstIndex = firstIndex;
    }

    /**
     * lastIndex attribute?????.
     * 
     * @return the lastIndex
     **/
    public int getLastIndex() {
        return lastIndex;
    }

    /**
     * lastIndex attribute ???????.
     * 
     * @param lastIndex
     *                  the lastIndex to set
     **/
    public void setLastIndex(int lastIndex) {
        this.lastIndex = lastIndex;
    }

    /**
     * recordCountPerPage attribute?????.
     * 
     * @return the recordCountPerPage
     **/
    public int getRecordCountPerPage() {
        return recordCountPerPage;
    }

    /**
     * recordCountPerPage attribute ???????.
     * 
     * @param recordCountPerPage
     *                           the recordCountPerPage to set
     **/
    public void setRecordCountPerPage(int recordCountPerPage) {
        this.recordCountPerPage = recordCountPerPage;
    }

    /**
     * rowNo attribute?????.
     * 
     * @return the rowNo
     **/
    public int getRowNo() {
        return rowNo;
    }

    /**
     * rowNo attribute ???????.
     * 
     * @param rowNo
     *              the rowNo to set
     **/
    public void setRowNo(int rowNo) {
        this.rowNo = rowNo;
    }

    /**
     * frstRegisterNm attribute?????.
     * 
     * @return the frstRegisterNm
     **/
    public String getFrstRegisterNm() {
        return frstRegisterNm;
    }

    /**
     * frstRegisterNm attribute ???????.
     * 
     * @param frstRegisterNm
     *                       the frstRegisterNm to set
     **/
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
    }

    /**
     * lastUpdusrNm attribute?????.
     * 
     * @return the lastUpdusrNm
     **/
    public String getLastUpdusrNm() {
        return lastUpdusrNm;
    }

    /**
     * lastUpdusrNm attribute ???????.
     * 
     * @param lastUpdusrNm
     *                     the lastUpdusrNm to set
     **/
    public void setLastUpdusrNm(String lastUpdusrNm) {
        this.lastUpdusrNm = lastUpdusrNm;
    }

    /**
     * isExpired attribute?????.
     * 
     * @return the isExpired
     **/
    public String getIsExpired() {
        return isExpired;
    }

    /**
     * isExpired attribute ???????.
     * 
     * @param isExpired
     *                  the isExpired to set
     **/
    public void setIsExpired(String isExpired) {
        this.isExpired = isExpired;
    }

    /**
     * parntsSortOrdr attribute?????.
     * 
     * @return the parntsSortOrdr
     **/
    public String getParntsSortOrdr() {
        return parntsSortOrdr;
    }

    /**
     * parntsSortOrdr attribute ???????.
     * 
     * @param parntsSortOrdr
     *                       the parntsSortOrdr to set
     **/
    public void setParntsSortOrdr(String parntsSortOrdr) {
        this.parntsSortOrdr = parntsSortOrdr;
    }

    /**
     * parntsReplyLc attribute?????.
     * 
     * @return the parntsReplyLc
     **/
    public String getParntsReplyLc() {
        return parntsReplyLc;
    }

    /**
     * parntsReplyLc attribute ???????.
     * 
     * @param parntsReplyLc
     *                      the parntsReplyLc to set
     **/
    public void setParntsReplyLc(String parntsReplyLc) {
        this.parntsReplyLc = parntsReplyLc;
    }

    /**
     * bbsTyCode attribute?????.
     * 
     * @return the bbsTyCode
     **/
    public String getBbsTyCode() {
        return bbsTyCode;
    }

    /**
     * bbsTyCode attribute ???????.
     * 
     * @param bbsTyCode
     *                  the bbsTyCode to set
     **/
    public void setBbsTyCode(String bbsTyCode) {
        this.bbsTyCode = bbsTyCode;
    }

    /**
     * bbsAttrbCode attribute?????.
     * 
     * @return the bbsAttrbCode
     **/
    public String getBbsAttrbCode() {
        return bbsAttrbCode;
    }

    /**
     * bbsAttrbCode attribute ???????.
     * 
     * @param bbsAttrbCode
     *                     the bbsAttrbCode to set
     **/
    public void setBbsAttrbCode(String bbsAttrbCode) {
        this.bbsAttrbCode = bbsAttrbCode;
    }

    /**
     * bbsNm attribute?????.
     * 
     * @return the bbsNm
     **/
    public String getBbsNm() {
        return bbsNm;
    }

    /**
     * bbsNm attribute ???????.
     * 
     * @param bbsNm
     *              the bbsNm to set
     **/
    public void setBbsNm(String bbsNm) {
        this.bbsNm = bbsNm;
    }

    /**
     * fileAtchPosblAt attribute?????.
     * 
     * @return the fileAtchPosblAt
     **/
    public String getFileAtchPosblAt() {
        return fileAtchPosblAt;
    }

    /**
     * fileAtchPosblAt attribute ???????.
     * 
     * @param fileAtchPosblAt
     *                        the fileAtchPosblAt to set
     **/
    public void setFileAtchPosblAt(String fileAtchPosblAt) {
        this.fileAtchPosblAt = fileAtchPosblAt;
    }

    /**
     * posblAtchFileNumber attribute?????.
     * 
     * @return the posblAtchFileNumber
     **/
    public int getPosblAtchFileNumber() {
        return posblAtchFileNumber;
    }

    /**
     * posblAtchFileNumber attribute ???????.
     * 
     * @param posblAtchFileNumber
     *                            the posblAtchFileNumber to set
     **/
    public void setPosblAtchFileNumber(int posblAtchFileNumber) {
        this.posblAtchFileNumber = posblAtchFileNumber;
    }

    /**
     * replyPosblAt attribute?????.
     * 
     * @return the replyPosblAt
     **/
    public String getReplyPosblAt() {
        return replyPosblAt;
    }

    /**
     * replyPosblAt attribute ???????.
     * 
     * @param replyPosblAt
     *                     the replyPosblAt to set
     **/
    public void setReplyPosblAt(String replyPosblAt) {
        this.replyPosblAt = replyPosblAt;
    }

    /**
     * plusCount attribute?????.
     * 
     * @return the plusCount
     **/
    public boolean isPlusCount() {
        return plusCount;
    }

    /**
     * plusCount attribute ???????.
     * 
     * @param plusCount the plusCount to set
     **/
    public void setPlusCount(boolean plusCount) {
        this.plusCount = plusCount;
    }

    /**
     * subPageIndex attribute?????.
     * 
     * @return the subPageIndex
     **/
    public String getSubPageIndex() {
        return subPageIndex;
    }

    /**
     * subPageIndex attribute ???????.
     * 
     * @param subPageIndex the subPageIndex to set
     **/
    public void setSubPageIndex(String subPageIndex) {
        this.subPageIndex = subPageIndex;
    }

    /**
     * anonymousAt attribute?????.
     * 
     * @return the anonymousAt
     **/
    public String getAnonymousAt() {
        return anonymousAt;
    }

    /**
     * anonymousAt attribute ???????.
     * 
     * @param anonymousAt the anonymousAt to set
     **/
    public void setAnonymousAt(String anonymousAt) {
        this.anonymousAt = anonymousAt;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }

    /**
     * commentCo attribute?????.
     * 
     * @return the commentCo
     **/
    public String getCommentCo() {
        return commentCo;
    }

    /**
     * commentCo attribute ???????.
     * 
     * @param commentCo the commentCo to set
     **/

    public void setCommentCo(String commentCo) {
        this.commentCo = commentCo;
    }

    public String getSjBoldAt() {
        return sjBoldAt;
    }

    public void setSjBoldAt(String sjBoldAt) {
        this.sjBoldAt = sjBoldAt;
    }

    public String getNoticeAt() {
        return noticeAt;
    }

    public void setNoticeAt(String noticeAt) {
        this.noticeAt = noticeAt;
    }

    public String getSecretAt() {
        return secretAt;
    }

    public void setSecretAt(String secretAt) {
        this.secretAt = secretAt;
    }

}
