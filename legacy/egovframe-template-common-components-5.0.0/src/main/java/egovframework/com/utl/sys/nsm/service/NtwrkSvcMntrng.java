package egovframework.com.utl.sys.nsm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒖뒪?쏧P, ?쒖뒪?쏧P 1, ?쒖뒪?쏧P 2, ?쒖뒪?쏧P 3, ?쒖뒪?쏧P 4, 援??쒖뒪?쏧P, ?쒖뒪?쒗룷?? 援??쒖뒪?쒗룷?? ?쒖뒪?쒕챸, 愿由ъ옄紐? 愿由ъ옄?대찓?쇱＜?? 紐⑤땲?곕쭅?곹깭, ?앹꽦?쇱떆, 濡쒓렇?뺣낫 ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 */
@SuppressWarnings("serial")
public class NtwrkSvcMntrng implements Serializable {

	/**
	 * ?쒖뒪?쏧P
	 */
	private String sysIp;
	/**
	 * ?쒖뒪?쏧P 1
	 */
	private String sysIp1;
	/**
	 * ?쒖뒪?쏧P 2
	 */
	private String sysIp2;
	/**
	 * ?쒖뒪?쏧P 3
	 */
	private String sysIp3;
	/**
	 * ?쒖뒪?쏧P 4
	 */
	private String sysIp4;
	/**
	 * 援ъ떆?ㅽ뀥IP
	 */
	private String oldSysIp;
	/**
	 * ?쒖뒪?쒗룷??
	 */
	private String sysPort;
	/**
	 * 援ъ떆?ㅽ뀥?ы듃
	 */
	private String oldSysPort;
	/**
	 * ?쒖뒪?쒕챸
	 */
	private String sysNm;
	/**
	 * 愿由ъ옄紐?
	 */
	private String mngrNm;
	/**
	 * 愿由ъ옄?대찓?쇱＜??
	 */
	private String mngrEmailAddr;
	/**
	 * 紐⑤땲?곕쭅?곹깭
	 */
	private String mntrngSttus;
	/**
	 * ?앹꽦?쇱떆
	 */
	private String creatDt;
	/**
	 * 濡쒓렇?뺣낫
	 */
	private String logInfo;
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
	 * ?쒖뒪??IP瑜?諛섑솚?⑸땲??
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
	 * ?쒖뒪??IP1??諛섑솚?⑸땲??
	 */
	public String getSysIp1() {
		return sysIp1;
	}

	/**
	 * ?쒖뒪??IP1???ㅼ젙?⑸땲??
	 */
	public void setSysIp1(String sysIp1) {
		this.sysIp1 = sysIp1;
	}

	/**
	 * ?쒖뒪??IP2瑜?諛섑솚?⑸땲??
	 */
	public String getSysIp2() {
		return sysIp2;
	}

	/**
	 * ?쒖뒪??IP2瑜??ㅼ젙?⑸땲??
	 */
	public void setSysIp2(String sysIp2) {
		this.sysIp2 = sysIp2;
	}

	/**
	 * ?쒖뒪??IP3??諛섑솚?⑸땲??
	 */
	public String getSysIp3() {
		return sysIp3;
	}

	/**
	 * ?쒖뒪??IP3???ㅼ젙?⑸땲??
	 */
	public void setSysIp3(String sysIp3) {
		this.sysIp3 = sysIp3;
	}

	/**
	 * ?쒖뒪??IP4瑜?諛섑솚?⑸땲??
	 */
	public String getSysIp4() {
		return sysIp4;
	}

	/**
	 * ?쒖뒪??IP4瑜??ㅼ젙?⑸땲??
	 */
	public void setSysIp4(String sysIp4) {
		this.sysIp4 = sysIp4;
	}

	/**
	 * ?댁쟾 ?쒖뒪??IP瑜?諛섑솚?⑸땲??
	 */
	public String getOldSysIp() {
		return oldSysIp;
	}

	/**
	 * ?댁쟾 ?쒖뒪??IP瑜??ㅼ젙?⑸땲??
	 */
	public void setOldSysIp(String oldSysIp) {
		this.oldSysIp = oldSysIp;
	}

	/**
	 * ?쒖뒪???ы듃瑜?諛섑솚?⑸땲??
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
	 * ?댁쟾 ?쒖뒪???ы듃瑜?諛섑솚?⑸땲??
	 */
	public String getOldSysPort() {
		return oldSysPort;
	}

	/**
	 * ?댁쟾 ?쒖뒪???ы듃瑜??ㅼ젙?⑸땲??
	 */
	public void setOldSysPort(String oldSysPort) {
		this.oldSysPort = oldSysPort;
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
	 * 愿由ъ옄 ?대쫫??諛섑솚?⑸땲??
	 */
	public String getMngrNm() {
		return mngrNm;
	}

	/**
	 * 愿由ъ옄 ?대쫫???ㅼ젙?⑸땲??
	 */
	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}

	/**
	 * 愿由ъ옄 ?대찓??二쇱냼瑜?諛섑솚?⑸땲??
	 */
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}

	/**
	 * 愿由ъ옄 ?대찓??二쇱냼瑜??ㅼ젙?⑸땲??
	 */
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
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
