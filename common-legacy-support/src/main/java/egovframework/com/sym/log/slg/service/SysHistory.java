package egovframework.com.sym.log.slg.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;


/**
 * @Class Name  : SysHistory.java
 * @Description : ???????????? ? ???????
 * @Modification Information
 *
 *     ????        ????                  ????
 *     -------          --------        ---------------------------
 *   2009.03.06       ????                 ????
 *
 * @author ????????? ????
 * @since 2009. 03. 06
 * @version 1.0
 * @see
 *
 **/
public class SysHistory implements Serializable {

	private static final long serialVersionUID = 2790964197430747133L;
	/**
	 * ????
	 **/
	private String histId = "";
	/**
	 * ???????
	 *
	 **/
	private String frstRegisterId = "";
	/**
	 * ????
	 **/
	private String frstRegisterPnttm = "";
	/**
	 * ?????
	 **/
	private String histCn = "";
	/**
	 * ?????
	 **/
	private String histSeCode = "";
	/**
	 * ???????
	 **/
	private String lastUpdusrId = "";
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm = "";
	/**
	 * ????
	 **/
	private String sysNm = "";
	/**
	 * ????ID
	 **/
	private String atchFileId = "";
	/**
	 * @return the creatDt
	 **/
	public String getHistId() {
		return histId;
	}
	/**
	 * @param creatDt the creatDt to set
	 **/
	public void setHistId(String histId) {
		this.histId = histId;
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
	 * @return the histCn
	 **/
	public String getHistCn() {
		return histCn;
	}
	/**
	 * @param histCn the histCn to set
	 **/
	public void setHistCn(String histCn) {
		this.histCn = histCn;
	}
	/**
	 * @return the histSeCode
	 **/
	public String getHistSeCode() {
		return histSeCode;
	}
	/**
	 * @param histSeCode the histSeCode to set
	 **/
	public void setHistSeCode(String histSeCode) {
		this.histSeCode = histSeCode;
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
	/**
	 * @return the sysNm
	 **/
	public String getSysNm() {
		return sysNm;
	}
	/**
	 * @param sysNm the sysNm to set
	 **/
	public void setSysNm(String sysNm) {
		this.sysNm = sysNm;
	}

	public String getAtchFileId() {
		return atchFileId;
	}
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}
	/**
	 *
	 **/
	@Override
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}

}
