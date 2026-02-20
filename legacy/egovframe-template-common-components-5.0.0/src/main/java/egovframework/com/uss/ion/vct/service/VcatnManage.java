package egovframework.com.uss.ion.vct.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?닿?愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?닿?愿由ъ쓽 ?좎껌?륤D,?닿?援щ텇,?쒖옉?쇱옄,醫낅즺?쇱옄,?좎껌?쇱옄,?닿??ъ쑀,諛쒖깮?곕룄,寃곗옱?륤D,?뱀씤?щ?,寃곗옱?쇱떆,諛섎젮?ъ쑀,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class VcatnManage extends ComDefaultVO {
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	
	/**
	*  ?좎껌?륤D	      
	*/ 
	private String applcntId;

	/**
	*  ?닿?援щ텇	      
	*/ 
	private String vcatnSe;

	/**
	*  ?쒖옉?쇱옄	      
	*/ 
	private String bgnde;

	/**
	*  醫낅즺?쇱옄	      
	*/ 
	private String endde;
	
	/**
	*  ?좎껌?쇱옄	      
	*/ 
	private String reqstDe;

	/**
	*  ?닿??ъ쑀	      
	*/ 
	private String vcatnResn;
	
	/**
	*  諛쒖깮?곕룄	      
	*/ 
	private String occrrncYear;

	/**
	*  ?뺤삤援щ텇	      
	*/ 
	private String noonSe;
	
	/**
	*  寃곗옱?륤D	      
	*/ 
	private String sanctnerId;

	/**
	*  ?뱀씤?щ?	      
	*/ 
	private String confmAt;

	/**
	*  寃곗옱?쇱떆	      
	*/ 
	private String sanctnDt;

	/**
	*  諛섎젮?ъ쑀	      
	*/ 
	private String returnResn;

	/**
	*  ?쎌떇寃곗옱ID	      
	*/ 
	private String infrmlSanctnId;	
	
	
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
	*  sanctnDtNm	
	*/ 
	private String sanctnDtNm;
	
	/**
	*  orgnztNm	
	*/ 
	private String orgnztNm;

	/**
	 * @return the sanctnDtNm
	 */
	public String getSanctnDtNm() {
		return sanctnDtNm;
	}

	/**
	 * @param sanctnDtNm the sanctnDtNm to set
	 */
	public void setSanctnDtNm(String sanctnDtNm) {
		this.sanctnDtNm = sanctnDtNm;
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
	 * @return the applcntId
	 */
	public String getApplcntId() {
		return applcntId;
	}

	/**
	 * @param applcntId the applcntId to set
	 */
	public void setApplcntId(String applcntId) {
		this.applcntId = applcntId;
	}

	/**
	 * @return the vcatnSe
	 */
	public String getVcatnSe() {
		return vcatnSe;
	}

	/**
	 * @param vcatnSe the vcatnSe to set
	 */
	public void setVcatnSe(String vcatnSe) {
		this.vcatnSe = vcatnSe;
	}

	/**
	 * @return the bgnde
	 */
	public String getBgnde() {
		return bgnde;
	}

	/**
	 * @param bgnde the bgnde to set
	 */
	public void setBgnde(String bgnde) {
		this.bgnde = bgnde;
	}

	/**
	 * @return the endde
	 */
	public String getEndde() {
		return endde;
	}

	/**
	 * @param endde the endde to set
	 */
	public void setEndde(String endde) {
		this.endde = endde;
	}

	/**
	 * @return the reqstDe
	 */
	public String getReqstDe() {
		return reqstDe;
	}

	/**
	 * @param reqstDe the reqstDe to set
	 */
	public void setReqstDe(String reqstDe) {
		this.reqstDe = reqstDe;
	}

	/**
	 * @return the vcatnResn
	 */
	public String getVcatnResn() {
		return vcatnResn;
	}

	/**
	 * @param vcatnResn the vcatnResn to set
	 */
	public void setVcatnResn(String vcatnResn) {
		this.vcatnResn = vcatnResn;
	}

	/**
	 * @return the occrrncYear
	 */
	public String getOccrrncYear() {
		return occrrncYear;
	}

	/**
	 * @param occrrncYear the occrrncYear to set
	 */
	public void setOccrrncYear(String occrrncYear) {
		this.occrrncYear = occrrncYear;
	}

	/**
	 * @return the sanctnerId
	 */
	public String getSanctnerId() {
		return sanctnerId;
	}

	/**
	 * @param sanctnerId the sanctnerId to set
	 */
	public void setSanctnerId(String sanctnerId) {
		this.sanctnerId = sanctnerId;
	}

	/**
	 * @return the confmAt
	 */
	public String getConfmAt() {
		return confmAt;
	}

	/**
	 * @param confmAt the confmAt to set
	 */
	public void setConfmAt(String confmAt) {
		this.confmAt = confmAt;
	}

	/**
	 * @return the sanctnDt
	 */
	public String getSanctnDt() {
		return sanctnDt;
	}

	/**
	 * @param sanctnDt the sanctnDt to set
	 */
	public void setSanctnDt(String sanctnDt) {
		this.sanctnDt = sanctnDt;
	}

	/**
	 * @return the returnResn
	 */
	public String getReturnResn() {
		return returnResn;
	}

	/**
	 * @param returnResn the returnResn to set
	 */
	public void setReturnResn(String returnResn) {
		this.returnResn = returnResn;
	}

	/**
	 * @return the infrmlSanctnId
	 */
	public String getInfrmlSanctnId() {
		return infrmlSanctnId;
	}

	/**
	 * @param infrmlSanctnId the infrmlSanctnId to set
	 */
	public void setInfrmlSanctnId(String infrmlSanctnId) {
		this.infrmlSanctnId = infrmlSanctnId;
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
	 * @return the noonSe
	 */
	public String getNoonSe() {
		return noonSe;
	}

	/**
	 * @param noonSe the noonSe to set
	 */
	public void setNoonSe(String noonSe) {
		this.noonSe = noonSe;
	}
}