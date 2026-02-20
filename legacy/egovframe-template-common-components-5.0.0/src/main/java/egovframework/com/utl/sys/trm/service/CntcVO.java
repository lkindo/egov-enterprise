package egovframework.com.utl.sys.trm.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?곌퀎?뺣낫?????VO ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.21   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class CntcVO extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -4961144967939216693L;
	/**
	 * ?곌퀎ID
	 */
	private String cntcId;
	/**
	 * ?곌퀎紐?
	 */
	private String cntcNm;
	/**
	 * ?쒓났湲곌?紐?
	 */
	private String provdInsttNm;
	/**
	 * ?쒓났?쒖뒪?쒕챸
	 */
	private String provdSysNm;
	/**
	 * ?쒓났?쒕퉬?ㅻ챸
	 */
	private String provdSvcNm;
	/**
	 * ?붿껌湲곌?紐?
	 */
	private String requstInsttNm;
	/**
	 * ?붿껌?쒖뒪?쒕챸
	 */
	private String requstSysNm;
	/**
	 * @return the cntcId
	 */
	public String getCntcId() {
		return cntcId;
	}
	/**
	 * @return the cntcNm
	 */
	public String getCntcNm() {
		return cntcNm;
	}
	/**
	 * @return the provdInsttNm
	 */
	public String getProvdInsttNm() {
		return provdInsttNm;
	}
	/**
	 * @return the provdSysNm
	 */
	public String getProvdSysNm() {
		return provdSysNm;
	}
	/**
	 * @return the provdSvcNm
	 */
	public String getProvdSvcNm() {
		return provdSvcNm;
	}
	/**
	 * @return the requstInsttNm
	 */
	public String getRequstInsttNm() {
		return requstInsttNm;
	}
	/**
	 * @return the requstSysNm
	 */
	public String getRequstSysNm() {
		return requstSysNm;
	}
	/**
	 * @param cntcId the cntcId to set
	 */
	public void setCntcId(String cntcId) {
		this.cntcId = cntcId;
	}
	/**
	 * @param cntcNm the cntcNm to set
	 */
	public void setCntcNm(String cntcNm) {
		this.cntcNm = cntcNm;
	}
	/**
	 * @param provdInsttNm the provdInsttNm to set
	 */
	public void setProvdInsttNm(String provdInsttNm) {
		this.provdInsttNm = provdInsttNm;
	}
	/**
	 * @param provdSysNm the provdSysNm to set
	 */
	public void setProvdSysNm(String provdSysNm) {
		this.provdSysNm = provdSysNm;
	}
	/**
	 * @param provdSvcNm the provdSvcNm to set
	 */
	public void setProvdSvcNm(String provdSvcNm) {
		this.provdSvcNm = provdSvcNm;
	}
	/**
	 * @param requstInsttNm the requstInsttNm to set
	 */
	public void setRequstInsttNm(String requstInsttNm) {
		this.requstInsttNm = requstInsttNm;
	}
	/**
	 * @param requstSysNm the requstSysNm to set
	 */
	public void setRequstSysNm(String requstSysNm) {
		this.requstSysNm = requstSysNm;
	}
}