package egovframework.com.sym.bat.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛곗튂寃곌낵愿由ъ뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class BatchResult extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = 8673713935753272633L;
	/**
	 * 諛곗튂寃곌낵ID
	 */
	private String batchResultId;
	/**
	 * 諛곗튂?ㅼ?以껱D
	 */
	private String batchSchdulId;

	/**
	 * 諛곗튂?묒뾽ID
	 */
	private String batchOpertId;
	/**
	 * ?뚮씪誘명꽣
	 */
	private String paramtr;
	/**
	 * ?곹깭
	 */
	private String sttus;
	/**
	 * ?ㅽ뻾?쒖옉?쒓컖
	 */
	private String executBeginTime;
	/**
	 * ?ㅽ뻾醫낅즺?쒓컖
	 */
	private String executEndTime;
	/**
	 * 理쒖쥌?섏젙???꾩씠??
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * 理쒖큹?깅줉???꾩씠??
	 */
	private String frstRegisterId;
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm;
	/**
	 * ?먮윭?뺣낫
	 */
	private String errorInfo;

	/**
	 * 諛곗튂?묒뾽紐?
	 */
	private String batchOpertNm;
	/**
	 * 諛곗튂?꾨줈洹몃옩
	 */
	private String batchProgrm;
	/**
	 * ?곹깭紐?
	 */
	private String sttusNm;

	/**
	 * @return the batchResultId
	 */
	public String getBatchResultId() {
		return batchResultId;
	}

	/**
	 * @return the batchOpertId
	 */
	public String getBatchOpertId() {
		return batchOpertId;
	}

	/**
	 * @return the paramtr
	 */
	public String getParamtr() {
		return paramtr;
	}

	/**
	 * @return the sttus
	 */
	public String getSttus() {
		return sttus;
	}

	/**
	 * @return the executBeginTime
	 */
	public String getExecutBeginTime() {
		return executBeginTime;
	}

	/**
	 * @return the executEndTime
	 */
	public String getExecutEndTime() {
		return executEndTime;
	}

	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @return the errorInfo
	 */
	public String getErrorInfo() {
		return errorInfo;
	}

	/**
	 * @return the batchOpertNm
	 */
	public String getBatchOpertNm() {
		return batchOpertNm;
	}

	/**
	 * @return the batchProgrm
	 */
	public String getBatchProgrm() {
		return batchProgrm;
	}

	/**
	 * @return the sttusNm
	 */
	public String getSttusNm() {
		return sttusNm;
	}

	/**
	 * @param batchResultId the batchResultId to set
	 */
	public void setBatchResultId(String batchResultId) {
		this.batchResultId = batchResultId;
	}

	/**
	 * @param batchOpertId the batchOpertId to set
	 */
	public void setBatchOpertId(String batchOpertId) {
		this.batchOpertId = batchOpertId;
	}

	/**
	 * @param paramtr the paramtr to set
	 */
	public void setParamtr(String paramtr) {
		this.paramtr = paramtr;
	}

	/**
	 * @param sttus the sttus to set
	 */
	public void setSttus(String sttus) {
		this.sttus = sttus;
	}

	/**
	 * @param executBeginTime the executBeginTime to set
	 */
	public void setExecutBeginTime(String executBeginTime) {
		this.executBeginTime = executBeginTime;
	}

	/**
	 * @param executEndTime the executEndTime to set
	 */
	public void setExecutEndTime(String executEndTime) {
		this.executEndTime = executEndTime;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @param errorInfo the errorInfo to set
	 */
	public void setErrorInfo(String errorInfo) {
		this.errorInfo = errorInfo;
	}

	/**
	 * @param batchOpertNm the batchOpertNm to set
	 */
	public void setBatchOpertNm(String batchOpertNm) {
		this.batchOpertNm = batchOpertNm;
	}

	/**
	 * @param batchProgrm the batchProgrm to set
	 */
	public void setBatchProgrm(String batchProgrm) {
		this.batchProgrm = batchProgrm;
	}

	/**
	 * @param sttusNm the sttusNm to set
	 */
	public void setSttusNm(String sttusNm) {
		this.sttusNm = sttusNm;
	}

	/**
	 * @return the batchSchdulId
	 */
	public String getBatchSchdulId() {
		return batchSchdulId;
	}

	/**
	 * @param batchSchdulId the batchSchdulId to set
	 */
	public void setBatchSchdulId(String batchSchdulId) {
		this.batchSchdulId = batchSchdulId;
	}

}