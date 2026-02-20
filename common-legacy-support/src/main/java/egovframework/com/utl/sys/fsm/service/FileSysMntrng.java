package egovframework.com.utl.sys.fsm.service;

import java.io.Serializable;

/**
 * ??
 * - ???????????? ????model ?????? ???.
 *
 * ???
 * - ???????, ???????, ?????????, ???????? ?????????? ?????????? ?????????, ?????????,
 * ??? ???????? ?????? ???? ?????????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:33:26
 **/
public class FileSysMntrng implements Serializable {

	private static final long serialVersionUID = 1L;

	/**
	 * ???????
	 **/
	private String fileSysId;
	/**
	 * ???????
	 **/
	private String fileSysNm;
	/**
	 * ?????????
	 **/
	private String fileSysManageNm;
	/**
	 * ????????
	 **/
	private int fileSysMg;
	/**
	 * ??????????
	 **/
	private int fileSysThrhld;
	/**
	 * ???????????
	 **/
	private int fileSysThrhldRt;
	/**
	 * ?????????
	 **/
	private int fileSysUsgQty;
	/**
	 * ?????????
	 **/
	private double fileSysUsgRt;
	/**
	 * ???
	 **/
	private String mngrNm;
	/**
	 * ????????
	 **/
	private String mngrEmailAddr;
	/**
	 * ??
	 **/
	private String logInfo;
	/**
	 * ???
	 **/
	private String mntrngSttus;
	/**
	 * ????
	 **/
	private String creatDt;
	/**
	 * ???
	 **/
	private String frstRegisterId = "";
	/**
	 * ????
	 **/
	private String frstRegisterPnttm = "";
	/**
	 * ???
	 **/
	private String lastUpdusrId = "";
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm = "";

	public String getFileSysId() {
		return fileSysId;
	}

	public void setFileSysId(String fileSysId) {
		this.fileSysId = fileSysId;
	}

	public String getFileSysNm() {
		return fileSysNm;
	}

	public void setFileSysNm(String fileSysNm) {
		this.fileSysNm = fileSysNm;
	}

	public String getFileSysManageNm() {
		return fileSysManageNm;
	}

	public void setFileSysManageNm(String fileSysManageNm) {
		this.fileSysManageNm = fileSysManageNm;
	}

	public int getFileSysMg() {
		return fileSysMg;
	}

	public void setFileSysMg(int fileSysMg) {
		this.fileSysMg = fileSysMg;
	}

	public int getFileSysThrhld() {
		return fileSysThrhld;
	}

	public void setFileSysThrhld(int fileSysThrhld) {
		this.fileSysThrhld = fileSysThrhld;
	}

	public int getFileSysThrhldRt() {
		return fileSysThrhldRt;
	}

	public void setFileSysThrhldRt(int fileSysThrhldRt) {
		this.fileSysThrhldRt = fileSysThrhldRt;
	}

	public int getFileSysUsgQty() {
		return fileSysUsgQty;
	}

	public void setFileSysUsgQty(int fileSysUsgQty) {
		this.fileSysUsgQty = fileSysUsgQty;
	}

	public double getFileSysUsgRt() {
		return fileSysUsgRt;
	}

	public void setFileSysUsgRt(double fileSysUsgRt) {
		this.fileSysUsgRt = fileSysUsgRt;
	}

	public String getMngrNm() {
		return mngrNm;
	}

	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}

	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}

	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}

	public String getLogInfo() {
		return logInfo;
	}

	public void setLogInfo(String logInfo) {
		this.logInfo = logInfo;
	}

	public String getMntrngSttus() {
		return mntrngSttus;
	}

	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
	}

	public String getCreatDt() {
		return creatDt;
	}

	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}

	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

}
