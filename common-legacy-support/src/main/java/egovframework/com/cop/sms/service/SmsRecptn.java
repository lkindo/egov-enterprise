package egovframework.com.cop.sms.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?? ???????????
 * 
 * @author ?????? ????
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.18  ????         ????
 *
 *      </pre>
 **/
public class SmsRecptn implements Serializable {

    private static final long serialVersionUID = 1L;
    /** ?? ID **/
    private String smsId = "";

    /** ?? ???**/
    private String recptnTelno = "";

    /** ? **/
    private String resultCode = "";

    /** ? **/
    private String resultMssage = "";

    /**
     * ??ID smsId attribute?????.
     * 
     * @return the smsId
     **/
    public String getSmsId() {
        return smsId;
    }

    /**
     * ??ID smsId attribute ???????.
     * 
     * @param smsId the smsId to set
     **/
    public void setSmsId(String smsId) {
        this.smsId = smsId;
    }

    /**
     * ?????recptnTelno attribute?????.
     * 
     * @return the recptnTelno
     **/
    public String getRecptnTelno() {
        return recptnTelno;
    }

    /**
     * ?????recptnTelno attribute ???????.
     * 
     * @param recptnTelno the recptnTelno to set
     **/
    public void setRecptnTelno(String recptnTelno) {
        this.recptnTelno = recptnTelno;
    }

    /**
     * ? resultCode attribute?????.
     * 
     * @return the resultCode
     **/
    public String getResultCode() {
        return resultCode;
    }

    /**
     * ? resultCode attribute ???????.
     * 
     * @param resultCode the resultCode to set
     **/
    public void setResultCode(String resultCode) {
        this.resultCode = resultCode;
    }

    /**
     * ? resultMssage attribute?????.
     * 
     * @return the resultMssage
     **/
    public String getResultMssage() {
        return resultMssage;
    }

    /**
     * ? resultMssage attribute ???????.
     * 
     * @param resultMssage the resultMssage to set
     **/
    public void setResultMssage(String resultMssage) {
        this.resultMssage = resultMssage;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
