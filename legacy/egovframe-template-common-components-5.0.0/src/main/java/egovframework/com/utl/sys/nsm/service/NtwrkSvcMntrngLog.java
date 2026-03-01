package egovframework.com.utl.sys.nsm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒖뒪?쏧P, ?쒖뒪?쒗룷?? 濡쒓렇ID, ?쒖뒪?쒕챸, ?쒕퉬?ㅼ긽?? 濡쒓렇?뺣낫, ?앹꽦?쇱떆 ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 */
@SuppressWarnings("serial")
public class NtwrkSvcMntrngLog implements Serializable {

	/**
	 * ?쒖뒪?쏧P
	 */
	private String sysIp;
	/**
	 * ?쒖뒪?쒗룷??
	 */
	private String sysPort;
	/**
	 * 濡쒓렇ID
	 */
	private String logId;
	/**
	 * ?쒖뒪?쒕챸
	 */
	private String sysNm;
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
	 * ?꾩옱 ?쒖뒪??IP瑜?諛섑솚?⑸땲??
	 */
	public String getSysIp() {
		return sysIp;
	}

	/**
	 * ?쒖뒪??IP瑜??ㅼ젙?⑸땲??
	 */
	public void setSysIp(String sysIp) {
		this.sysIp = sysIp;
	}

	/**
	 * ?꾩옱 ?쒖뒪???ы듃瑜?諛섑솚?⑸땲??
	 */
	public String getSysPort() {
		return sysPort;
	}

	/**
	 * ?쒖뒪???ы듃瑜??ㅼ젙?⑸땲??
	 */
	public void setSysPort(String sysPort) {
		this.sysPort = sysPort;
	}

	/**
	 * 濡쒓렇 ID瑜?諛섑솚?⑸땲??
	 */
	public String getLogId() {
		return logId;
	}

	/**
	 * 濡쒓렇 ID瑜??ㅼ젙?⑸땲??
	 */
	public void setLogId(String logId) {
		this.logId = logId;
	}

	/**
	 * ?쒖뒪???대쫫??諛섑솚?⑸땲??
	 */
	public String getSysNm() {
		return sysNm;
	}

	/**
	 * ?쒖뒪???대쫫???ㅼ젙?⑸땲??
	 */
	public void setSysNm(String sysNm) {
		this.sysNm = sysNm;
	}

	/**
	 * 紐⑤땲?곕쭅 ?곹깭瑜?諛섑솚?⑸땲??
	 */
	public String getMntrngSttus() {
		return mntrngSttus;
	}

	/**
	 * 紐⑤땲?곕쭅 ?곹깭瑜??ㅼ젙?⑸땲??
	 */
	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
	}

	/**
	 * 濡쒓렇 ?뺣낫瑜?諛섑솚?⑸땲??
	 */
	public String getLogInfo() {
		return logInfo;
	}

	/**
	 * 濡쒓렇 ?뺣낫瑜??ㅼ젙?⑸땲??
	 */
	public void setLogInfo(String logInfo) {
		this.logInfo = logInfo;
	}

	/**
	 * ?앹꽦 ?좎쭨瑜?諛섑솚?⑸땲??
	 */
	public String getCreatDt() {
		return creatDt;
	}

	/**
	 * ?앹꽦 ?좎쭨瑜??ㅼ젙?⑸땲??
	 */
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}

	/**
	 * 理쒖큹 ?깅줉??ID瑜?諛섑솚?⑸땲??
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * 理쒖큹 ?깅줉??ID瑜??ㅼ젙?⑸땲??
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * 理쒖큹 ?깅줉 ?쒓컙??諛섑솚?⑸땲??
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * 理쒖큹 ?깅줉 ?쒓컙???ㅼ젙?⑸땲??
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * 留덉?留??섏젙??ID瑜?諛섑솚?⑸땲??
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * 留덉?留??섏젙??ID瑜??ㅼ젙?⑸땲??
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * 留덉?留??섏젙 ?쒓컙??諛섑솚?⑸땲??
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * 留덉?留??섏젙 ?쒓컙???ㅼ젙?⑸땲??
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

}
