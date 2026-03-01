package egovframework.com.utl.sys.prm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - PROCESS紐⑤땲?곕쭅?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?꾨줈?몄뒪紐? ?꾨줈?몄뒪?곹깭, 愿由ъ옄紐? 愿由ъ옄?대찓?쇱＜?? 理쒖쥌?섏젙?륤D, 理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:46
 */

@SuppressWarnings("serial")
public class ProcessMon implements Serializable  {

	/**
	 * ?꾨줈?몄뒪 紐?
	 */
	private String processNm;
	/**
	 * ?꾨줈?몄뒪?꾩씠??
	 */
	private String processId;
	/**
	 * 濡쒓렇ID
	 */
	private String logId;
	/**
	 * 濡쒓렇?뺣낫
	 */
	private String logInfo;
	/**
	 * ?꾨줈?몄뒪 ?곹깭
	 */
	private String procsSttus;
	/**
	 * ?앹꽦?쒓컙
	 */
	private String creatDt;
	/**
	 * 愿由ъ옄 紐?
	 */
	private String mngrNm;
	/**
	 * 愿由ъ옄 ?대찓??二쇱냼
	 */
	private String mngrEmailAddr;
	/**
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId;
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm;
	/**
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * @return the processNm
	 */
	public String getProcessNm() {
		return processNm;
	}
	/**
	 * @param processNm the processNm to set
	 */
	public void setProcessNm(String processNm) {
		this.processNm = processNm;
	}
	/**
	 * @return the processId
	 */
	public String getProcessId() {
		return processId;
	}
	/**
	 * @param processId the processId to set
	 */
	public void setProcessId(String processId) {
		this.processId = processId;
	}
	/**
	 * @return the logId
	 */
	public String getLogId() {
		return logId;
	}
	/**
	 * @param logId the logId to set
	 */
	public void setLogId(String logId) {
		this.logId = logId;
	}
	/**
	 * @return the logInfo
	 */
	public String getLogInfo() {
		return logInfo;
	}
	/**
	 * @param logInfo the logInfo to set
	 */
	public void setLogInfo(String logInfo) {
		this.logInfo = logInfo;
	}
	/**
	 * @return the procsSttus
	 */
	public String getProcsSttus() {
		return procsSttus;
	}
	/**
	 * @param procsSttus the procsSttus to set
	 */
	public void setProcsSttus(String procsSttus) {
		this.procsSttus = procsSttus;
	}
	/**
	 * @return the creatDt
	 */
	public String getCreatDt() {
		return creatDt;
	}
	/**
	 * @param creatDt the creatDt to set
	 */
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}
	/**
	 * @return the mngrNm
	 */
	public String getMngrNm() {
		return mngrNm;
	}
	/**
	 * @param mngrNm the mngrNm to set
	 */
	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}
	/**
	 * @return the mngrEmailAddr
	 */
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}
	/**
	 * @param mngrEmailAddr the mngrEmailAddr to set
	 */
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}
	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
}
