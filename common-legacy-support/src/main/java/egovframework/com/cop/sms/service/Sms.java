package egovframework.com.cop.sms.service;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;

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
 *	 2011.10.07	 ????	?????(private ???
 *
 *      </pre>
 **/
public class Sms implements Serializable {

    private static final long serialVersionUID = 1L;
    /** ?? ID **/
    private String smsId = "";

    /** ? ???**/
    private String trnsmitTelno = "";

    /** ? ?? **/
    private String trnsmitCn = "";

    /** ?? ?????**/
    private int recptnCnt = 0;

    /** ? ???**/
    private String uniqId = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ????? **/
    private String frstRegisterNm = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ?? ? List **/
    private List<SmsRecptn> recptn = null;

    /** ?? ????**/
    private String[] recptnTelno = null;

    /**
     * smsId attribute?????.
     * 
     * @return the smsId
     **/
    public String getSmsId() {
        return smsId;
    }

    /**
     * smsId attribute ???????.
     * 
     * @param smsId the smsId to set
     **/
    public void setSmsId(String smsId) {
        this.smsId = smsId;
    }

    /**
     * trnsmitTelno attribute?????.
     * 
     * @return the trnsmitTelno
     **/
    public String getTrnsmitTelno() {
        return trnsmitTelno;
    }

    /**
     * trnsmitTelno attribute ???????.
     * 
     * @param trnsmitTelno the trnsmitTelno to set
     **/
    public void setTrnsmitTelno(String trnsmitTelno) {
        this.trnsmitTelno = trnsmitTelno;
    }

    /**
     * trnsmitCn attribute?????.
     * 
     * @return the trnsmitCn
     **/
    public String getTrnsmitCn() {
        return trnsmitCn;
    }

    /**
     * trnsmitCn attribute ???????.
     * 
     * @param trnsmitCn the trnsmitCn to set
     **/
    public void setTrnsmitCn(String trnsmitCn) {
        this.trnsmitCn = trnsmitCn;
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
     * @param frstRegisterId the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
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
     * @param frstRegisterNm the frstRegisterNm to set
     **/
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
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
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * recptn attribute?????.
     * 
     * @return the recptn
     **/
    public List<SmsRecptn> getRecptn() {
        return recptn;
    }

    /**
     * recptn attribute ???????.
     * 
     * @param recptn the recptn to set
     **/
    public void setRecptn(List<SmsRecptn> recptn) {
        this.recptn = Collections.unmodifiableList(recptn);
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
     * @param uniqId the uniqId to set
     **/
    public void setUniqId(String uniqId) {
        this.uniqId = uniqId;
    }

    /**
     * recptnCnt attribute?????.
     * 
     * @return the recptnCnt
     **/
    public int getRecptnCnt() {
        return recptnCnt;
    }

    /**
     * recptnCnt attribute ???????.
     * 
     * @param recptnCnt the recptnCnt to set
     **/
    public void setRecptnCnt(int recptnCnt) {
        this.recptnCnt = recptnCnt;
    }

    /**
     * recptnTelno attribute?????.
     * 
     * @return the recptnTelno
     **/
    // public String[] getRecptnTelno() {
    // return recptnTelno;
    // }
    // 2011.10.07 private ??public ?? ???? ?????
    public String[] getRecptnTelno() {
        // ???? private?? ???? ? ?????
        // ???????? public???? ???
        String[] ret = null;
        if (this.recptnTelno != null) {
            ret = new String[recptnTelno.length];
            for (int i = 0; i < recptnTelno.length; i++) {
                ret[i] = this.recptnTelno[i];
            }
        }
        return ret;
    }

    /**
     * recptnTelno attribute ???????.
     * 
     * @param recptnTelno the recptnTelno to set
     **/
    // public void setRecptnTelno(String[] recptnTelno) {
    // this.recptnTelno = recptnTelno;
    // }
    // 2011.10.07 private ?? ????????????? ?????
    public void setRecptnTelno(String[] recptnTelno) {
        this.recptnTelno = new String[recptnTelno.length];
        for (int i = 0; i < recptnTelno.length; ++i) {
            this.recptnTelno[i] = recptnTelno[i];
        }
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
