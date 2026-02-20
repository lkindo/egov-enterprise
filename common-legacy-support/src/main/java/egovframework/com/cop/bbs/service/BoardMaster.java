package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ??????????? ?????????
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
 *  -------    --------    ---------------------------
 *   2009.03.12  ????         ????
 *   2009.06.26  ????	2??????? (????? ????
 *
 *      </pre>
 **/
public class BoardMaster implements Serializable {

    private static final long serialVersionUID = 1L;

    /** ??????**/
    private String bbsId = "";

    /** ?????? **/
    private String bbsIntrcn = "";

    /** ????**/
    private String bbsNm = "";

    /** ??????**/
    private String bbsTyCode = "";

    /** ?????? **/
    private String fileAtchPosblAt = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    public String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ???????**/
    private int atchPosblFileNumber = 0;

    /** ??????? **/
    private String atchPosblFileSize = "";

    /** ????? **/
    private String replyPosblAt = "";

    /** ???????**/
    private String tmplatId = "";

    /** ?????? **/
    private String useAt = "";

    /** ???????**/
    private String bbsUseFlag = "";

    /** ???????**/
    private String trgetId = "";

    /** ????**/
    private String registSeCode = "";

    /** ? ???**/
    private String uniqId = "";

    /** ?????**/
    private String tmplatNm = "";

    /** ???? ID **/
    private String cmmntyId;

    /** ??ID **/
    private String blogId;

    /** ????????**/
    private String blogAt;

    // ---------------------------------
    // 2009.06.26 : 2???????
    // ---------------------------------
    /** ?? option (??-comment, ????stsfdg) **/
    private String option = "";

    /** ?? ??? **/
    private String commentAt = "";

    /** ????**/
    private String stsfdgAt = "";
    //// -------------------------------

    /**
     * bbsId attribute?????.
     * 
     * @return the bbsId
     **/
    public String getBbsId() {
        return bbsId;
    }

    /**
     * bbsId attribute ???????.
     * 
     * @param bbsId
     *              the bbsId to set
     **/
    public void setBbsId(String bbsId) {
        this.bbsId = bbsId;
    }

    /**
     * bbsIntrcn attribute?????.
     * 
     * @return the bbsIntrcn
     **/
    public String getBbsIntrcn() {
        return bbsIntrcn;
    }

    /**
     * bbsIntrcn attribute ???????.
     * 
     * @param bbsIntrcn
     *                  the bbsIntrcn to set
     **/
    public void setBbsIntrcn(String bbsIntrcn) {
        this.bbsIntrcn = bbsIntrcn;
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
     * frstRegisterId attribute?????.
     * 
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId attribute ???????.
     * 
     * @param frstRegisterId
     *                       the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * frstRegisterPnttm attribute?????.
     * 
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute ???????.
     * 
     * @param frstRegisterPnttm
     *                          the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * lastUpdusrId attribute?????.
     * 
     * @return the lastUpdusrId
     **/
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId attribute ???????.
     * 
     * @param lastUpdusrId
     *                     the lastUpdusrId to set
     **/
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * lastUpdusrPnttm attribute?????.
     * 
     * @return the lastUpdusrPnttm
     **/
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm attribute ???????.
     * 
     * @param lastUpdusrPnttm
     *                        the lastUpdusrPnttm to set
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * atchPosblFileNumber attribute?????.
     * 
     * @return the atchPosblFileNumber
     **/
    public int getAtchPosblFileNumber() {
        return atchPosblFileNumber;
    }

    /**
     * atchPosblFileNumber attribute ???????.
     * 
     * @param atchPosblFileNumber
     *                            the atchPosblFileNumber to set
     **/
    public void setAtchPosblFileNumber(int atchPosblFileNumber) {
        this.atchPosblFileNumber = atchPosblFileNumber;
    }

    /**
     * atchPosblFileSize attribute?????.
     * 
     * @return the atchPosblFileSize
     **/
    public String getAtchPosblFileSize() {
        return atchPosblFileSize;
    }

    /**
     * atchPosblFileSize attribute ???????.
     * 
     * @param atchPosblFileSize
     *                          the atchPosblFileSize to set
     **/
    public void setAtchPosblFileSize(String atchPosblFileSize) {
        this.atchPosblFileSize = atchPosblFileSize;
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
     * tmplatId attribute?????.
     * 
     * @return the tmplatId
     **/
    public String getTmplatId() {
        return tmplatId;
    }

    /**
     * tmplatId attribute ???????.
     * 
     * @param tmplatId
     *                 the tmplatId to set
     **/
    public void setTmplatId(String tmplatId) {
        this.tmplatId = tmplatId;
    }

    /**
     * useAt attribute?????.
     * 
     * @return the useAt
     **/
    public String getUseAt() {
        return useAt;
    }

    /**
     * useAt attribute ???????.
     * 
     * @param useAt
     *              the useAt to set
     **/
    public void setUseAt(String useAt) {
        this.useAt = useAt;
    }

    /**
     * bbsUseFlag attribute?????.
     * 
     * @return the bbsUseFlag
     **/
    public String getBbsUseFlag() {
        return bbsUseFlag;
    }

    /**
     * bbsUseFlag attribute ???????.
     * 
     * @param bbsUseFlag
     *                   the bbsUseFlag to set
     **/
    public void setBbsUseFlag(String bbsUseFlag) {
        this.bbsUseFlag = bbsUseFlag;
    }

    /**
     * trgetId attribute?????.
     * 
     * @return the trgetId
     **/
    public String getTrgetId() {
        return trgetId;
    }

    /**
     * trgetId attribute ???????.
     * 
     * @param trgetId
     *                the trgetId to set
     **/
    public void setTrgetId(String trgetId) {
        this.trgetId = trgetId;
    }

    /**
     * registSeCode attribute?????.
     * 
     * @return the registSeCode
     **/
    public String getRegistSeCode() {
        return registSeCode;
    }

    /**
     * registSeCode attribute ???????.
     * 
     * @param registSeCode
     *                     the registSeCode to set
     **/
    public void setRegistSeCode(String registSeCode) {
        this.registSeCode = registSeCode;
    }

    /**
     * uniqId attribute?????.
     * 
     * @return the uniqId
     **/
    public String getUniqId() {
        return uniqId;
    }

    /**
     * uniqId attribute ???????.
     * 
     * @param uniqId
     *               the uniqId to set
     **/
    public void setUniqId(String uniqId) {
        this.uniqId = uniqId;
    }

    /**
     * tmplatNm attribute?????.
     * 
     * @return the tmplatNm
     **/
    public String getTmplatNm() {
        return tmplatNm;
    }

    /**
     * tmplatNm attribute ???????.
     * 
     * @param tmplatNm
     *                 the tmplatNm to set
     **/
    public void setTmplatNm(String tmplatNm) {
        this.tmplatNm = tmplatNm;
    }

    /**
     * option attribute?????.
     * 
     * @return the option
     **/
    public String getOption() {
        return option;
    }

    /**
     * option attribute ???????.
     * 
     * @param option the option to set
     **/
    public void setOption(String option) {
        this.option = option;
    }

    /**
     * commentAt attribute?????.
     * 
     * @return the commentAt
     **/
    public String getCommentAt() {
        return commentAt;
    }

    /**
     * commentAt attribute ???????.
     * 
     * @param commentAt the commentAt to set
     **/
    public void setCommentAt(String commentAt) {
        this.commentAt = commentAt;
    }

    /**
     * stsfdgAt attribute?????.
     * 
     * @return the stsfdgAt
     **/
    public String getStsfdgAt() {
        return stsfdgAt;
    }

    /**
     * stsfdg attribute ???????.
     * 
     * @param stsfdgAt the stsfdgAt to set
     **/
    public void setStsfdgAt(String stsfdgAt) {
        this.stsfdgAt = stsfdgAt;
    }

    /**
     * cmmntyId attribute?????.
     * 
     * @return the cmmntyId
     **/
    public String getCmmntyId() {
        return cmmntyId;
    }

    /**
     * cmmntyId attribute ???????.
     * 
     * @param cmmntyId the cmmntyId to set
     **/
    public void setCmmntyId(String cmmntyId) {
        this.cmmntyId = cmmntyId;
    }

    public String getBlogId() {
        return blogId;
    }

    public void setBlogId(String blogId) {
        this.blogId = blogId;
    }

    public String getBlogAt() {
        return blogAt;
    }

    public void setBlogAt(String blogAt) {
        this.blogAt = blogAt;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
