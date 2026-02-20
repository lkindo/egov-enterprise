package egovframework.com.utl.sys.htm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - HTTP紐⑤땲?곕쭅 濡쒓렇?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뱀꽌鍮꾩뒪醫낅쪟, HTTP?곹깭, 愿由ъ옄紐? 愿由ъ옄?대찓?쇱＜?? 理쒖쥌?섏젙?륤D, 理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:46
 */

@SuppressWarnings("serial")
public class HttpMonLog implements Serializable {

	/**
	 * 濡쒓렇ID
	 */
	private String logId;
	/**
	 * 濡쒓렇?뺣낫
	 */
	private String logInfo;
	/**
	 * ?ъ씠?퇥RL
	 */
	private String siteUrl;
	/**
	 * ?쒖뒪?쏧D
	 */
	private String sysId;
	/**
	 * ?뱀꽌鍮꾩뒪醫낅쪟
	 */
	private String webKind;
	/**
	 * ?뱀꽌鍮꾩뒪?곹깭
	 */
	private String httpSttusCd;
	/**
	 * ?앹꽦?쇱떆
	 */
	private String creatDt;
	/**
	 * 愿由ъ옄紐?
	 */
	private String mngrNm;
	/**
	 * 愿由ъ옄?대찓?쇱＜??
	 */
	private String mngrEmailAddr;
    /*
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "";
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";
	/**
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
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
	 * @return the siteUrl
	 */
	public String getSiteUrl() {
		return siteUrl;
	}
	/**
	 * @param siteUrl the siteUrl to set
	 */
	public void setSiteUrl(String siteUrl) {
		this.siteUrl = siteUrl;
	}
	/**
	 * @return the sysId
	 */
	public String getSysId() {
		return sysId;
	}
	/**
	 * @param sysId the sysId to set
	 */
	public void setSysId(String sysId) {
		this.sysId = sysId;
	}
	/**
	 * @return the webKind
	 */
	public String getWebKind() {
		return webKind;
	}
	/**
	 * @param webKind the webKind to set
	 */
	public void setWebKind(String webKind) {
		this.webKind = webKind;
	}
	/**
	 * @return the httpSttusCd
	 */
	public String getHttpSttusCd() {
		return httpSttusCd;
	}
	/**
	 * @param httpSttusCd the httpSttusCd to set
	 */
	public void setHttpSttusCd(String httpSttusCd) {
		this.httpSttusCd = httpSttusCd;
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

}
