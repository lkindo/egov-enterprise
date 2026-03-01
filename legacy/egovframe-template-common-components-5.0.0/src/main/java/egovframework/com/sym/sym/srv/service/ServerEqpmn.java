package egovframework.com.sym.sym.srv.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?쒕쾭?λ퉬?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쒕쾭?λ퉬??ID, ?쒕쾭 ?λ퉬 紐? ?쒕쾭 ?λ퉬 IP, ?쒕쾭 ?λ퉬 愿由ъ옄 紐? ?댁쁺泥댁젣 ?뺣낫, CPU ?뺣낫, 硫붾え由??뺣낫 ?깆쓽 ??ぉ??愿由ы븳??
 * 
 * @author ?대Ц以
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:54
 */
public class ServerEqpmn extends ComDefaultVO {

	private static final long serialVersionUID = 1L;
	/**
	 * ?쒕쾭 ?λ퉬 ID
	 */
	private String serverEqpmnId;
	/**
	 * ?쒕쾭 ?λ퉬 紐?
	 */
	private String serverEqpmnNm;
	/**
	 * ?쒕쾭 ?λ퉬 IP
	 */
	private String serverEqpmnIp;
	/**
	 * ?쒕쾭 ?λ퉬 愿由ъ옄 紐?
	 */
	private String serverEqpmnMngrNm;
	/**
	 * 愿由ъ옄 ?대찓??二쇱냼
	 */
	private String mngrEmailAddr;
	/**
	 * ?댁쁺泥댁젣 ?뺣낫
	 */
	private String opersysmInfo;
	/**
	 * CPU ?뺣낫
	 */
	private String cpuInfo;
	/**
	 * 硫붾え由??뺣낫
	 */
	private String moryInfo;
	/**
	 * ?섎뱶?붿뒪???뺣낫
	 */
	private String hdDisk;
	/**
	 * 湲고? ?뺣낫
	 */
	private String etcInfo;
    /**
	 * ?깅줉?쇱옄
	 */    
    private String regstYmd;    
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
	 * @return the serverEqpmnId
	 */
	public String getServerEqpmnId() {
		return serverEqpmnId;
	}
	/**
	 * @param serverEqpmnId the serverEqpmnId to set
	 */
	public void setServerEqpmnId(String serverEqpmnId) {
		this.serverEqpmnId = serverEqpmnId;
	}
	/**
	 * @return the serverEqpmnNm
	 */
	public String getServerEqpmnNm() {
		return serverEqpmnNm;
	}
	/**
	 * @param serverEqpmnNm the serverEqpmnNm to set
	 */
	public void setServerEqpmnNm(String serverEqpmnNm) {
		this.serverEqpmnNm = serverEqpmnNm;
	}
	/**
	 * @return the serverEqpmnIp
	 */
	public String getServerEqpmnIp() {
		return serverEqpmnIp;
	}
	/**
	 * @param serverEqpmnIp the serverEqpmnIp to set
	 */
	public void setServerEqpmnIp(String serverEqpmnIp) {
		this.serverEqpmnIp = serverEqpmnIp;
	}
	/**
	 * @return the serverEqpmnMngrNm
	 */
	public String getServerEqpmnMngrNm() {
		return serverEqpmnMngrNm;
	}
	/**
	 * @param serverEqpmnMngrNm the serverEqpmnMngrNm to set
	 */
	public void setServerEqpmnMngrNm(String serverEqpmnMngrNm) {
		this.serverEqpmnMngrNm = serverEqpmnMngrNm;
	}
	/**
	 * @return the mngrEmailAddr
	 */
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}
	/**
	 * @param mngrEmailAddr the mngrEmailAddr to set
	 */
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}
	/**
	 * @return the opersysmInfo
	 */
	public String getOpersysmInfo() {
		return opersysmInfo;
	}
	/**
	 * @param opersysmInfo the opersysmInfo to set
	 */
	public void setOpersysmInfo(String opersysmInfo) {
		this.opersysmInfo = opersysmInfo;
	}
	/**
	 * @return the cpuInfo
	 */
	public String getCpuInfo() {
		return cpuInfo;
	}
	/**
	 * @param cpuInfo the cpuInfo to set
	 */
	public void setCpuInfo(String cpuInfo) {
		this.cpuInfo = cpuInfo;
	}
	/**
	 * @return the moryInfo
	 */
	public String getMoryInfo() {
		return moryInfo;
	}
	/**
	 * @param moryInfo the moryInfo to set
	 */
	public void setMoryInfo(String moryInfo) {
		this.moryInfo = moryInfo;
	}
	/**
	 * @return the hdDisk
	 */
	public String getHdDisk() {
		return hdDisk;
	}
	/**
	 * @param hdDisk the hdDisk to set
	 */
	public void setHdDisk(String hdDisk) {
		this.hdDisk = hdDisk;
	}
	/**
	 * @return the etcInfo
	 */
	public String getEtcInfo() {
		return etcInfo;
	}
	/**
	 * @param etcInfo the etcInfo to set
	 */
	public void setEtcInfo(String etcInfo) {
		this.etcInfo = etcInfo;
	}
	/**
	 * @return the regstYmd
	 */
	public String getRegstYmd() {
		return regstYmd;
	}
	/**
	 * @param regstYmd the regstYmd to set
	 */
	public void setRegstYmd(String regstYmd) {
		this.regstYmd = regstYmd;
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
