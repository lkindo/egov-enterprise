package egovframework.com.dam.per.service;

/**
 * 媛쒖슂
 * - 媛쒖씤吏?앹뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뚯냽議곗쭅, 吏?앹쑀?? 吏?앸챸, ?섏쭛?쇱옄, 吏?앸궡????ぉ??愿由ы븳??
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:50
 */
public class KnoPersonal {
		
	/**
	 * ?몄뀡ID
	 */
	private String uniqId;
	/**
	 * 吏?쒲D
	 */
	private String knoId;
	/**
	 * ?뚯냽議곗쭅ID
	 */
	private String orgnztId;
	/**
	 * ?뚯냽議곗쭅紐?
	 */
	private String orgnztNm;	
	/**
	 * ?ъ슜?륤D
	 */
	private String emplyrId;
	/**
	 * ?ъ슜?먮챸
	 */
	private String userNm;
	/**
	 * 吏?앹쑀?뺤퐫??
	 */
	private String knoTypeCd;
	/**
	 * 吏?앹쑀?뺣챸
	 */
	private String knoTypeNm;
	/**
	 * 吏?앸챸
	 */
	private String knoNm;
	/**
	 * 吏?앸궡??
	 */
	private String knoCn;
	/**
	 * 媛쒖씤吏?앷났媛쒖뿬遺
	 */
	private String othbcAt;
	/**
	 * ?깅줉?먮챸
	 */
	private String regstNm;	
	/**
	 * ?섏쭛?쇱옄
	 */
	private String colYmd;
	/**
	 * 泥⑤??뚯씪ID
	 */
	private String atchFileId;
	/** 
	 * 理쒖큹?깅줉?꾩씠??
	 */
	private String frstRegisterId = "";		
	/** 
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";
	/**
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	
	
	/**
	 * @return the uniqId
	 */
	public String getUniqId() {
		return uniqId;
	}
	/**
	 * @param uniqId the uniqId to set
	 */
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}
	/**
	 * @return the knoId
	 */
	public String getKnoId() {
		return knoId;
	}
	/**
	 * @param knoId the knoId to set
	 */
	public void setKnoId(String knoId) {
		this.knoId = knoId;
	}
	/**
	 * @return the orgnztId
	 */
	public String getOrgnztId() {
		return orgnztId;
	}
	/**
	 * @param orgnztId the orgnztId to set
	 */
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}
	/**
	 * @return the orgnztNm
	 */
	public String getOrgnztNm() {
		return orgnztNm;
	}
	/**
	 * @param orgnztNm the orgnztNm to set
	 */
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	/**
	 * @return the emplyrId
	 */
	public String getEmplyrId() {
		return emplyrId;
	}
	/**
	 * @param emplyrId the emplyrId to set
	 */
	public void setEmplyrId(String emplyrId) {
		this.emplyrId = emplyrId;
	}
	/**
	 * @return the userNm
	 */
	public String getUserNm() {
		return userNm;
	}
	/**
	 * @param userNm the userNm to set
	 */
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}
	/**
	 * @return the knoTypeCd
	 */
	public String getKnoTypeCd() {
		return knoTypeCd;
	}
	/**
	 * @param knoTypeCd the knoTypeCd to set
	 */
	public void setKnoTypeCd(String knoTypeCd) {
		this.knoTypeCd = knoTypeCd;
	}
	/**
	 * @return the knoTypeNm
	 */
	public String getKnoTypeNm() {
		return knoTypeNm;
	}
	/**
	 * @param knoTypeNm the knoTypeNm to set
	 */
	public void setKnoTypeNm(String knoTypeNm) {
		this.knoTypeNm = knoTypeNm;
	}
	/**
	 * @return the knoNm
	 */
	public String getKnoNm() {
		return knoNm;
	}
	/**
	 * @param knoNm the knoNm to set
	 */
	public void setKnoNm(String knoNm) {
		this.knoNm = knoNm;
	}
	/**
	 * @return the knoCn
	 */
	public String getKnoCn() {
		return knoCn;
	}
	/**
	 * @param knoCn the knoCn to set
	 */
	public void setKnoCn(String knoCn) {
		this.knoCn = knoCn;
	}
	/**
	 * @return the othbcAt
	 */
	public String getOthbcAt() {
		return othbcAt;
	}
	/**
	 * @param othbcAt the othbcAt to set
	 */
	public void setOthbcAt(String othbcAt) {
		this.othbcAt = othbcAt;
	}
	/**
	 * @return the colYmd
	 */
	public String getColYmd() {
		return colYmd;
	}
	/**
	 * @param colYmd the colYmd to set
	 */
	public void setColYmd(String colYmd) {
		this.colYmd = colYmd;
	}
	/**
	 * @return the atchFileId
	 */
	public String getAtchFileId() {
		return atchFileId;
	}
	/**
	 * @param atchFileId the atchFileId to set
	 */
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
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
	 * @return the regstNm
	 */
	public String getRegstNm() {
		return regstNm;
	}
	/**
	 * @param regstNm the regstNm to set
	 */
	public void setRegstNm(String regstNm) {
		this.regstNm = regstNm;
	}

}