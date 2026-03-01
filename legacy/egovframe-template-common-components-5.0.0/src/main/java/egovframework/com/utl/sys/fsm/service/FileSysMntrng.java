package egovframework.com.utl.sys.fsm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪?쏧D, ?뚯씪?쒖뒪?쒕챸, ?뚯씪?쒖뒪?쒓?由щ챸, ?뚯씪?쒖뒪?쒗겕湲? ?뚯씪?쒖뒪?쒖엫怨꾩튂, ?뚯씪?쒖뒪?쒖엫怨꾩쑉, ?뚯씪?쒖뒪?쒖궗?⑸웾, ?뚯씪?쒖뒪?쒖궗?⑸쪧, 愿由ъ옄紐? 愿由ъ옄?대찓?쇱＜?? ?쒕퉬?ㅼ긽?? ?앹꽦?쇱떆 ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
@SuppressWarnings("serial")
public class FileSysMntrng implements Serializable  {

	/**
	 * ?뚯씪?쒖뒪?쏧D
	 */
	private String fileSysId;
	/**
	 * ?뚯씪?쒖뒪?쒕챸
	 */
	private String fileSysNm;
	/**
	 * ?뚯씪?쒖뒪?쒓?由щ챸
	 */
	private String fileSysManageNm;
	/**
	 * ?뚯씪?쒖뒪?쒗겕湲?
	 */
	private int fileSysMg;
	/**
	 * ?뚯씪?쒖뒪?쒖엫怨꾩튂
	 */
	private int fileSysThrhld;
	/**
	 * ?뚯씪?쒖뒪?쒖엫怨꾩튂??
	 */
	private int fileSysThrhldRt;
	/**
	 * ?뚯씪?쒖뒪?쒖궗?⑸웾
	 */
	private int fileSysUsgQty;
	/**
	 * ?뚯씪?쒖뒪?쒖궗?⑸쪧
	 */
	private double fileSysUsgRt;
	/**
	 * 愿由ъ옄紐?
	 */
	private String mngrNm;
	/**
	 * 愿由ъ옄?대찓?쇱＜??
	 */
	private String mngrEmailAddr;
	/**
	 * 濡쒓렇?뺣낫
	 */
	private String logInfo;
	/**
	 * 紐⑤땲?곕쭅?곹깭
	 */
	private String mntrngSttus;
	/**
	 * ?앹꽦?쇱떆
	 */
	private String creatDt;
	/**
	 * 理쒖큹?깅줉?륤D
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
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm = "";

	public String getFileSysId() {
		return fileSysId;
	}
	public void setFileSysId(String fileSysId) {
		this.fileSysId = fileSysId;
	}
	public String getFileSysNm() {
		return fileSysNm;
	}
	public void setFileSysNm(String fileSysNm) {
		this.fileSysNm = fileSysNm;
	}
	public String getFileSysManageNm() {
		return fileSysManageNm;
	}
	public void setFileSysManageNm(String fileSysManageNm) {
		this.fileSysManageNm = fileSysManageNm;
	}
	public int getFileSysMg() {
		return fileSysMg;
	}
	public void setFileSysMg(int fileSysMg) {
		this.fileSysMg = fileSysMg;
	}
	public int getFileSysThrhld() {
		return fileSysThrhld;
	}
	public void setFileSysThrhld(int fileSysThrhld) {
		this.fileSysThrhld = fileSysThrhld;
	}
	public int getFileSysThrhldRt() {
		return fileSysThrhldRt;
	}
	public void setFileSysThrhldRt(int fileSysThrhldRt) {
		this.fileSysThrhldRt = fileSysThrhldRt;
	}
	public int getFileSysUsgQty() {
		return fileSysUsgQty;
	}
	public void setFileSysUsgQty(int fileSysUsgQty) {
		this.fileSysUsgQty = fileSysUsgQty;
	}
	public double getFileSysUsgRt() {
		return fileSysUsgRt;
	}
	public void setFileSysUsgRt(double fileSysUsgRt) {
		this.fileSysUsgRt = fileSysUsgRt;
	}
	public String getMngrNm() {
		return mngrNm;
	}
	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}
	public String getLogInfo() {
		return logInfo;
	}
	public void setLogInfo(String logInfo) {
		this.logInfo = logInfo;
	}
	public String getMntrngSttus() {
		return mntrngSttus;
	}
	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
	}
	public String getCreatDt() {
		return creatDt;
	}
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
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
