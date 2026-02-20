package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ??? ??? ? ???????
 * 
 * @author ??????? ???
 * @since 2017.09.12
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????           ????          ????
 *  -----------   --------   ---------------------------
 *   2017.09.12  ???         ????
 *
 *      </pre>
 **/
public class BlogUser implements Serializable {
    private static final long serialVersionUID = 1L;

    /** ????**/
    private String blogId = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    private String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ????? **/
    private String mngrAt = "";

    /** ????**/
    private String secsnDe = "";

    /** ?? **/
    private String sbscrbDe = "";

    /** ?????? **/
    private String useAt = "";

    /** ????????**/
    private String emplyrId = "";

    /** ????? **/
    private String emplyrNm = "";

    /** ??? ID **/
    private String userId = "";

    /** ??? ????**/
    private String userEmail = "";

    /** ??? ? **/
    private String mberSttus = "";

    /** ??? ? ??**/
    private String mberSttusNm = "";

    /**
     * blogId attribute?????.
     * 
     * @return the blogId
     **/
    public String getBlogId() {
        return blogId;
    }

    /**
     * blogId attribute ???????.
     * 
     * @param blogId
     *               the blogId to set
     **/
    public void setBlogId(String blogId) {
        this.blogId = blogId;
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
     * mngrAt attribute?????.
     * 
     * @return the mngrAt
     **/
    public String getMngrAt() {
        return mngrAt;
    }

    /**
     * mngrAt attribute ???????.
     * 
     * @param mngrAt
     *               the mngrAt to set
     **/
    public void setMngrAt(String mngrAt) {
        this.mngrAt = mngrAt;
    }

    /**
     * secsnDe attribute?????.
     * 
     * @return the secsnDe
     **/
    public String getSecsnDe() {
        return secsnDe;
    }

    /**
     * secsnDe attribute ???????.
     * 
     * @param secsnDe
     *                the secsnDe to set
     **/
    public void setSecsnDe(String secsnDe) {
        this.secsnDe = secsnDe;
    }

    /**
     * sbscrbDe attribute?????.
     * 
     * @return the sbscrbDe
     **/
    public String getSbscrbDe() {
        return sbscrbDe;
    }

    /**
     * sbscrbDe attribute ???????.
     * 
     * @param sbscrbDe
     *                 the sbscrbDe to set
     **/
    public void setSbscrbDe(String sbscrbDe) {
        this.sbscrbDe = sbscrbDe;
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
     * emplyrId attribute?????.
     * 
     * @return the emplyrId
     **/
    public String getEmplyrId() {
        return emplyrId;
    }

    /**
     * emplyrId attribute ???????.
     * 
     * @param emplyrId
     *                 the emplyrId to set
     **/
    public void setEmplyrId(String emplyrId) {
        this.emplyrId = emplyrId;
    }

    /**
     * emplyrNm attribute?????.
     * 
     * @return the emplyrNm
     **/
    public String getEmplyrNm() {
        return emplyrNm;
    }

    /**
     * emplyrNm attribute ???????.
     * 
     * @param emplyrNm
     *                 the emplyrNm to set
     **/
    public void setEmplyrNm(String emplyrNm) {
        this.emplyrNm = emplyrNm;
    }

    /**
     * userId attribute?????.
     * 
     * @return the userId
     **/
    public String getUserId() {
        return userId;
    }

    /**
     * userId attribute ???????.
     * 
     * @param userId
     *               the userId to set
     **/
    public void setUserId(String userId) {
        this.userId = userId;
    }

    /**
     * userEmail attribute?????.
     * 
     * @return the userEmail
     **/
    public String getUserEmail() {
        return userEmail;
    }

    /**
     * userEmail attribute ???????.
     * 
     * @param userEmail
     *                  the userEmail to set
     **/
    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    /**
     * mberSttus attribute?????.
     * 
     * @return the mberSttus
     **/
    public String getMberSttus() {
        return mberSttus;
    }

    /**
     * mberSttus attribute ???????.
     * 
     * @param mberSttus
     *                  the mberSttus to set
     **/
    public void setMberSttus(String mberSttus) {
        this.mberSttus = mberSttus;
    }

    /**
     * mberSttusNm attribute?????.
     * 
     * @return the mberSttusNm
     **/
    public String getMberSttusNm() {
        return mberSttusNm;
    }

    /**
     * mberSttusNm attribute ???????.
     * 
     * @param mberSttusNm
     *                    the mberSttusNm to set
     **/
    public void setMberSttusNm(String mberSttusNm) {
        this.mberSttusNm = mberSttusNm;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
