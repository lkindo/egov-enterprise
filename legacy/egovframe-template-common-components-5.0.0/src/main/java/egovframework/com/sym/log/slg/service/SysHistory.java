package egovframework.com.sym.log.slg.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;


/**
 * @Class Name  : SysHistory.java
 * @Description : ?쒖뒪??泥섎━ ?대젰愿由щ? ?꾪븳 ?곗씠??泥섎━ 紐⑤뜽
 * @Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *   2009.03.06       ?댁궪??                 理쒖큹 ?앹꽦
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 03. 06
 * @version 1.0
 * @see
 *
 */
public class SysHistory implements Serializable {

	private static final long serialVersionUID = 2790964197430747133L;
	/**
	 * ?앹꽦?쇱떆
	 */
	private String histId = "";
	/**
	 * 理쒖큹?깅줉?먯븘?대뵒
	 *
	 */
	private String frstRegisterId = "";
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";
	/**
	 * ?대젰?댁슜
	 */
	private String histCn = "";
	/**
	 * ?대젰援щ텇肄붾뱶
	 */
	private String histSeCode = "";
	/**
	 * 理쒖쥌?섏젙?먯븘?대뵒
	 */
	private String lastUpdusrId = "";
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm = "";
	/**
	 * ?쒖뒪?쒕챸
	 */
	private String sysNm = "";
	/**
	 * 泥⑤??뚯씪ID
	 */
	private String atchFileId = "";
	/**
	 * @return the creatDt
	 */
	public String getHistId() {
		return histId;
	}
	/**
	 * @param creatDt the creatDt to set
	 */
	public void setHistId(String histId) {
		this.histId = histId;
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
	 * @return the histCn
	 */
	public String getHistCn() {
		return histCn;
	}
	/**
	 * @param histCn the histCn to set
	 */
	public void setHistCn(String histCn) {
		this.histCn = histCn;
	}
	/**
	 * @return the histSeCode
	 */
	public String getHistSeCode() {
		return histSeCode;
	}
	/**
	 * @param histSeCode the histSeCode to set
	 */
	public void setHistSeCode(String histSeCode) {
		this.histSeCode = histSeCode;
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
	 * @return the sysNm
	 */
	public String getSysNm() {
		return sysNm;
	}
	/**
	 * @param sysNm the sysNm to set
	 */
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
	 */
	@Override
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}

}
