package egovframework.com.uss.olp.opr.service;

import java.io.Serializable;

/**
 * ?⑤씪?퇠OLL寃곌낵 VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class OnlinePollResult implements Serializable {

	private static final long serialVersionUID = 4131733023391380770L;

	/** ?⑤씪?퇠OLL ?꾩씠?? */
    private String pollId;

    /** ?⑤씪?퇠OLL ?대쫫 */
    private String pollNm;

    /** ?⑤씪?퇠OLL ??ぉ ?꾩씠??*/
    private String pollIemId;

    /** ?⑤씪?퇠OLL ??ぉ紐?*/
    private String pollIemNm;

    /** ?⑤씪?퇠OLL 寃곌낵 ?꾩씠??*/
    private String pollResultId;

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?꾩씠??*/
    private String frstRegisterId;

    /** 理쒖쥌?섏젙??*/
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId;

    /** 而⑦듃濡?紐낅졊??*/
    private String cmd;

    /**
     * pollId 由ы꽩
     *
     * @return the pollId
     */
    public String getPollId() {
        return pollId;
    }

    /**
     * pollId ?ㅼ젙
     *
     * @param pollId the pollId to set
     */
    public void setPollId(String pollId) {
        this.pollId = pollId;
    }

    /**
     * pollNm 由ы꽩
     *
     * @return the pollNm
     */
    public String getPollNm() {
        return pollNm;
    }

    /**
     * pollNm ?ㅼ젙
     *
     * @param pollNm the pollNm to set
     */
    public void setPollNm(String pollNm) {
        this.pollNm = pollNm;
    }

    /**
     * pollIemId 由ы꽩
     *
     * @return the pollIemId
     */
    public String getPollIemId() {
        return pollIemId;
    }

    /**
     * pollIemId ?ㅼ젙
     *
     * @param pollIemId the pollIemId to set
     */
    public void setPollIemId(String pollIemId) {
        this.pollIemId = pollIemId;
    }

    /**
     * pollIemNm 由ы꽩
     *
     * @return the pollIemNm
     */
    public String getPollIemNm() {
        return pollIemNm;
    }

    /**
     * pollIemNm ?ㅼ젙
     *
     * @param pollIemNm the pollIemNm to set
     */
    public void setPollIemNm(String pollIemNm) {
        this.pollIemNm = pollIemNm;
    }

    /**
     * pollResultId 由ы꽩
     *
     * @return the pollResultId
     */
    public String getPollResultId() {
        return pollResultId;
    }

    /**
     * pollResultId ?ㅼ젙
     *
     * @param pollResultId the pollResultId to set
     */
    public void setPollResultId(String pollResultId) {
        this.pollResultId = pollResultId;
    }

    /**
     * frstRegisterPnttm 由ы꽩
     *
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm ?ㅼ젙
     *
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId 由ы꽩
     *
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId ?ㅼ젙
     *
     * @param frstRegisterId the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * lastUpdusrPnttm 由ы꽩
     *
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm ?ㅼ젙
     *
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * lastUpdusrId 由ы꽩
     *
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId ?ㅼ젙
     *
     * @param lastUpdusrId the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * cmd 由ы꽩
     *
     * @return the cmd
     */
    public String getCmd() {
        return cmd;
    }

    /**
     * cmd ?ㅼ젙
     *
     * @param cmd the cmd to set
     */
    public void setCmd(String cmd) {
        this.cmd = cmd;
    }



}
