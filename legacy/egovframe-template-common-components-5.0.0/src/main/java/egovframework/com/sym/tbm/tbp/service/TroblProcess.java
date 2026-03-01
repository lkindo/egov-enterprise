package egovframework.com.sym.tbm.tbp.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?μ븷泥섎━寃곌낵?뺣낫?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?μ븷愿由ъ쓽 ?μ븷ID, ?μ븷紐? ?μ븷醫낅쪟, ?μ븷?ㅻ챸, ?μ븷諛쒖깮?쒓컙, ?μ븷?붿껌?먮챸, ?μ븷?붿껌?쒓컙, ?μ븷泥섎━寃곌낵, ?μ븷泥섎━?먮챸, ?μ븷泥섎━?쒓컙,
 * 泥섎━?곹깭 ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:57
 */
public class TroblProcess extends ComDefaultVO {

	private static final long serialVersionUID = 1L;
	/**
	 * ?μ븷 ID
	 */
	private String troblId;
	/**
	 * ?μ븷 紐?
	 */
	private String troblNm;
	/**
	 * ?μ븷 醫낅쪟
	 */
	private String troblKnd;
	/**
	 * ?μ븷 醫낅쪟 紐?
	 */
	private String troblKndNm;	
	/**
	 * ?μ븷 ?ㅻ챸
	 */
	private String troblDc;
	/**
	 * ?μ븷 諛쒖깮 ?쒓컙
	 */
	private String troblOccrrncTime;
	/**
	 * ?μ븷 ?붿껌??紐?
	 */
	private String troblRqesterNm;
	/**
	 * ?μ븷 ?붿껌 ?쒓컙
	 */
	private String troblRequstTime;
	/**
	 * ?μ븷 泥섎━ 寃곌낵
	 */
	private String troblProcessResult;
	/**
	 * ?μ븷 泥섎━??紐?
	 */
	private String troblOpetrNm;
	/**
	 * ?μ븷 泥섎━ ?쒓컙
	 */
	private String troblProcessTime;
	/**
	 * 泥섎━ ?곹깭
	 */
	private String processSttus;
	/**
	 * 泥섎━ ?곹깭紐?
	 */
	private String processSttusNm;	
    /**
	 * 理쒖큹?깅줉?쒖젏
	 */   
    private String frstRegisterPnttm;
    /**
	 * 理쒖큹?깅줉?륤D
	 */        
    private String frstRegisterId;	
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId;

	/**
	 * @return the troblId
	 */
	public String getTroblId() {
		return troblId;
	}
	/**
	 * @param troblId the troblId to set
	 */
	public void setTroblId(String troblId) {
		this.troblId = troblId;
	}
	/**
	 * @return the troblNm
	 */
	public String getTroblNm() {
		return troblNm;
	}
	/**
	 * @param troblNm the troblNm to set
	 */
	public void setTroblNm(String troblNm) {
		this.troblNm = troblNm;
	}
	/**
	 * @return the troblKnd
	 */
	public String getTroblKnd() {
		return troblKnd;
	}
	/**
	 * @param troblKnd the troblKnd to set
	 */
	public void setTroblKnd(String troblKnd) {
		this.troblKnd = troblKnd;
	}
	/**
	 * @return the troblKndNm
	 */
	public String getTroblKndNm() {
		return troblKndNm;
	}
	/**
	 * @param troblKndNm the troblKndNm to set
	 */
	public void setTroblKndNm(String troblKndNm) {
		this.troblKndNm = troblKndNm;
	}
	/**
	 * @return the troblDc
	 */
	public String getTroblDc() {
		return troblDc;
	}
	/**
	 * @param troblDc the troblDc to set
	 */
	public void setTroblDc(String troblDc) {
		this.troblDc = troblDc;
	}
	/**
	 * @return the troblOccrrncTime
	 */
	public String getTroblOccrrncTime() {
		return troblOccrrncTime;
	}
	/**
	 * @param troblOccrrncTime the troblOccrrncTime to set
	 */
	public void setTroblOccrrncTime(String troblOccrrncTime) {
		this.troblOccrrncTime = troblOccrrncTime;
	}
	/**
	 * @return the troblRqesterNm
	 */
	public String getTroblRqesterNm() {
		return troblRqesterNm;
	}
	/**
	 * @param troblRqesterNm the troblRqesterNm to set
	 */
	public void setTroblRqesterNm(String troblRqesterNm) {
		this.troblRqesterNm = troblRqesterNm;
	}
	/**
	 * @return the troblRequstTime
	 */
	public String getTroblRequstTime() {
		return troblRequstTime;
	}
	/**
	 * @param troblRequstTime the troblRequstTime to set
	 */
	public void setTroblRequstTime(String troblRequstTime) {
		this.troblRequstTime = troblRequstTime;
	}
	/**
	 * @return the troblProcessResult
	 */
	public String getTroblProcessResult() {
		return troblProcessResult;
	}
	/**
	 * @param troblProcessResult the troblProcessResult to set
	 */
	public void setTroblProcessResult(String troblProcessResult) {
		this.troblProcessResult = troblProcessResult;
	}
	/**
	 * @return the troblOpetrNm
	 */
	public String getTroblOpetrNm() {
		return troblOpetrNm;
	}
	/**
	 * @param troblOpetrNm the troblOpetrNm to set
	 */
	public void setTroblOpetrNm(String troblOpetrNm) {
		this.troblOpetrNm = troblOpetrNm;
	}
	/**
	 * @return the troblProcessTime
	 */
	public String getTroblProcessTime() {
		return troblProcessTime;
	}
	/**
	 * @param troblProcessTime the troblProcessTime to set
	 */
	public void setTroblProcessTime(String troblProcessTime) {
		this.troblProcessTime = troblProcessTime;
	}
	/**
	 * @return the processSttus
	 */
	public String getProcessSttus() {
		return processSttus;
	}
	/**
	 * @param processSttus the processSttus to set
	 */
	public void setProcessSttus(String processSttus) {
		this.processSttus = processSttus;
	}
	/**
	 * @return the processSttusNm
	 */
	public String getProcessSttusNm() {
		return processSttusNm;
	}
	/**
	 * @param processSttusNm the processSttusNm to set
	 */
	public void setProcessSttusNm(String processSttusNm) {
		this.processSttusNm = processSttusNm;
	}
	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
}
