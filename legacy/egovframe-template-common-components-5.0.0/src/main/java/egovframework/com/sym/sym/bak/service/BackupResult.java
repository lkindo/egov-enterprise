package egovframework.com.sym.sym.bak.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛깆뾽寃곌낵愿由ъ뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class BackupResult extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -743292072713546949L;
	/**
	 * 諛깆뾽寃곌낵ID
	 */
	private String backupResultId;
	/**
	 * 諛깆뾽?묒뾽ID
	 */
	private String backupOpertId;
	/**
	 * 諛깆뾽?붿씪
	 */
	private String backupFile;
	/**
	 * ?곹깭
	 */
	private String sttus;
	/**
	 * ?ㅽ뻾?쒖옉?쒓컖
	 */
	private String executBeginTime;
	/**
	 * ?ㅽ뻾醫낅즺?쒓컖
	 */
	private String executEndTime;
	/**
	 * 理쒖쥌?섏젙???꾩씠??
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * 理쒖큹?깅줉???꾩씠??
	 */
	private String frstRegisterId;
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm;

	/**
	 * ?먮윭?뺣낫
	 */
	private String errorInfo;

	/**
	 * 諛깆뾽?묒뾽紐?
	 */
	private String backupOpertNm;
	/**
	 * ?곹깭紐?
	 */
	private String sttusNm;
	/**
	 * 諛깆뾽?먮낯?붾젆?좊━
	 */
	private String backupOrginlDrctry;
	/**
	 * 諛깆뾽??λ뵒?됲넗由?
	 */
	private String backupStreDrctry;
	/**
	 * @return the backupResultId
	 */
	public String getBackupResultId() {
		return backupResultId;
	}
	/**
	 * @return the backupOpertId
	 */
	public String getBackupOpertId() {
		return backupOpertId;
	}
	/**
	 * @return the backupFile
	 */
	public String getBackupFile() {
		return backupFile;
	}
	/**
	 * @return the sttus
	 */
	public String getSttus() {
		return sttus;
	}
	/**
	 * @return the executBeginTime
	 */
	public String getExecutBeginTime() {
		return executBeginTime;
	}
	/**
	 * @return the executEndTime
	 */
	public String getExecutEndTime() {
		return executEndTime;
	}
	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	/**
	 * @return the errorInfo
	 */
	public String getErrorInfo() {
		return errorInfo;
	}
	/**
	 * @return the backupOpertNm
	 */
	public String getBackupOpertNm() {
		return backupOpertNm;
	}
	/**
	 * @return the sttusNm
	 */
	public String getSttusNm() {
		return sttusNm;
	}
	/**
	 * @return the backupOrginlDrctry
	 */
	public String getBackupOrginlDrctry() {
		return backupOrginlDrctry;
	}
	/**
	 * @return the backupStreDrctry
	 */
	public String getBackupStreDrctry() {
		return backupStreDrctry;
	}
	/**
	 * @param backupResultId the backupResultId to set
	 */
	public void setBackupResultId(String backupResultId) {
		this.backupResultId = backupResultId;
	}
	/**
	 * @param backupOpertId the backupOpertId to set
	 */
	public void setBackupOpertId(String backupOpertId) {
		this.backupOpertId = backupOpertId;
	}
	/**
	 * @param backupFile the backupFile to set
	 */
	public void setBackupFile(String backupFile) {
		this.backupFile = backupFile;
	}
	/**
	 * @param sttus the sttus to set
	 */
	public void setSttus(String sttus) {
		this.sttus = sttus;
	}
	/**
	 * @param executBeginTime the executBeginTime to set
	 */
	public void setExecutBeginTime(String executBeginTime) {
		this.executBeginTime = executBeginTime;
	}
	/**
	 * @param executEndTime the executEndTime to set
	 */
	public void setExecutEndTime(String executEndTime) {
		this.executEndTime = executEndTime;
	}
	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	/**
	 * @param errorInfo the errorInfo to set
	 */
	public void setErrorInfo(String errorInfo) {
		this.errorInfo = errorInfo;
	}
	/**
	 * @param backupOpertNm the backupOpertNm to set
	 */
	public void setBackupOpertNm(String backupOpertNm) {
		this.backupOpertNm = backupOpertNm;
	}
	/**
	 * @param sttusNm the sttusNm to set
	 */
	public void setSttusNm(String sttusNm) {
		this.sttusNm = sttusNm;
	}
	/**
	 * @param backupOrginlDrctry the backupOrginlDrctry to set
	 */
	public void setBackupOrginlDrctry(String backupOrginlDrctry) {
		this.backupOrginlDrctry = backupOrginlDrctry;
	}
	/**
	 * @param backupStreDrctry the backupStreDrctry to set
	 */
	public void setBackupStreDrctry(String backupStreDrctry) {
		this.backupStreDrctry = backupStreDrctry;
	}


}