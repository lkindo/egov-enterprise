package egovframework.com.uss.olp.opm.service;

import java.io.Serializable;

/**
 * ????LL????VO Class ?
 * @author ?????????
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; ?????Modification Information) &gt;&gt;
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.07.03  ???         ????
 *
 * </pre>
 **/
public class OnlinePollItem implements Serializable {

	private static final long serialVersionUID = -5318527177437211052L;

	/** ????LL ??? **/
    private String pollId;

    /** ????LL ???**/
    private String pollNm;

    /** ????LL??????? **/
    private String pollIemId;

    /** ????LL???????**/
    private String pollIemNm;

    /** ???? **/
    private String frstRegisterPnttm;

    /** ?????**/
    private String frstRegisterId;

    /** ????**/
    private String lastUpdusrPnttm;

    /** ???????**/
    private String lastUpdusrId;

    /** ?????**/
    private String cmd;

    /**
     * pollId ?
     *
     * @return the pollId
     **/
    public String getPollId() {
        return pollId;
    }

    /**
     * pollId ??
     *
     * @param pollId the pollId to set
     **/
    public void setPollId(String pollId) {
        this.pollId = pollId;
    }

    /**
     * pollNm ?
     *
     * @return the pollNm
     **/
    public String getPollNm() {
        return pollNm;
    }

    /**
     * pollNm ??
     *
     * @param pollNm the pollNm to set
     **/
    public void setPollNm(String pollNm) {
        this.pollNm = pollNm;
    }

    /**
     * pollIemId ?
     *
     * @return the pollIemId
     **/
    public String getPollIemId() {
        return pollIemId;
    }

    /**
     * pollIemId ??
     *
     * @param pollIemId the pollIemId to set
     **/
    public void setPollIemId(String pollIemId) {
        this.pollIemId = pollIemId;
    }

    /**
     * pollIemNm ?
     *
     * @return the pollIemNm
     **/
    public String getPollIemNm() {
        return pollIemNm;
    }

    /**
     * pollIemNm ??
     *
     * @param pollIemNm the pollIemNm to set
     **/
    public void setPollIemNm(String pollIemNm) {
        this.pollIemNm = pollIemNm;
    }

    /**
     * frstRegisterPnttm ?
     *
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm ??
     *
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId ?
     *
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId ??
     *
     * @param frstRegisterId the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * lastUpdusrPnttm ?
     *
     * @return the lastUpdusrPnttm
     **/
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm ??
     *
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * lastUpdusrId ?
     *
     * @return the lastUpdusrId
     **/
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId ??
     *
     * @param lastUpdusrId the lastUpdusrId to set
     **/
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * cmd ?
     *
     * @return the cmd
     **/
    public String getCmd() {
        return cmd;
    }

    /**
     * cmd ??
     *
     * @param cmd the cmd to set
     **/
    public void setCmd(String cmd) {
        this.cmd = cmd;
    }


}
