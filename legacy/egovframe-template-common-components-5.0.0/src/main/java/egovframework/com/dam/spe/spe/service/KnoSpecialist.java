package egovframework.com.dam.spe.spe.service;

/**
 * 媛쒖슂
 * - 吏?앹쟾臾멸??????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뚯냽議곗쭅, 吏?앹쑀?? ?뱀씤?쇱옄, ?꾨Ц媛?깅챸, ?꾨Ц吏?앸챸 ??ぉ??愿由ы븳??
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:51
 */
public class KnoSpecialist {

	/**
	 * ?꾨Ц媛ID
	 */
	private String speId;
	/**
	 * ?꾨Ц媛紐?
	 */
	private String userNm;
	/**
	 * ?뚯냽議곗쭅ID
	 */
	private String orgnztId;
	/**
	 * ?뚯냽議곗쭅紐?
	 */
	private String orgnztNm;	
	/**
	 * 吏?앹쑀?뺤퐫??
	 */
	private String knoTypeCd;
	/**
	 * ?뱀씤?좏삎肄붾뱶
	 */
	private String appTypeCd;
	/**
	 * ?뱀씤?좏삎紐?
	 */
	private String appTypeNm;	
	/**
	 * 吏?앹쑀?뺣챸
	 */
	private String knoTypeNm;
	/**
	 * ?꾨Ц媛?ㅻ챸
	 */
	private String speExpCn;	
	/**
	 * ?꾨Ц媛?뱀씤??
	 */
	private String speConfmDe;
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
	 * @return the speId
	 */
	public String getSpeId() {
		return speId;
	}
	/**
	 * @param speId the speId to set
	 */
	public void setSpeId(String speId) {
		this.speId = speId;
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
	 * @return the appTypeCd
	 */
	public String getAppTypeCd() {
		return appTypeCd;
	}
	/**
	 * @param appTypeCd the appTypeCd to set
	 */
	public void setAppTypeCd(String appTypeCd) {
		this.appTypeCd = appTypeCd;
	}
	/**
	 * @return the appTypeNm
	 */
	public String getAppTypeNm() {
		return appTypeNm;
	}
	/**
	 * @param appTypeNm the appTypeNm to set
	 */
	public void setAppTypeNm(String appTypeNm) {
		this.appTypeNm = appTypeNm;
	}
	/**
	 * @return the speConfmDe
	 */
	public String getSpeConfmDe() {
		return speConfmDe;
	}
	/**
	 * @param speConfmDe the speConfmDe to set
	 */
	public void setSpeConfmDe(String speConfmDe) {
		this.speConfmDe = speConfmDe;
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
	 * @return the speExpCn
	 */
	public String getSpeExpCn() {
		return speExpCn;
	}
	/**
	 * @param speExpCn the speExpCn to set
	 */
	public void setSpeExpCn(String speExpCn) {
		this.speExpCn = speExpCn;
	}

}