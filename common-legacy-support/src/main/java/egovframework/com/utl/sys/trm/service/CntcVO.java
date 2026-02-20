package egovframework.com.utl.sys.trm.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ????????VO ?????
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
public class CntcVO extends ComDefaultVO {

	private static final long serialVersionUID = -4961144967939216693L;
	/**
	 * ?D
	 **/
	private String cntcId;
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
	 * @return the cntcId
	 **/
	public String getCntcId() {
		return cntcId;
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
	 * @param cntcId the cntcId to set
	 **/
	public void setCntcId(String cntcId) {
		this.cntcId = cntcId;
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
}
