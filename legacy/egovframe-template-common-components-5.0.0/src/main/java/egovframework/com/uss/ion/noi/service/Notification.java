package egovframework.com.uss.ion.noi.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?뺣낫?뚮┝???쒕퉬???곗씠??泥섎━ 紐⑤뜽
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.6.8  	 ?쒖꽦怨?         理쒖큹 ?앹꽦
 *	 2011.10.07	 ?닿린??	蹂댁븞痍⑥빟???섏젙(private 諛곗뿴 泥섎━)
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class Notification implements Serializable {
    /** ?뚮┝ 踰덊샇 */
    private String ntfcNo = "";

    /** ?뚮┝ ?쒕ぉ */
    private String ntfcSj = "";

    /** ?뚮┝ ?댁슜 */
    private String ntfcCn = "";

    /** ?뚮┝ ?쒓컙 */
    private String ntfcDate = "";

    /** ?뚮┝ ?쒓컙 */
    private String ntfcTime = "";

    /** ?ъ쟾 ?뚮┝ 媛꾧꺽 */
    private String[] bhNtfcIntrvl = new String[0];

    /** ?ъ쟾 ?뚮┝ 媛꾧꺽 臾몄옄??*/
    private String bhNtfcIntrvlString = "";

    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";

    /** 理쒖큹 ?깅줉?먮챸 */
    private String frstRegisterNm = "";

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";

    /** 理쒖쥌?섏젙???꾩씠??*/
    public String lastUpdusrId = "";

    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";

    /** ?좎씪 ?꾩씠??*/
    private String uniqId = "";

    /** ?뚮┝ ?쒓컙 */
    private String ntfcHH = "";

    /** ?뚮┝ ?쒓컙 */
    private String ntfcMM = "";

    /**
     * ntfcNo attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcNo
     */
    public String getNtfcNo() {
        return ntfcNo;
    }

    /**
     * ntfcNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcNo the ntfcNo to set
     */
    public void setNtfcNo(String ntfcNo) {
        this.ntfcNo = ntfcNo;
    }

    /**
     * ntfcSj attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcSj
     */
    public String getNtfcSj() {
        return ntfcSj;
    }

    /**
     * ntfcSj attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcSj the ntfcSj to set
     */
    public void setNtfcSj(String ntfcSj) {
        this.ntfcSj = ntfcSj;
    }

    /**
     * ntfcCn attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcCn
     */
    public String getNtfcCn() {
        return ntfcCn;
    }

    /**
     * ntfcCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcCn the ntfcCn to set
     */
    public void setNtfcCn(String ntfcCn) {
        this.ntfcCn = ntfcCn;
    }

    /**
     * ntfcTime attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcTime
     */
    public String getNtfcTime() {
        return ntfcTime;
    }

    /**
     * ntfcTime attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcTime the ntfcTime to set
     */
    public void setNtfcTime(String ntfcTime) {
        this.ntfcTime = ntfcTime;
    }

    /**
     * bhNtfcIntrvl attribute瑜?由ы꽩?쒕떎.
     * @return the bhNtfcIntrvl
     */
//
                     String[] getBhNtfcIntrvl() {
//        return bhNtfcIntrvl;
//    
                    }
    // 2011.10.07
                     諛곗뿴??public ?⑥닔媛 諛섑솚?섏? ?딅룄濡???
    public String[] getBhNtfcIntrvl() {
    	// 硫붿냼?쒕?
                    ?쇰줈 ?섍굅?? 蹂듭젣蹂몄쓣 諛섑솚?섍굅??
    	// ?섏젙???쒖뼱?섎뒗 public硫붿냼?쒕? 蹂꾨룄濡?留뚮뱺??
    	String[] ret = null;
    	if(this.bhNtfcIntrvl != null) {
    		ret = new String[bhNtfcIntrvl.length];
    		for (int i=0; i<bhNtfcIntrvl.length; i++) {
    			ret[i] = this.bhNtfcIntrvl[i];
    		}
    	}
    	return ret;
    }

    /**
     * bhNtfcIntrvl attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param bhNtfcIntrvl the bhNtfcIntrvl to set
     */
//
                     void setBhNtfcIntrvl(String[] bhNtfcIntrvl) {
//        this.bhNtfcIntrvl = bhNtfcIntrvl;
//    
                    }
    // 2011.10.07
                     諛곗뿴-?좏삎 ?꾨뱶??怨듭슜 ?곗씠???좊떦?섏? ?딅룄濡???
	public void setBhNtfcIntrvl(String[] bhNtfcIntrvl) {
		this.bhNtfcIntrvl = new String[bhNtfcIntrvl.length];
		for (int i = 0; i < bhNtfcIntrvl.length; ++i) {
			this.bhNtfcIntrvl[i] = bhNtfcIntrvl[i];
		}
	}


    /**
     * frstRegisterId attribute瑜?由ы꽩?쒕떎.
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param frstRegisterId the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * frstRegisterPnttm attribute瑜?由ы꽩?쒕떎.
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * lastUpdusrId attribute瑜?由ы꽩?쒕떎.
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param lastUpdusrId the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * lastUpdusrPnttm attribute瑜?由ы꽩?쒕떎.
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * uniqId attribute瑜?由ы꽩?쒕떎.
     * @return the uniqId
     */
    public String getUniqId() {
        return uniqId;
    }

    /**
     * uniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param uniqId the uniqId to set
     */
    public void setUniqId(String uniqId) {
        this.uniqId = uniqId;
    }

    /**
     * ntfcDate attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcDate
     */
    public String getNtfcDate() {
        return ntfcDate;
    }

    /**
     * ntfcDate attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcDate the ntfcDate to set
     */
    public void setNtfcDate(String ntfcDate) {
        this.ntfcDate = ntfcDate;
    }

    /**
     * ntfcHH attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcHH
     */
    public String getNtfcHH() {
        return ntfcHH;
    }

    /**
     * ntfcHH attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcHH the ntfcHH to set
     */
    public void setNtfcHH(String ntfcHH) {
        this.ntfcHH = ntfcHH;
    }

    /**
     * ntfcMM attribute瑜?由ы꽩?쒕떎.
     * @return the ntfcMM
     */
    public String getNtfcMM() {
        return ntfcMM;
    }

    /**
     * ntfcMM attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param ntfcMM the ntfcMM to set
     */
    public void setNtfcMM(String ntfcMM) {
        this.ntfcMM = ntfcMM;
    }

    /**
     * bhNtfcIntrvlString attribute瑜?由ы꽩?쒕떎.
     * @return the bhNtfcIntrvlString
     */
    public String getBhNtfcIntrvlString() {
        return bhNtfcIntrvlString;
    }

    /**
     * bhNtfcIntrvlString attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param bhNtfcIntrvlString the bhNtfcIntrvlString to set
     */
    public void setBhNtfcIntrvlString(String bhNtfcIntrvlString) {
        this.bhNtfcIntrvlString = bhNtfcIntrvlString;
    }

    /**
     * frstRegisterNm attribute瑜?由ы꽩?쒕떎.
     * @return the frstRegisterNm
     */
    public String getFrstRegisterNm() {
        return frstRegisterNm;
    }

    /**
     * frstRegisterNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param frstRegisterNm the frstRegisterNm to set
     */
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
