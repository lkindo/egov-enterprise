package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 遺?쒖뾽臾댁뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 遺?쒖뾽臾댄븿ID, 遺?쒖뾽臾퀹D, 遺?쒖뾽臾대챸, 遺?쒖뾽臾대궡?? ?낅Т?대떦?? ?곗꽑?쒖쐞, 泥⑤??뚯씪ID ????ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:04
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class DeptJob implements Serializable{

	/** 遺?쒖뾽臾댄븿 ID */
	private String deptJobBxId;
	/** 遺?쒖뾽臾댄븿紐?*/
	private String deptJobBxNm;
	/** 遺??ID */
	private String deptId;
	/** 遺?쒕챸 */
	private String deptNm;
	/** 遺?쒖뾽臾?ID */
	private String deptJobId;
	/** 遺?쒖뾽臾대챸 */
	private String deptJobNm;
	/** 遺?쒖뾽臾대궡??*/
	private String deptJobCn;
	/** ?낅Т?대떦??ID */
	private String chargerId;
	/** ?낅Т?대떦?먮챸 */
	private String chargerNm;
	/** ?곗꽑?쒖쐞 */
	private String priort;
	/** 泥⑤??뚯씪 ID */
	private String atchFileId;
	/** 理쒖큹?깅줉??ID */
	private String frstRegisterId = "";
	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";
	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId = "";
	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";
	
	public String getDeptJobBxId() {
		return deptJobBxId;
	}
	public void setDeptJobBxId(String deptJobBxId) {
		this.deptJobBxId = deptJobBxId;
	}
	public String getDeptJobBxNm() {
		return deptJobBxNm;
	}
	public void setDeptJobBxNm(String deptJobBxNm) {
		this.deptJobBxNm = deptJobBxNm;
	}
	public String getDeptId() {
		return deptId;
	}
	public void setDeptId(String deptId) {
		this.deptId = deptId;
	}
	public String getDeptNm() {
		return deptNm;
	}
	public void setDeptNm(String deptNm) {
		this.deptNm = deptNm;
	}
	public String getDeptJobId() {
		return deptJobId;
	}
	public void setDeptJobId(String deptJobId) {
		this.deptJobId = deptJobId;
	}
	public String getDeptJobNm() {
		return deptJobNm;
	}
	public void setDeptJobNm(String deptJobNm) {
		this.deptJobNm = deptJobNm;
	}
	public String getDeptJobCn() {
		return deptJobCn;
	}
	public void setDeptJobCn(String deptJobCn) {
		this.deptJobCn = deptJobCn;
	}
	public String getChargerId() {
		return chargerId;
	}
	public void setChargerId(String chargerId) {
		this.chargerId = chargerId;
	}
	public String getChargerNm() {
		return chargerNm;
	}
	public void setChargerNm(String chargerNm) {
		this.chargerNm = chargerNm;
	}
	public String getPriort() {
		return priort;
	}
	public void setPriort(String priort) {
		this.priort = priort;
	}
	public String getAtchFileId() {
		return atchFileId;
	}
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
	}
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	
	
	
}
