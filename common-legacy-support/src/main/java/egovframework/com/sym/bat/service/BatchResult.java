package egovframework.com.sym.bat.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??? ????model ?????
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 *      </pre>
 **/
public class BatchResult extends ComDefaultVO {

	private static final long serialVersionUID = 8673713935753272633L;
	/**
	 * ?ID
	 **/
	private String batchResultId;
	/**
	 * ????D
	 **/
	private String batchSchdulId;

	/**
	 * ??ID
	 **/
	private String batchOpertId;
	/**
	 * ????
	 **/
	private String paramtr;
	/**
	 * ?
	 **/
	private String sttus;
	/**
	 * ??????
	 **/
	private String executBeginTime;
	/**
	 * ?????
	 **/
	private String executEndTime;
	/**
	 * ???????
	 **/
	private String lastUpdusrId;
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm;
	/**
	 * ???????
	 **/
	private String frstRegisterId;
	/**
	 * ????
	 **/
	private String frstRegisterPnttm;
	/**
	 * ???
	 **/
	private String errorInfo;

	/**
	 * ???
	 **/
	private String batchOpertNm;
	/**
	 * ????
	 **/
	private String batchProgrm;
	/**
	 * ??
	 **/
	private String sttusNm;

	/**
	 * @return the batchResultId
	 **/
	public String getBatchResultId() {
		return batchResultId;
	}

	/**
	 * @return the batchOpertId
	 **/
	public String getBatchOpertId() {
		return batchOpertId;
	}

	/**
	 * @return the paramtr
	 **/
	public String getParamtr() {
		return paramtr;
	}

	/**
	 * @return the sttus
	 **/
	public String getSttus() {
		return sttus;
	}

	/**
	 * @return the executBeginTime
	 **/
	public String getExecutBeginTime() {
		return executBeginTime;
	}

	/**
	 * @return the executEndTime
	 **/
	public String getExecutEndTime() {
		return executEndTime;
	}

	/**
	 * @return the lastUpdusrId
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @return the errorInfo
	 **/
	public String getErrorInfo() {
		return errorInfo;
	}

	/**
	 * @return the batchOpertNm
	 **/
	public String getBatchOpertNm() {
		return batchOpertNm;
	}

	/**
	 * @return the batchProgrm
	 **/
	public String getBatchProgrm() {
		return batchProgrm;
	}

	/**
	 * @return the sttusNm
	 **/
	public String getSttusNm() {
		return sttusNm;
	}

	/**
	 * @param batchResultId the batchResultId to set
	 **/
	public void setBatchResultId(String batchResultId) {
		this.batchResultId = batchResultId;
	}

	/**
	 * @param batchOpertId the batchOpertId to set
	 **/
	public void setBatchOpertId(String batchOpertId) {
		this.batchOpertId = batchOpertId;
	}

	/**
	 * @param paramtr the paramtr to set
	 **/
	public void setParamtr(String paramtr) {
		this.paramtr = paramtr;
	}

	/**
	 * @param sttus the sttus to set
	 **/
	public void setSttus(String sttus) {
		this.sttus = sttus;
	}

	/**
	 * @param executBeginTime the executBeginTime to set
	 **/
	public void setExecutBeginTime(String executBeginTime) {
		this.executBeginTime = executBeginTime;
	}

	/**
	 * @param executEndTime the executEndTime to set
	 **/
	public void setExecutEndTime(String executEndTime) {
		this.executEndTime = executEndTime;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @param errorInfo the errorInfo to set
	 **/
	public void setErrorInfo(String errorInfo) {
		this.errorInfo = errorInfo;
	}

	/**
	 * @param batchOpertNm the batchOpertNm to set
	 **/
	public void setBatchOpertNm(String batchOpertNm) {
		this.batchOpertNm = batchOpertNm;
	}

	/**
	 * @param batchProgrm the batchProgrm to set
	 **/
	public void setBatchProgrm(String batchProgrm) {
		this.batchProgrm = batchProgrm;
	}

	/**
	 * @param sttusNm the sttusNm to set
	 **/
	public void setSttusNm(String sttusNm) {
		this.sttusNm = sttusNm;
	}

	/**
	 * @return the batchSchdulId
	 **/
	public String getBatchSchdulId() {
		return batchSchdulId;
	}

	/**
	 * @param batchSchdulId the batchSchdulId to set
	 **/
	public void setBatchSchdulId(String batchSchdulId) {
		this.batchSchdulId = batchSchdulId;
	}

}
