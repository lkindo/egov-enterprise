package egovframework.com.utl.sys.fsm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 濡쒓렇?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 濡쒓렇ID, ?뚯씪?쒖뒪?쏧D, ?뚯씪?쒖뒪?쒕챸, ?뚯씪?쒖뒪?쒓?由щ챸, ?뚯씪?쒖뒪?쒗겕湲? ?뚯씪?쒖뒪?쒖엫怨꾩튂, ?뚯씪?쒖뒪?쒖엫怨꾩튂?? ?뚯씪?쒖뒪?쒖궗?⑸웾, ?뚯씪?쒖뒪?쒖궗?⑸쪧, ?쒕퉬?ㅼ긽?? 濡쒓렇?뺣낫, ?앹꽦?쇱떆 ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
@SuppressWarnings("serial")
public class FileSysMntrngLog implements Serializable  {
	/**
	 * 濡쒓렇ID
	 */
	private String logId;
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
	 * 紐⑤땲?곕쭅?곹깭
	 */
	private String mntrngSttus;
	/**
	 * 濡쒓렇?뺣낫
	 */
	private String logInfo;
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
	/**
	 * 濡쒓렇 ID 諛섑솚
	 */
	public String getLogId() {
		return logId;
	}

	/**
	 * 濡쒓렇 ID ?ㅼ젙
	 */
	public void setLogId(String logId) {
		this.logId = logId;
	}

	/**
	 * ?뚯씪 ?쒖뒪??ID 諛섑솚
	 */
	public String getFileSysId() {
		return fileSysId;
	}

	/**
	 * ?뚯씪 ?쒖뒪??ID ?ㅼ젙
	 */
	public void setFileSysId(String fileSysId) {
		this.fileSysId = fileSysId;
	}

	/**
	 * ?뚯씪 ?쒖뒪???대쫫 諛섑솚
	 */
	public String getFileSysNm() {
		return fileSysNm;
	}

	/**
	 * ?뚯씪 ?쒖뒪???대쫫 ?ㅼ젙
	 */
	public void setFileSysNm(String fileSysNm) {
		this.fileSysNm = fileSysNm;
	}

	/**
	 * ?뚯씪 ?쒖뒪??愿由??대쫫 諛섑솚
	 */
	public String getFileSysManageNm() {
		return fileSysManageNm;
	}

	/**
	 * ?뚯씪 ?쒖뒪??愿由??대쫫 ?ㅼ젙
	 */
	public void setFileSysManageNm(String fileSysManageNm) {
		this.fileSysManageNm = fileSysManageNm;
	}

	/**
	 * ?뚯씪 ?쒖뒪???ш린 諛섑솚
	 */
	public int getFileSysMg() {
		return fileSysMg;
	}

	/**
	 * ?뚯씪 ?쒖뒪???ш린 ?ㅼ젙
	 */
	public void setFileSysMg(int fileSysMg) {
		this.fileSysMg = fileSysMg;
	}

	/**
	 * ?뚯씪 ?쒖뒪???꾧퀎媛?諛섑솚
	 */
	public int getFileSysThrhld() {
		return fileSysThrhld;
	}

	/**
	 * ?뚯씪 ?쒖뒪???꾧퀎媛??ㅼ젙
	 */
	public void setFileSysThrhld(int fileSysThrhld) {
		this.fileSysThrhld = fileSysThrhld;
	}

	/**
	 * ?뚯씪 ?쒖뒪???꾧퀎媛?鍮꾩쑉 諛섑솚
	 */
	public int getFileSysThrhldRt() {
		return fileSysThrhldRt;
	}

	/**
	 * ?뚯씪 ?쒖뒪???꾧퀎媛?鍮꾩쑉 ?ㅼ젙
	 */
	public void setFileSysThrhldRt(int fileSysThrhldRt) {
		this.fileSysThrhldRt = fileSysThrhldRt;
	}

	/**
	 * ?뚯씪 ?쒖뒪???ъ슜??諛섑솚
	 */
	public int getFileSysUsgQty() {
		return fileSysUsgQty;
	}

	/**
	 * ?뚯씪 ?쒖뒪???ъ슜???ㅼ젙
	 */
	public void setFileSysUsgQty(int fileSysUsgQty) {
		this.fileSysUsgQty = fileSysUsgQty;
	}

	/**
	 * ?뚯씪 ?쒖뒪???ъ슜瑜?諛섑솚
	 */
	public double getFileSysUsgRt() {
		return fileSysUsgRt;
	}

	/**
	 * ?뚯씪 ?쒖뒪???ъ슜瑜??ㅼ젙
	 */
	public void setFileSysUsgRt(double fileSysUsgRt) {
		this.fileSysUsgRt = fileSysUsgRt;
	}

	/**
	 * 紐⑤땲?곕쭅 ?곹깭 諛섑솚
	 */
	public String getMntrngSttus() {
		return mntrngSttus;
	}

	/**
	 * 紐⑤땲?곕쭅 ?곹깭 ?ㅼ젙
	 */
	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
	}

	/**
	 * 濡쒓렇 ?뺣낫 諛섑솚
	 */
	public String getLogInfo() {
		return logInfo;
	}

	/**
	 * 濡쒓렇 ?뺣낫 ?ㅼ젙
	 */
	public void setLogInfo(String logInfo) {
		this.logInfo = logInfo;
	}

	/**
	 * ?앹꽦 ?좎쭨 諛섑솚
	 */
	public String getCreatDt() {
		return creatDt;
	}

	/**
	 * ?앹꽦 ?좎쭨 ?ㅼ젙
	 */
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}

	/**
	 * 理쒖큹 ?깅줉??ID 諛섑솚
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * 理쒖큹 ?깅줉??ID ?ㅼ젙
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * 理쒖큹 ?깅줉 ?쒖젏 諛섑솚
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * 理쒖큹 ?깅줉 ?쒖젏 ?ㅼ젙
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * 留덉?留??섏젙??ID 諛섑솚
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * 留덉?留??섏젙??ID ?ㅼ젙
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * 留덉?留??섏젙 ?쒖젏 諛섑솚
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * 留덉?留??섏젙 ?쒖젏 ?ㅼ젙
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}


}