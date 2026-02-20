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
public class Blog implements Serializable {
    private static final long serialVersionUID = 1L;

    /** ?????**/
    private String blogId = "";

    /** ??????**/
    private String bbsId = "";

    /** ????? **/
    private String blogIntrcn = "";

    /** ???**/
    private String blogNm = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    private String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ????**/
    private String registSeCode = "";

    /** ???????**/
    private String tmplatId = "";

    /** ???????**/
    private String useAt = "";

    /** ????????**/
    private String emplyrId = "";

    /** ????? **/
    private String userNm = "";

    /** ?????**/
    private String tmplatNm = "";

    /** ???????? **/
    private String blogAt = "";

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

    public String getBbsId() {
        return bbsId;
    }

    public void setBbsId(String bbsId) {
        this.bbsId = bbsId;
    }

    /**
     * blogIntrcn attribute?????.
     * 
     * @return the blogIntrcn
     **/
    public String getBlogIntrcn() {
        return blogIntrcn;
    }

    /**
     * blogIntrcn attribute ???????.
     * 
     * @param blogIntrcn
     *                   the blogIntrcn to set
     **/
    public void setBlogIntrcn(String blogIntrcn) {
        this.blogIntrcn = blogIntrcn;
    }

    /**
     * blogNm attribute?????.
     * 
     * @return the blogNm
     **/
    public String getBlogNm() {
        return blogNm;
    }

    /**
     * blogNm attribute ???????.
     * 
     * @param blogNm
     *               the blogNm to set
     **/
    public void setBlogNm(String blogNm) {
        this.blogNm = blogNm;
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
     * registSeCode attribute?????.
     * 
     * @return the registSeCode
     **/
    public String getRegistSeCode() {
        return registSeCode;
    }

    /**
     * registSeCode attribute ???????.
     * 
     * @param registSeCode
     *                     the registSeCode to set
     **/
    public void setRegistSeCode(String registSeCode) {
        this.registSeCode = registSeCode;
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
     * userNm attribute?????.
     * 
     * @return the userNm
     **/
    public String getUserNm() {
        return userNm;
    }

    /**
     * userNm attribute ???????.
     * 
     * @param userNm
     *               the userNm to set
     **/
    public void setUserNm(String userNm) {
        this.userNm = userNm;
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

    public String getBlogAt() {
        return blogAt;
    }

    public void setBlogAt(String blogAt) {
        this.blogAt = blogAt;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }

}
