package egovframework.com.uss.olh.omm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?⑤씪?몃찓?댁뼹 VO Class 援ы쁽
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
public class OnlineManualVO extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -7024282928339275971L;

	/** ?⑤씪?몃찓?댁뼹 ?꾩씠??*/
    private String onlineMnlId;

    /** ?⑤씪?몃찓?댁뼹 紐?*/
    private String onlineMnlNm;

    /** ?⑤씪?몃찓?댁뼹 援щ텇肄붾뱶 */
    private String onlineMnlSeCode;

    /** ?⑤씪?몃찓?댁뼹 援щ텇肄붾뱶 */
    private String onlineMnlSeCodeNm;
    
    /** ?⑤씪?몃찓?댁뼹 ?뺤쓽 */
    private String onlineMnlDf;

    /** ?⑤씪?몃찓?댁뼹 ?ㅻ챸 */
    private String onlineMnlDc;

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?꾩씠??*/
    private String frstRegisterId;
    
    /** 理쒖큹?깅줉??*/
    private String frstRegisterNm;

    /** 理쒖쥌?섏젙??*/
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId;

    /** 而⑦듃濡?紐낅졊??*/
    private String cmd;

    /**
     * onlineMnlId 由ы꽩
     *
     * @return the onlineMnlId
     */
    public String getOnlineMnlId() {
        return onlineMnlId;
    }

    /**
     * onlineMnlId ?ㅼ젙
     *
     * @param onlineMnlId the onlineMnlId to set
     */
    public void setOnlineMnlId(String onlineMnlId) {
        this.onlineMnlId = onlineMnlId;
    }

    /**
     * onlineMnlNm 由ы꽩
     *
     * @return the onlineMnlNm
     */
    public String getOnlineMnlNm() {
        return onlineMnlNm;
    }

    /**
     * onlineMnlNm ?ㅼ젙
     *
     * @param onlineMnlNm the onlineMnlNm to set
     */
    public void setOnlineMnlNm(String onlineMnlNm) {
        this.onlineMnlNm = onlineMnlNm;
    }

    /**
     * onlineMnlSeCode 由ы꽩
     *
     * @return the onlineMnlSeCode
     */
    public String getOnlineMnlSeCode() {
        return onlineMnlSeCode;
    }

    /**
     * onlineMnlSeCode ?ㅼ젙
     *
     * @param onlineMnlSeCode the onlineMnlSeCode to set
     */
    public void setOnlineMnlSeCode(String onlineMnlSeCode) {
        this.onlineMnlSeCode = onlineMnlSeCode;
    }

    /**
     * onlineMnlSeCodeNm 由ы꽩
     *
     * @return the onlineMnlSeCode
     */
    public String getOnlineMnlSeCodeNm() {
        return onlineMnlSeCodeNm;
    }

    /**
     * onlineMnlSeCodeNm ?ㅼ젙
     *
     * @param onlineMnlSeCodeNm the onlineMnlSeCodeNm to set
     */
    public void setOnlineMnlSeCodeNm(String onlineMnlSeCodeNm) {
        this.onlineMnlSeCodeNm = onlineMnlSeCodeNm;
    }
    
    /**
     * onlineMnlDf 由ы꽩
     *
     * @return the onlineMnlDf
     */
    public String getOnlineMnlDf() {
        return onlineMnlDf;
    }

    /**
     * onlineMnlDf ?ㅼ젙
     *
     * @param onlineMnlDf the onlineMnlDf to set
     */
    public void setOnlineMnlDf(String onlineMnlDf) {
        this.onlineMnlDf = onlineMnlDf;
    }

    /**
     * onlineMnlDc 由ы꽩
     *
     * @return the onlineMnlDc
     */
    public String getOnlineMnlDc() {
        return onlineMnlDc;
    }

    /**
     * onlineMnlDc ?ㅼ젙
     *
     * @param onlineMnlDc the onlineMnlDc to set
     */
    public void setOnlineMnlDc(String onlineMnlDc) {
        this.onlineMnlDc = onlineMnlDc;
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
     * frstRegisterNm 由ы꽩
     *
     * @return the frstRegisterNm
     */
    public String getFrstRegisterNm() {
    	return frstRegisterNm;
    }
    
    /**
     * frstRegisterNm ?ㅼ젙
     *
     * @param frstRegisterNm the frstRegisterNm to set
     */
    public void setFrstRegisterNm(String frstRegisterNm) {
    	this.frstRegisterNm = frstRegisterNm;
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

    /**
   	 * toString 硫붿냼?쒕? ?移섑븳??
   	 */
   	public String toString(){
   		return ToStringBuilder.reflectionToString(this);
   	}


}
