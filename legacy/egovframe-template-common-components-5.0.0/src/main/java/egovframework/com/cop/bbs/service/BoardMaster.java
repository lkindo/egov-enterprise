package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *  寃뚯떆???띿꽦?뺣낫瑜??닿린?꾪븳 ?뷀떚???대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.12  ?댁궪??         理쒖큹 ?앹꽦
 *   2009.06.26  ?쒖꽦怨?	2?④퀎 湲곕뒫 異붽? (?볤?愿由? 留뚯”?꾩“??
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class BoardMaster implements Serializable {
    
    /** 寃뚯떆???꾩씠??*/
    private String bbsId = "";
    
    /** 寃뚯떆???뚭컻 */
    private String bbsIntrcn = "";
    
    /** 寃뚯떆??紐?*/
    private String bbsNm = "";
    
    /** 寃뚯떆???좏삎肄붾뱶 */
    private String bbsTyCode = "";
    
    /** ?뚯씪泥⑤?媛?μ뿬遺 */
    private String fileAtchPosblAt = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    public String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";
    
    /** 泥⑤?媛?ν뙆?쇱닽??*/
    private int atchPosblFileNumber = 0;
    
    /** 泥⑤?媛?ν뙆?쇱궗?댁쫰 */
    private String atchPosblFileSize = "";
    
    /** ?듭옣媛?μ뿬遺 */
    private String replyPosblAt = "";
    
    /** ?쒗뵆由??꾩씠??*/
    private String tmplatId = "";
    
    /** ?ъ슜?щ? */
    private String useAt = "";
    
    /** ?ъ슜?뚮옒洹?*/
    private String bbsUseFlag = "";
    
    /** ????꾩씠??*/
    private String trgetId = "";
    
    /** ?깅줉援щ텇肄붾뱶 */
    private String registSeCode = "";
    
    /** ?좎씪 ?꾩씠??*/
    private String uniqId = "";
    
    /** ?쒗뵆由?紐?*/
    private String tmplatNm = "";
    
    /** 而ㅻ??덊떚 ID */
    private String cmmntyId;
    
    /** 釉붾줈洹?ID */
    private String blogId;
    
    /** 釉붾줈洹??ъ슜 ?좊Т */
    private String blogAt;
    
    //---------------------------------
    // 2009.06.26 : 2?④퀎 湲곕뒫 異붽?
    //---------------------------------
    /** 異붽? option (?볤?-comment, 留뚯”?꾩“??stsfdg) */
    private String option = "";
    
    /** ?볤? ?щ? */
    private String commentAt = "";
    
    /** 留뚯”?꾩“??*/
    private String stsfdgAt = "";
    ////-------------------------------

    /**
     * bbsId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the bbsId
     */
    public String getBbsId() {
	return bbsId;
    }

    /**
     * bbsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param bbsId
     *            the bbsId to set
     */
    public void setBbsId(String bbsId) {
	this.bbsId = bbsId;
    }

    /**
     * bbsIntrcn attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the bbsIntrcn
     */
    public String getBbsIntrcn() {
	return bbsIntrcn;
    }

    /**
     * bbsIntrcn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param bbsIntrcn
     *            the bbsIntrcn to set
     */
    public void setBbsIntrcn(String bbsIntrcn) {
	this.bbsIntrcn = bbsIntrcn;
    }

    /**
     * bbsNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the bbsNm
     */
    public String getBbsNm() {
	return bbsNm;
    }

    /**
     * bbsNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param bbsNm
     *            the bbsNm to set
     */
    public void setBbsNm(String bbsNm) {
	this.bbsNm = bbsNm;
    }

    /**
     * bbsTyCode attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the bbsTyCode
     */
    public String getBbsTyCode() {
	return bbsTyCode;
    }

    /**
     * bbsTyCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param bbsTyCode
     *            the bbsTyCode to set
     */
    public void setBbsTyCode(String bbsTyCode) {
	this.bbsTyCode = bbsTyCode;
    }

    /**
     * fileAtchPosblAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the fileAtchPosblAt
     */
    public String getFileAtchPosblAt() {
	return fileAtchPosblAt;
    }

    /**
     * fileAtchPosblAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param fileAtchPosblAt
     *            the fileAtchPosblAt to set
     */
    public void setFileAtchPosblAt(String fileAtchPosblAt) {
	this.fileAtchPosblAt = fileAtchPosblAt;
    }

    /**
     * frstRegisterId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
	return frstRegisterId;
    }

    /**
     * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param frstRegisterId
     *            the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
	this.frstRegisterId = frstRegisterId;
    }

    /**
     * frstRegisterPnttm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
	return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param frstRegisterPnttm
     *            the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
	this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * lastUpdusrId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
	return lastUpdusrId;
    }

    /**
     * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param lastUpdusrId
     *            the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
	this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * lastUpdusrPnttm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
	return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param lastUpdusrPnttm
     *            the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
	this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * atchPosblFileNumber attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the atchPosblFileNumber
     */
    public int getAtchPosblFileNumber() {
	return atchPosblFileNumber;
    }

    /**
     * atchPosblFileNumber attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param atchPosblFileNumber
     *            the atchPosblFileNumber to set
     */
    public void setAtchPosblFileNumber(int atchPosblFileNumber) {
	this.atchPosblFileNumber = atchPosblFileNumber;
    }

    /**
     * atchPosblFileSize attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the atchPosblFileSize
     */
    public String getAtchPosblFileSize() {
	return atchPosblFileSize;
    }

    /**
     * atchPosblFileSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param atchPosblFileSize
     *            the atchPosblFileSize to set
     */
    public void setAtchPosblFileSize(String atchPosblFileSize) {
	this.atchPosblFileSize = atchPosblFileSize;
    }

    /**
     * replyPosblAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the replyPosblAt
     */
    public String getReplyPosblAt() {
	return replyPosblAt;
    }

    /**
     * replyPosblAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param replyPosblAt
     *            the replyPosblAt to set
     */
    public void setReplyPosblAt(String replyPosblAt) {
	this.replyPosblAt = replyPosblAt;
    }

    /**
     * tmplatId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the tmplatId
     */
    public String getTmplatId() {
	return tmplatId;
    }

    /**
     * tmplatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param tmplatId
     *            the tmplatId to set
     */
    public void setTmplatId(String tmplatId) {
	this.tmplatId = tmplatId;
    }

    /**
     * useAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the useAt
     */
    public String getUseAt() {
	return useAt;
    }

    /**
     * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param useAt
     *            the useAt to set
     */
    public void setUseAt(String useAt) {
	this.useAt = useAt;
    }

    /**
     * bbsUseFlag attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the bbsUseFlag
     */
    public String getBbsUseFlag() {
	return bbsUseFlag;
    }

    /**
     * bbsUseFlag attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param bbsUseFlag
     *            the bbsUseFlag to set
     */
    public void setBbsUseFlag(String bbsUseFlag) {
	this.bbsUseFlag = bbsUseFlag;
    }

    /**
     * trgetId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the trgetId
     */
    public String getTrgetId() {
	return trgetId;
    }

    /**
     * trgetId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param trgetId
     *            the trgetId to set
     */
    public void setTrgetId(String trgetId) {
	this.trgetId = trgetId;
    }

    /**
     * registSeCode attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the registSeCode
     */
    public String getRegistSeCode() {
	return registSeCode;
    }

    /**
     * registSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param registSeCode
     *            the registSeCode to set
     */
    public void setRegistSeCode(String registSeCode) {
	this.registSeCode = registSeCode;
    }

    /**
     * uniqId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the uniqId
     */
    public String getUniqId() {
	return uniqId;
    }

    /**
     * uniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param uniqId
     *            the uniqId to set
     */
    public void setUniqId(String uniqId) {
	this.uniqId = uniqId;
    }

    /**
     * tmplatNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the tmplatNm
     */
    public String getTmplatNm() {
	return tmplatNm;
    }

    /**
     * tmplatNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param tmplatNm
     *            the tmplatNm to set
     */
    public void setTmplatNm(String tmplatNm) {
	this.tmplatNm = tmplatNm;
    }

    /**
     * option attribute瑜?由ы꽩?쒕떎.
     * @return the option
     */
    public String getOption() {
        return option;
    }

    /**
     * option attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param option the option to set
     */
    public void setOption(String option) {
        this.option = option;
    }

    /**
     * commentAt attribute瑜?由ы꽩?쒕떎.
     * @return the commentAt
     */
    public String getCommentAt() {
        return commentAt;
    }

    /**
     * commentAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param commentAt the commentAt to set
     */
    public void setCommentAt(String commentAt) {
        this.commentAt = commentAt;
    }

    /**
     * stsfdgAt attribute瑜?由ы꽩?쒕떎.
     * @return the stsfdgAt
     */
    public String getStsfdgAt() {
        return stsfdgAt;
    }

    /**
     * stsfdg attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param stsfdgAt the stsfdgAt to set
     */
    public void setStsfdgAt(String stsfdgAt) {
        this.stsfdgAt = stsfdgAt;
    }
    
    /**
     * cmmntyId attribute瑜?由ы꽩?쒕떎.
     * @return the cmmntyId
     */
    public String getCmmntyId() {
    	return cmmntyId;
    }
    
    /**
     * cmmntyId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param cmmntyId the cmmntyId to set
     */
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
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
