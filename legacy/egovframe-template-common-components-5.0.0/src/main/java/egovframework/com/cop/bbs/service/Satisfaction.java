package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 留뚯”?꾩“???쒕퉬???곗씠??泥섎━ 紐⑤뜽
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.29  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class Satisfaction implements Serializable {
    /** 留뚯”??踰덊샇 */
    private String stsfdgNo = "";
    
    /** 寃뚯떆??ID */
    private String bbsId = "";
    
    /** 寃뚯떆臾?踰덊샇 */
    private long nttId = 0L;
    
    /** ?묒꽦??ID */
    private String wrterId = "";
    
    /** ?묒꽦?먮챸 */
    private String wrterNm = "";
    
    /** ?⑥뒪?뚮뱶 */
    private String stsfdgPassword = "";
    
    /** 留뚯”???댁슜 */
    private String stsfdgCn = "";
    
    /** 留뚯”??*/
    private int stsfdg = 0;
    
    /** ?ъ슜 ?щ? */
    private String useAt = "";

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
    
    /** ?뺤씤 ?⑥뒪?뚮뱶 */
    private String confirmPassword = "";

    /**
     * stsfdgNo attribute瑜?由ы꽩?쒕떎.
     * @return the stsfdgNo
     */
    public String getStsfdgNo() {
        return stsfdgNo;
    }

    /**
     * stsfdgNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param stsfdgNo the stsfdgNo to set
     */
    public void setStsfdgNo(String stsfdgNo) {
        this.stsfdgNo = stsfdgNo;
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
     * wrterId attribute瑜?由ы꽩?쒕떎.
     * @return the wrterId
     */
    public String getWrterId() {
        return wrterId;
    }

    /**
     * wrterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param wrterId the wrterId to set
     */
    public void setWrterId(String wrterId) {
        this.wrterId = wrterId;
    }

    /**
     * wrterNm attribute瑜?由ы꽩?쒕떎.
     * @return the wrterNm
     */
    public String getWrterNm() {
        return wrterNm;
    }

    /**
     * wrterNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param wrterNm the wrterNm to set
     */
    public void setWrterNm(String wrterNm) {
        this.wrterNm = wrterNm;
    }

    /**
     * stsfdgPassword attribute瑜?由ы꽩?쒕떎.
     * @return the stsfdgPassword
     */
    public String getStsfdgPassword() {
        return stsfdgPassword;
    }

    /**
     * stsfdgPassword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param stsfdgPassword the stsfdgPassword to set
     */
    public void setStsfdgPassword(String stsfdgPassword) {
        this.stsfdgPassword = stsfdgPassword;
    }

    /**
     * stsfdgCn attribute瑜?由ы꽩?쒕떎.
     * @return the stsfdgCn
     */
    public String getStsfdgCn() {
        return stsfdgCn;
    }

    /**
     * stsfdgCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param stsfdgCn the stsfdgCn to set
     */
    public void setStsfdgCn(String stsfdgCn) {
        this.stsfdgCn = stsfdgCn;
    }

    /**
     * stsfdg attribute瑜?由ы꽩?쒕떎.
     * @return the stsfdg
     */
    public int getStsfdg() {
        return stsfdg;
    }

    /**
     * stsfdg attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param stsfdg the stsfdg to set
     */
    public void setStsfdg(int stsfdg) {
        this.stsfdg = stsfdg;
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
     * confirmPassword attribute瑜?由ы꽩?쒕떎.
     * @return the confirmPassword
     */
    public String getConfirmPassword() {
        return confirmPassword;
    }

    /**
     * confirmPassword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param confirmPassword the confirmPassword to set
     */
    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }
    
    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
