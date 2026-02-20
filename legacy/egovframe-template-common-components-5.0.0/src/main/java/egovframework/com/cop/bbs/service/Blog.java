package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 釉붾줈洹멸쾶?쒗뙋 愿由щ? ?꾪븳 紐⑤뜽 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?묓씗??
 * @since 2017.09.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??           ?섏젙??          ?섏젙?댁슜
 *  -----------   --------   ---------------------------
 *   2017.09.12  ?묓씗??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class Blog implements Serializable {

    /** 釉붾줈洹??꾩씠??*/
    private String blogId = "";
    
    /** 寃뚯떆???꾩씠??*/
    private String bbsId = "";
    
    /** 釉붾줈洹??뚭컻 */
    private String blogIntrcn = "";
    
    /** 釉붾줈洹?紐?*/
    private String blogNm = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";
    
    /** ?깅줉援щ텇肄붾뱶 */
    private String registSeCode = "";
    
    /** ?쒗뵆由??꾩씠??*/
    private String tmplatId = "";
    
    /** ?쒗뵆由??꾩씠??*/
    private String useAt = "";

    /** ?ъ슜???꾩씠??*/
    private String emplyrId = "";

    /** ?ъ슜?먮챸 */
    private String userNm = "";

    /** ?쒗뵆由?紐?*/
    private String tmplatNm = "";
    
    /**  釉붾줈洹?寃뚯떆???щ? */
	private String blogAt = "";

    /**
     * blogId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the blogId
     */
    public String getBlogId() {
	return blogId;
    }

    /**
     * blogId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param blogId
     *            the blogId to set
     */
    public void setBlogId(String blogId) {
	this.blogId = blogId;
    }

    public String getBbsId() {
		return bbsId;
	}

	public void setBbsId(String bbsId) {
		this.bbsId = bbsId;
	}

	/**
     * blogIntrcn attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the blogIntrcn
     */
    public String getBlogIntrcn() {
	return blogIntrcn;
    }

    /**
     * blogIntrcn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param blogIntrcn
     *            the blogIntrcn to set
     */
    public void setBlogIntrcn(String blogIntrcn) {
	this.blogIntrcn = blogIntrcn;
    }

    /**
     * blogNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the blogNm
     */
    public String getBlogNm() {
	return blogNm;
    }

    /**
     * blogNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param blogNm
     *            the blogNm to set
     */
    public void setBlogNm(String blogNm) {
	this.blogNm = blogNm;
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
     * emplyrId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the emplyrId
     */
    public String getEmplyrId() {
	return emplyrId;
    }

    /**
     * emplyrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param emplyrId
     *            the emplyrId to set
     */
    public void setEmplyrId(String emplyrId) {
	this.emplyrId = emplyrId;
    }

    /**
     * userNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the userNm
     */
    public String getUserNm() {
	return userNm;
    }

    /**
     * userNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param userNm
     *            the userNm to set
     */
    public void setUserNm(String userNm) {
	this.userNm = userNm;
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
