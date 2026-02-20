package egovframework.com.utl.sys.prm.service;

import java.io.Serializable;

/**
 * ??
 * - PROCESS????????model ?????? ???.
 *
 * ???
 * - ??? ???, ??? ???????? ???, ???? ?????????
 * 
 * @author ??
 * @version 1.0
 * @created 08-9-2010 ?? 3:54:46
 **/

public class ProcessMon implements Serializable {

	private static final long serialVersionUID = 1L;

	/**
	 * ?? ?
	 **/
	private String processNm;
	/**
	 * ?????
	 **/
	private String processId;
	/**
	 * ?D
	 **/
	private String logId;
	/**
	 * ??
	 **/
	private String logInfo;
	/**
	 * ?? ?
	 **/
	private String procsSttus;
	/**
	 * ????
	 **/
	private String creatDt;
	/**
	 * ?? ?
	 **/
	private String mngrNm;
	/**
	 * ?? ??????
	 **/
	private String mngrEmailAddr;
	/**
	 * ???
	 **/
	private String frstRegisterId;
	/**
	 * ????
	 **/
	private String frstRegisterPnttm;
	/**
	 * ???
	 **/
	private String lastUpdusrId;
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm;

	/**
	 * @return the processNm
	 **/
	public String getProcessNm() {
		return processNm;
	}

	/**
	 * @param processNm the processNm to set
	 **/
	public void setProcessNm(String processNm) {
		this.processNm = processNm;
	}

	/**
	 * @return the processId
	 **/
	public String getProcessId() {
		return processId;
	}

	/**
	 * @param processId the processId to set
	 **/
	public void setProcessId(String processId) {
		this.processId = processId;
	}

	/**
	 * @return the logId
	 **/
	public String getLogId() {
		return logId;
	}

	/**
	 * @param logId the logId to set
	 **/
	public void setLogId(String logId) {
		this.logId = logId;
	}

	/**
	 * @return the logInfo
	 **/
	public String getLogInfo() {
		return logInfo;
	}

	/**
	 * @param logInfo the logInfo to set
	 **/
	public void setLogInfo(String logInfo) {
		this.logInfo = logInfo;
	}

	/**
	 * @return the procsSttus
	 **/
	public String getProcsSttus() {
		return procsSttus;
	}

	/**
	 * @param procsSttus the procsSttus to set
	 **/
	public void setProcsSttus(String procsSttus) {
		this.procsSttus = procsSttus;
	}

	/**
	 * @return the creatDt
	 **/
	public String getCreatDt() {
		return creatDt;
	}

	/**
	 * @param creatDt the creatDt to set
	 **/
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}

	/**
	 * @return the mngrNm
	 **/
	public String getMngrNm() {
		return mngrNm;
	}

	/**
	 * @param mngrNm the mngrNm to set
	 **/
	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}

	/**
	 * @return the mngrEmailAddr
	 **/
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}

	/**
	 * @param mngrEmailAddr the mngrEmailAddr to set
	 **/
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}

	/**
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @return the lastUpdusrId
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
}
