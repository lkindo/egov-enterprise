package egovframework.com.uss.ion.ism.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?쎌떇寃곗옱愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쎌떇寃곗옱ID, ?낅Т援щ텇肄붾뱶, ?낅Т援щ텇紐? ?곌퀎URL, ?좎껌?륤D, ?좎껌?먮챸, ?좎껌?쇱옄, 寃곗옱?륤D, 寃곗옱?먮챸, 寃곗옱?먯냼?? ?뱀씤?щ?, 寃곗옱?쇱떆, 諛섎젮?ъ쑀 ????ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:29:26
 */
@SuppressWarnings("serial")
public class InfrmlSanctn implements Serializable {
	/**
	 * ?쎌떇寃곗옱ID
	 */
	private String infrmlSanctnId;
	/**
	 * ?낅Т援щ텇肄붾뱶
	 */
	private String jobSeCode;
	/**
	 * ?낅Т援щ텇紐?
	 */
	private String jobSeNm;
	/**
	 * ?좎껌?륤D
	 */
	private String applcntId;
	/**
	 * ?좎껌?먮챸
	 */
	private String applcntNm;
	/**
	 * ?좎껌?쇱옄
	 */
	private String reqstDe = "";
	/**
	 * 寃곗옱?륤D
	 */
	private String sanctnerId;
	/**
	 * 寃곗옱?먮챸
	 */
	private String sanctnerNm;
	/**
	 * 寃곗옱?먯냼??
	 */
	private String sanctnerOrgnztNm;
	/**
	 * ?뱀씤?щ?
	 */
	private String confmAt = "";
	/**
	 * 寃곗옱?쇱떆
	 */
	private String sanctnDt = "";
	/**
	 * 諛섎젮?ъ쑀
	 */
	private String returnResn = "";
	/**
	 * 理쒖큹?깅줉??ID
	 */
	private String frstRegisterId = "";
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";
	/**
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId = "";
	/**
	 * 理쒖쥌?섏젙?먮챸
	 */
	private String lastUpdusrNm = "";
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm = "";
	
	public String getInfrmlSanctnId() {
		return infrmlSanctnId;
	}
	public void setInfrmlSanctnId(String infrmlSanctnId) {
		this.infrmlSanctnId = infrmlSanctnId;
	}
	public String getJobSeCode() {
		return jobSeCode;
	}
	public void setJobSeCode(String jobSeCode) {
		this.jobSeCode = jobSeCode;
	}
	public String getJobSeNm() {
		return jobSeNm;
	}
	public void setJobSeNm(String jobSeNm) {
		this.jobSeNm = jobSeNm;
	}
	public String getApplcntId() {
		return applcntId;
	}
	public void setApplcntId(String applcntId) {
		this.applcntId = applcntId;
	}
	public String getApplcntNm() {
		return applcntNm;
	}
	public void setApplcntNm(String applcntNm) {
		this.applcntNm = applcntNm;
	}
	public String getReqstDe() {
		return reqstDe;
	}
	public void setReqstDe(String reqstDe) {
		this.reqstDe = reqstDe;
	}
	public String getSanctnerId() {
		return sanctnerId;
	}
	public void setSanctnerId(String sanctnerId) {
		this.sanctnerId = sanctnerId;
	}
	public String getSanctnerNm() {
		return sanctnerNm;
	}
	public void setSanctnerNm(String sanctnerNm) {
		this.sanctnerNm = sanctnerNm;
	}
	public String getSanctnerOrgnztNm() {
		return sanctnerOrgnztNm;
	}
	public void setSanctnerOrgnztNm(String sanctnerOrgnztNm) {
		this.sanctnerOrgnztNm = sanctnerOrgnztNm;
	}
	public String getConfmAt() {
		return confmAt;
	}
	public void setConfmAt(String confmAt) {
		this.confmAt = confmAt;
	}
	public String getSanctnDt() {
		return sanctnDt;
	}
	public void setSanctnDt(String sanctnDt) {
		this.sanctnDt = sanctnDt;
	}
	public String getReturnResn() {
		return returnResn;
	}
	public void setReturnResn(String returnResn) {
		this.returnResn = returnResn;
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