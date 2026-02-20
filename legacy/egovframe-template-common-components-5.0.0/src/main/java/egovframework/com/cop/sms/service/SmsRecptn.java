package egovframework.com.cop.sms.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 臾몄옄硫붿떆吏 ?쒕퉬???곗씠??泥섎━ 紐⑤뜽
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.18  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class SmsRecptn implements Serializable {
    /** 臾몄옄硫붿떆吏 ID */
    private String smsId = "";
    
    /** ?섏떊 ?꾪솕踰덊샇 */
    private String recptnTelno = "";
    
    /** 寃곌낵肄붾뱶 */
    private String resultCode = "";
    
    /** 寃곌낵硫붿떆吏 */
    private String resultMssage = "";

    /**
     * 臾몄옄硫붿떆吏ID smsId attribute瑜?由ы꽩?쒕떎.
     * @return the smsId
     */
    public String getSmsId() {
        return smsId;
    }

    /**
     * 臾몄옄硫붿떆吏ID smsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param smsId the smsId to set
     */
    public void setSmsId(String smsId) {
        this.smsId = smsId;
    }

    /**
     * ?섏떊?꾪솕踰덊샇 recptnTelno attribute瑜?由ы꽩?쒕떎.
     * @return the recptnTelno
     */
    public String getRecptnTelno() {
        return recptnTelno;
    }

    /**
     * ?섏떊?꾪솕踰덊샇 recptnTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param recptnTelno the recptnTelno to set
     */
    public void setRecptnTelno(String recptnTelno) {
        this.recptnTelno = recptnTelno;
    }

    /**
     * 寃곌낵肄붾뱶 resultCode attribute瑜?由ы꽩?쒕떎.
     * @return the resultCode
     */
    public String getResultCode() {
        return resultCode;
    }

    /**
     * 寃곌낵肄붾뱶 resultCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param resultCode the resultCode to set
     */
    public void setResultCode(String resultCode) {
        this.resultCode = resultCode;
    }
    
    /**
     * 寃곌낵硫붿떆吏 resultMssage attribute瑜?由ы꽩?쒕떎.
     * @return the resultMssage
     */
    public String getResultMssage() {
        return resultMssage;
    }

    /**
     * 寃곌낵硫붿떆吏 resultMssage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param resultMssage the resultMssage to set
     */
    public void setResultMssage(String resultMssage) {
        this.resultMssage = resultMssage;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
