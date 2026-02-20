package egovframework.com.cop.scp.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?ㅽ겕???쒕퉬???곗씠??泥섎━ 紐⑤뜽
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.07.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.10  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class Scrap implements Serializable {
    /** ?ㅽ겕??ID */
    private String scrapId = "";
    
    /** 寃뚯떆??ID */
    private String bbsId = "";
    
    /** 寃뚯떆臾?踰덊샇 */
    private long nttId = 0L;
    
    /** ?ㅽ겕?⑸챸 */
    private String scrapNm = "";
    
    /** ?ъ슜 ?щ? */
    private String useAt = "";
    
    /** ?좎씪 ?꾩씠??*/
    private String uniqId = "";

    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹 ?깅줉?먮챸 */
    private String frstRegisterNm = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";

    /**
     * scrapId attribute瑜?由ы꽩?쒕떎.
     * @return the scrapId
     */
    public String getScrapId() {
        return scrapId;
    }

    /**
     * scrapId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param scrapId the scrapId to set
     */
    public void setScrapId(String scrapId) {
        this.scrapId = scrapId;
    }

    /**
     * bbsId attribute瑜?由ы꽩?쒕떎.
     * @return the bbsId
     */
    public String getBbsId() {
        return bbsId;
    }

    /**
     * bbsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param bbsId the bbsId to set
     */
    public void setBbsId(String bbsId) {
        this.bbsId = bbsId;
    }

    /**
     * nttId attribute瑜?由ы꽩?쒕떎.
     * @return the nttId
     */
    public long getNttId() {
        return nttId;
    }

    /**
     * nttId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param nttId the nttId to set
     */
    public void setNttId(long nttId) {
        this.nttId = nttId;
    }

    /**
     * scrapNm attribute瑜?由ы꽩?쒕떎.
     * @return the scrapNm
     */
    public String getScrapNm() {
        return scrapNm;
    }

    /**
     * scrapNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param scrapNm the scrapNm to set
     */
    public void setScrapNm(String scrapNm) {
        this.scrapNm = scrapNm;
    }

    /**
     * useAt attribute瑜?由ы꽩?쒕떎.
     * @return the useAt
     */
    public String getUseAt() {
        return useAt;
    }

    /**
     * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param useAt the useAt to set
     */
    public void setUseAt(String useAt) {
        this.useAt = useAt;
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
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
