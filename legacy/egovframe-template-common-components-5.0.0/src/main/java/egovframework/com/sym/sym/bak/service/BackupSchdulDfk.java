package egovframework.com.sym.sym.bak.service;

import java.io.Serializable;

/**
 * 諛깆뾽?ㅼ?以꾩슂?쇱뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @version 1.0
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.09.01   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class BackupSchdulDfk implements Serializable {

	private static final long serialVersionUID = -6208617298024325398L;

	/**
	 * 諛깆뾽?묒뾽ID
	 */
	private String backupOpertId;

	/**
	 * ?ㅽ뻾?ㅼ?以꾩슂??
	 */
	private String executSchdulDfkSe;

	/**
	 * ?ㅽ뻾?ㅼ?以꾩슂?쇰챸
	 */
	private String executSchdulDfkSeNm;


	/**
	 * @return the backupOpertId
	 */
	public String getBackupOpertId() {
		return backupOpertId;
	}
	/**
	 * @return the executSchdulDfkSe
	 */
	public String getExecutSchdulDfkSe() {
		return executSchdulDfkSe;
	}
	/**
	 * @param backupOpertId the backupOpertId to set
	 */
	public void setBackupOpertId(String backupOpertId) {
		this.backupOpertId = backupOpertId;
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