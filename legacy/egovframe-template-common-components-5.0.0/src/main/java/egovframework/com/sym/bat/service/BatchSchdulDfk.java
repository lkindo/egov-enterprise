package egovframework.com.sym.bat.service;

import java.io.Serializable;

/**
 * 諛곗튂?ㅼ?以꾩슂?쇱뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @version 1.0
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.08.23   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class BatchSchdulDfk implements Serializable {

	private static final long serialVersionUID = -4152071306992470303L;

	/**
	 * 諛곗튂?ㅼ?以껱D
	 */
	private String batchSchdulId;

	/**
	 * ?ㅽ뻾?ㅼ?以꾩슂??
	 */
	private String executSchdulDfkSe;

	/**
	 * ?ㅽ뻾?ㅼ?以꾩슂?쇰챸
	 */
	private String executSchdulDfkSeNm;


	/**
	 * @return the batchSchdulId
	 */
	public String getBatchSchdulId() {
		return batchSchdulId;
	}
	/**
	 * @return the executSchdulDfkSe
	 */
	public String getExecutSchdulDfkSe() {
		return executSchdulDfkSe;
	}
	/**
	 * @param batchSchdulId the batchSchdulId to set
	 */
	public void setBatchSchdulId(String batchSchdulId) {
		this.batchSchdulId = batchSchdulId;
	}
	/**
	 * @param executSchdulDfkSe the executSchdulDfkSe to set
	 */
	public void setExecutSchdulDfkSe(String executSchdulDfkSe) {
		this.executSchdulDfkSe = executSchdulDfkSe;
	}
	/**
	 * @return the executSchdulDfkSeNm
	 */
	public String getExecutSchdulDfkSeNm() {
		return executSchdulDfkSeNm;
	}
	/**
	 * @param executSchdulDfkSeNm the executSchdulDfkSeNm to set
	 */
	public void setExecutSchdulDfkSeNm(String executSchdulDfkSeNm) {
		this.executSchdulDfkSeNm = executSchdulDfkSeNm;
	}



}
