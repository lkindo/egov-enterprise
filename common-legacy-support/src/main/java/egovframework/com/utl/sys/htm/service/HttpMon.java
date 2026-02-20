package egovframework.com.utl.sys.htm.service;

import java.io.Serializable;

/**
 * ??
 * - HTTP???????????model ?????? ???.
 *
 * ???
 * - ?????L, ????, ??? ??, ??? ???????? ???, ???? ?????????
 * 
 * @author ??
 * @version 1.0
 * @created 17-6-2010 ?? 5:12:45
 **/

public class HttpMon implements Serializable {

	private static final long serialVersionUID = 1L;

	/**
	 * ?D
	 **/
	private String logId;
	/**
	 * ??
	 **/
	private String logInfo;
	/**
	 * ?????L
	 **/
	private String siteUrl;
	/**
	 * ????
	 **/
	private String sysId;
	/**
	 * ???
	 **/
	private String webKind;
	/**
	 * ???
	 **/
	private String webKindNm;
	/**
	 * ??
	 **/
	private String httpSttusCd;
	/**
	 * ????
	 **/
	private String creatDt;
	/**
	 * ???
	 **/
	private String mngrNm;
	/**
	 * ????????
	 **/
	private String mngrEmailAddr;
	/**
	 * ???
	 **/
	private String mntrngSttus;
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
	 * @return the siteUrl
	 **/
	public String getSiteUrl() {
		return siteUrl;
	}

	/**
	 * @param siteUrl the siteUrl to set
	 **/
	public void setSiteUrl(String siteUrl) {
		this.siteUrl = siteUrl;
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
	 * @return the sysId
	 **/
	public String getSysId() {
		return sysId;
	}

	/**
	 * @param sysId the sysId to set
	 **/
	public void setSysId(String sysId) {
		this.sysId = sysId;
	}

	/**
	 * @return the webKind
	 **/
	public String getWebKind() {
		return webKind;
	}

	/**
	 * @param webKind the webKind to set
	 **/
	public void setWebKind(String webKind) {
		this.webKind = webKind;
	}

	/**
	 * @return the webKindNm
	 **/
	public String getWebKindNm() {
		return webKindNm;
	}

	/**
	 * @param webKindNm the webKindNm to set
	 **/
	public void setWebKindNm(String webKindNm) {
		this.webKindNm = webKindNm;
	}

	/**
	 * @return the httpSttusCd
	 **/
	public String getHttpSttusCd() {
		return httpSttusCd;
	}

	/**
	 * @param httpSttusCd the httpSttusCd to set
	 **/
	public void setHttpSttusCd(String httpSttusCd) {
		this.httpSttusCd = httpSttusCd;
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
	 * @return the lastUpdusrId
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
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
	 * @return the mntrngSttus
	 **/
	public String getMntrngSttus() {
		return mntrngSttus;
	}

	/**
	 * @param mntrngSttus the mntrngSttus to set
	 **/
	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
	}

}
