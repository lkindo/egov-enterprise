package egovframework.com.utl.sys.dbm.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * DB?쒕퉬?ㅻえ?덊꽣留곸뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.21   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class DbMntrng extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = 5555816004403245980L;
	/**
	 * ?곗씠?곗냼?ㅻ챸
	 */
	private String dataSourcNm;
	/**
	 * ?쒕쾭紐?
	 */
	private String serverNm;
	/**
	 * DBMS醫낅쪟
	 */
	private String dbmsKind;
	/**
	 * 泥댄겕SQL
	 */
	private String ceckSql;
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
	 * 理쒖쥌?섏젙???꾩씠??
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * 理쒖큹?깅줉???꾩씠??
	 */
	private String frstRegisterId;
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm;
	/**
	 * ?앹꽦?쇱떆
	 */
	private String creatDt;


	/**
	 * 紐⑤땲?곕쭅?곹깭紐?
	 */
	private String mntrngSttusNm;
	/**
	 * DBMS醫낅쪟紐?
	 */
	private String dbmsKindNm;

	/**
	 * @return the dataSourcNm
	 */
	public String getDataSourcNm() {
		return dataSourcNm;
	}
	/**
	 * @return the serverNm
	 */
	public String getServerNm() {
		return serverNm;
	}
	/**
	 * @return the dbmsKind
	 */
	public String getDbmsKind() {
		return dbmsKind;
	}
	/**
	 * @return the ceckSql
	 */
	public String getCeckSql() {
		return ceckSql;
	}
	/**
	 * @return the mngrNm
	 */
	public String getMngrNm() {
		return mngrNm;
	}
	/**
	 * @return the mngrEmailAddr
	 */
	public String getMngrEmailAddr() {
		return mngrEmailAddr;
	}
	/**
	 * @return the mntrngSttus
	 */
	public String getMntrngSttus() {
		return mntrngSttus;
	}
	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * @return the mntrngSttusNm
	 */
	public String getMntrngSttusNm() {
		return mntrngSttusNm;
	}
	/**
	 * @return the dbmsKindNm
	 */
	public String getDbmsKindNm() {
		return dbmsKindNm;
	}
	/**
	 * @param dataSourcNm the dataSourcNm to set
	 */
	public void setDataSourcNm(String dataSourcNm) {
		this.dataSourcNm = dataSourcNm;
	}
	/**
	 * @param serverNm the serverNm to set
	 */
	public void setServerNm(String serverNm) {
		this.serverNm = serverNm;
	}
	/**
	 * @param dbmsKind the dbmsKind to set
	 */
	public void setDbmsKind(String dbmsKind) {
		this.dbmsKind = dbmsKind;
	}
	/**
	 * @param ceckSql the ceckSql to set
	 */
	public void setCeckSql(String ceckSql) {
		this.ceckSql = ceckSql;
	}
	/**
	 * @param mngrNm the mngrNm to set
	 */
	public void setMngrNm(String mngrNm) {
		this.mngrNm = mngrNm;
	}
	/**
	 * @param mngrEmailAddr the mngrEmailAddr to set
	 */
	public void setMngrEmailAddr(String mngrEmailAddr) {
		this.mngrEmailAddr = mngrEmailAddr;
	}
	/**
	 * @param mntrngSttus the mntrngSttus to set
	 */
	public void setMntrngSttus(String mntrngSttus) {
		this.mntrngSttus = mntrngSttus;
	}
	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	/**
	 * @param mntrngSttusNm the mntrngSttusNm to set
	 */
	public void setMntrngSttusNm(String mntrngSttusNm) {
		this.mntrngSttusNm = mntrngSttusNm;
	}
	/**
	 * @param dbmsKindNm the dbmsKindNm to set
	 */
	public void setDbmsKindNm(String dbmsKindNm) {
		this.dbmsKindNm = dbmsKindNm;
	}
	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	/**
	 * @return the creatDt
	 */
	public String getCreatDt() {
		return creatDt;
	}
	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	/**
	 * @param creatDt the creatDt to set
	 */
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}


}
