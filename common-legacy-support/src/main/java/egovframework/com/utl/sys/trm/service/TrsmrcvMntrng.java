package egovframework.com.utl.sys.trm.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??????? ????model ?????
 *
 * @author ?
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.21   ?    ????
 *      </pre>
 **/
public class TrsmrcvMntrng extends ComDefaultVO {

	private static final long serialVersionUID = -9022466623533825526L;
	/**
	 * ?D
	 **/
	private String cntcId;
	/**
	 * ???????
	 **/
	private String testClassNm;
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
	 * ????
	 **/
	private String creatDt;

	/**
	 * ??
	 **/
	private String cntcNm;
	/**
	 * ????
	 **/
	private String provdInsttNm;
	/**
	 * ??????
	 **/
	private String provdSysNm;
	/**
	 * ??????
	 **/
	private String provdSvcNm;
	/**
	 * ???
	 **/
	private String requstInsttNm;
	/**
	 * ?????
	 **/
	private String requstSysNm;
	/**
	 * ????
	 **/
	private String mntrngSttusNm;

	/**
	 * @return the cntcId
	 **/
	public String getCntcId() {
		return cntcId;
	}

	/**
	 * @return the testClassNm
	 **/
	public String getTestClassNm() {
		return testClassNm;
	}

	/**
	 * @return the mngrNm
	 **/
	public String getMngrNm() {
		return mngrNm;
	}

	/**
	 * @return the mngrEmailAddr
	 **/
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}

	/**
	 * @return the mntrngSttus
	 **/
	public String getMntrngSttus() {
		return mntrngSttus;
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
	 * @return the cntcNm
	 **/
	public String getCntcNm() {
		return cntcNm;
	}

	/**
	 * @return the provdInsttNm
	 **/
	public String getProvdInsttNm() {
		return provdInsttNm;
	}

	/**
	 * @return the provdSysNm
	 **/
	public String getProvdSysNm() {
		return provdSysNm;
	}

	/**
	 * @return the provdSvcNm
	 **/
	public String getProvdSvcNm() {
		return provdSvcNm;
	}

	/**
	 * @return the requstInsttNm
	 **/
	public String getRequstInsttNm() {
		return requstInsttNm;
	}

	/**
	 * @return the requstSysNm
	 **/
	public String getRequstSysNm() {
		return requstSysNm;
	}

	/**
	 * @return the mntrngSttusNm
	 **/
	public String getMntrngSttusNm() {
		return mntrngSttusNm;
	}

	/**
	 * @param cntcId the cntcId to set
	 **/
	public void setCntcId(String cntcId) {
		this.cntcId = cntcId;
	}

	/**
	 * @param testClassNm the testClassNm to set
	 **/
	public void setTestClassNm(String testClassNm) {
		this.testClassNm = testClassNm;
	}

	/**
	 * @param mngrNm the mngrNm to set
	 **/
	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}

	/**
	 * @param mngrEmailAddr the mngrEmailAddr to set
	 **/
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}

	/**
	 * @param mntrngSttus the mntrngSttus to set
	 **/
	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
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
	 * @param cntcNm the cntcNm to set
	 **/
	public void setCntcNm(String cntcNm) {
		this.cntcNm = cntcNm;
	}

	/**
	 * @param provdInsttNm the provdInsttNm to set
	 **/
	public void setProvdInsttNm(String provdInsttNm) {
		this.provdInsttNm = provdInsttNm;
	}

	/**
	 * @param provdSysNm the provdSysNm to set
	 **/
	public void setProvdSysNm(String provdSysNm) {
		this.provdSysNm = provdSysNm;
	}

	/**
	 * @param provdSvcNm the provdSvcNm to set
	 **/
	public void setProvdSvcNm(String provdSvcNm) {
		this.provdSvcNm = provdSvcNm;
	}

	/**
	 * @param requstInsttNm the requstInsttNm to set
	 **/
	public void setRequstInsttNm(String requstInsttNm) {
		this.requstInsttNm = requstInsttNm;
	}

	/**
	 * @param requstSysNm the requstSysNm to set
	 **/
	public void setRequstSysNm(String requstSysNm) {
		this.requstSysNm = requstSysNm;
	}

	/**
	 * @param mntrngSttusNm the mntrngSttusNm to set
	 **/
	public void setMntrngSttusNm(String mntrngSttusNm) {
		this.mntrngSttusNm = mntrngSttusNm;
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

}
