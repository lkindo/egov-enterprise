package egovframework.com.uss.ion.ans.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - 湲곕뀗?쇨?由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 湲곕뀗?쇨?由ъ쓽 ?ъ슜?륤D,湲곕뀗?쇰챸,湲곕뀗?쇱옄,?щ젰援щ텇,?뚮┝?ㅼ젙,?뚮┝?쒖옉?쇱옄,硫붾え,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class AnnvrsryManage extends ComDefaultVO {

	/**
	* serialVersionUID
	*/
	private static final long serialVersionUID = 1L;
	
	/**
	*  湲곕뀗?퍲D	      
	*/ 
	private String annId;

	
	/**
	*  ?ъ슜?륤D	      
	*/ 
	private String usid;

	/**
	*  湲곕뀗?쇨뎄遺?      
	*/ 
	private String annvrsrySe;

	
	/**
	*  湲곕뀗?쇰챸	      
	*/ 
	private String annvrsryNm;

	/**
	*  湲곕뀗?쇱옄	      
	*/ 
	private String annvrsryDe;

	/**
	*  ?щ젰援щ텇	      
	*/ 
	private String cldrSe;

	/**
	*  諛섎났援щ텇	      
	*/ 
	private String reptitSe;
	
	/**
	*  ?뚮┝?ㅼ젙	      
	*/ 
	private String annvrsrySetup;

	/**
	*  ?뚮┝?쒖옉?쇱옄	
	*/ 
	private String annvrsryBeginDe;

	/**
	*  硫붾え	         
	*/ 
	private String memo;

	/**
	*  理쒖큹?깅줉?륤D	
	*/ 
	private String frstRegisterId;

	/**
	*  理쒖큹?깅줉?쒖젏	
	*/ 
	private String frstRegisterPnttm;

	/**
	*  理쒖쥌?섏젙?륤D	
	*/ 
	private String lastUpdusrId;

	/**
	*  理쒖쥌?섏젙?쒖젏	
	*/ 
	private String lastUpdusrPnttm;
	

	/**
	 * @return the annId
	 */
	public String getAnnId() {
		return annId;
	}

	/**
	 * @param annId the annId to set
	 */
	public void setAnnId(String annId) {
		this.annId = annId;
	}

	/**
	 * @return the usid
	 */
	public String getUsid() {
		return usid;
	}

	/**
	 * @param usid the usid to set
	 */
	public void setUsid(String usid) {
		this.usid = usid;
	}

	/**
	 * @return the annvrsrySe
	 */
	public String getAnnvrsrySe() {
		return annvrsrySe;
	}

	/**
	 * @param annvrsrySe the annvrsrySe to set
	 */
	public void setAnnvrsrySe(String annvrsrySe) {
		this.annvrsrySe = annvrsrySe;
	}

	/**
	 * @return the annvrsryNm
	 */
	public String getAnnvrsryNm() {
		return annvrsryNm;
	}

	/**
	 * @param annvrsryNm the annvrsryNm to set
	 */
	public void setAnnvrsryNm(String annvrsryNm) {
		this.annvrsryNm = annvrsryNm;
	}

	/**
	 * @return the annvrsryDe
	 */
	public String getAnnvrsryDe() {
		return annvrsryDe;
	}

	/**
	 * @param annvrsryDe the annvrsryDe to set
	 */
	public void setAnnvrsryDe(String annvrsryDe) {
		this.annvrsryDe = annvrsryDe;
	}

	/**
	 * @return the cldrSe
	 */
	public String getCldrSe() {
		return cldrSe;
	}

	/**
	 * @param cldrSe the cldrSe to set
	 */
	public void setCldrSe(String cldrSe) {
		this.cldrSe = cldrSe;
	}

	/**
	 * @return the annvrsrySetup
	 */
	public String getAnnvrsrySetup() {
		return annvrsrySetup;
	}

	/**
	 * @param annvrsrySetup the annvrsrySetup to set
	 */
	public void setAnnvrsrySetup(String annvrsrySetup) {
		this.annvrsrySetup = annvrsrySetup;
	}

	/**
	 * @return the annvrsryBeginDe
	 */
	public String getAnnvrsryBeginDe() {
		return annvrsryBeginDe;
	}

	/**
	 * @param annvrsryBeginDe the annvrsryBeginDe to set
	 */
	public void setAnnvrsryBeginDe(String annvrsryBeginDe) {
		this.annvrsryBeginDe = annvrsryBeginDe;
	}

	/**
	 * @return the memo
	 */
	public String getMemo() {
		return memo;
	}

	/**
	 * @param memo the memo to set
	 */
	public void setMemo(String memo) {
		this.memo = memo;
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
	 * @return the serialVersionUID
	 */
	public static long getSerialVersionUID() {
		return serialVersionUID;
	}

	/**
	 * @return the reptitSe
	 */
	public String getReptitSe() {
		return reptitSe;
	}

	/**
	 * @param reptitSe the reptitSe to set
	 */
	public void setReptitSe(String reptitSe) {
		this.reptitSe = reptitSe;
	}

	
}