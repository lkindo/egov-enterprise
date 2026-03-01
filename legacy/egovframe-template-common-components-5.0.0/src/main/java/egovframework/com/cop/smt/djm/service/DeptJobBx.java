package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 遺?쒖뾽臾댄븿?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 遺?쒖뾽臾댄븿ID, 遺?쒖뾽臾댄븿紐? 遺?쏧D, ?쒖떆?쒖꽌 ????ぉ??愿由ы븳??
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
public class DeptJobBx implements Serializable{

	/** 遺?쒖뾽臾댄븿 ID */
	private String deptJobBxId;
	/** 遺?쒖뾽臾댄븿紐?*/
	private String deptJobBxNm;
	/** 遺??ID */
	private String deptId;
	/** 遺?쒕챸 */
	private String deptNm;
	/** ?쒖떆?쒖꽌 */
	private int indictOrdr;
	/** 理쒖큹?깅줉??ID */
	private String frstRegisterId = "";
	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";
	/** 理쒖쥌?섏젙??ID */
	private String lastUpdusrId = "";
	/** 理쒖쥌?섏젙?먮챸 */
	private String lastUpdusrNm = "";
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
	public int getIndictOrdr() {
		return indictOrdr;
	}
	public void setIndictOrdr(int indictOrdr) {
		this.indictOrdr = indictOrdr;
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
	public String getLastUpdusrNm() {
		return lastUpdusrNm;
	}
	public void setLastUpdusrNm(String lastUpdusrNm) {
		this.lastUpdusrNm = lastUpdusrNm;
	}
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	
	
	
}
