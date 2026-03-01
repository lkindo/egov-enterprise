package egovframework.com.cop.smt.lsm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 媛꾨??곹깭?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 媛꾨?ID, 媛꾨??곹깭 ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:06
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 *  */
@SuppressWarnings("serial")
public class LeaderSttus  implements Serializable{

	/** 媛꾨?ID */
	private String leaderId;
	/** 媛꾨?紐?*/
	private String leaderNm;
	/** ?뚯냽 */
	private String orgnztNm;
	/** 媛꾨??곹깭 */
	private String leaderSttus;
	/** 媛꾨??곹깭 */
	private String leaderSttusNm;
	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";
	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";
	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId = "";
	/** 理쒖쥌?섏젙?먮챸 */
	private String lastUpdusrNm = "";
	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";
	public String getLeaderId() {
		return leaderId;
	}
	public void setLeaderId(String leaderId) {
		this.leaderId = leaderId;
	}
	public String getLeaderNm() {
		return leaderNm;
	}
	public void setLeaderNm(String leaderNm) {
		this.leaderNm = leaderNm;
	}
	public String getOrgnztNm() {
		return orgnztNm;
	}
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	public String getLeaderSttus() {
		return leaderSttus;
	}
	public void setLeaderSttus(String leaderSttus) {
		this.leaderSttus = leaderSttus;
	}
	public String getLeaderSttusNm() {
		return leaderSttusNm;
	}
	public void setLeaderSttusNm(String leaderSttusNm) {
		this.leaderSttusNm = leaderSttusNm;
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
