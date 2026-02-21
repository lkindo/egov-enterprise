package egovframework.com.cop.tpl.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ??????????? ???????
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
 *   2009.3.17  ????         ????
 *
 *      </pre>
 **/
public class TemplateInf implements Serializable {
    private static final long serialVersionUID = 1L;

    /** ???????**/
    private String frstRegisterId = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    private String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ?????**/
    private String tmplatCours = "";

    /** ???????**/
    private String tmplatId = "";

    /** ?????**/
    private String tmplatNm = "";

    /** ??????**/
    private String tmplatSeCode = "";

    /** ?????? **/
    private String useAt = "";

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
     * tmplatCours attribute?????.
     * 
     * @return the tmplatCours
     **/
    public String getTmplatCours() {
        return tmplatCours;
    }

    /**
     * tmplatCours attribute ???????.
     * 
     * @param tmplatCours
     *                    the tmplatCours to set
     **/
    public void setTmplatCours(String tmplatCours) {
        this.tmplatCours = tmplatCours;
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
     * tmplatSeCode attribute?????.
     * 
     * @return the tmplatSeCode
     **/
    public String getTmplatSeCode() {
        return tmplatSeCode;
    }

    /**
     * tmplatSeCode attribute ???????.
     * 
     * @param tmplatSeCode
     *                     the tmplatSeCode to set
     **/
    public void setTmplatSeCode(String tmplatSeCode) {
        this.tmplatSeCode = tmplatSeCode;
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
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
