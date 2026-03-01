package egovframework.com.uss.ion.ctn.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - 寃쎌“愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 寃쎌“愿由ъ쓽 ?ъ슜?륤D,寃쎌“肄붾뱶,?좎껌?쇱옄,??곸옄紐??앸뀈?붿씪,諛쒖깮?쇱옄,愿怨?鍮꾧퀬,寃곗옱?륤D,?뱀씤?щ?,寃곗옱?쇱떆,諛섎젮?ъ쑀,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class CtsnnManage extends ComDefaultVO {

	/**
	* serialVersionUID
	*/
	private static final long serialVersionUID = 1L;
	
	/**
	*  寃쎌“ID	      
	*/ 
	private String ctsnnId;

	/**
	*  ?ъ슜?륤D	      
	*/ 
	private String usid;

	/**
	*  寃쎌“肄붾뱶	      
	*/ 
	private String ctsnnCd;

	/**
	*  ?좎껌?쇱옄	      
	*/ 
	private String reqstDe;

	/**
	*  寃쎌“紐?      
	*/ 
   private String ctsnnNm;

	/**
	*  ??곸옄紐?      
	*/ 
	private String trgterNm;

	/**
	*  ?앸뀈?붿씪	      
	*/ 
	private String brth;

	/**
	*  諛쒖깮?쇱옄	      
	*/ 
	private String occrrDe;

	/**
	*  愿怨?          
	*/ 
	private String relate;

	/**
	*  鍮꾧퀬	          
	*/ 
	private String remark;

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
	 * @return the ctsnnId
	 */
	public String getCtsnnId() {
		return ctsnnId;
	}

	/**
	 * @param ctsnnId the ctsnnId to set
	 */
	public void setCtsnnId(String ctsnnId) {
		this.ctsnnId = ctsnnId;
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
	 * @return the ctsnnCd
	 */
	public String getCtsnnCd() {
		return ctsnnCd;
	}

	/**
	 * @param ctsnnCd the ctsnnCd to set
	 */
	public void setCtsnnCd(String ctsnnCd) {
		this.ctsnnCd = ctsnnCd;
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
	 * @return the ctsnnNm
	 */
	public String getCtsnnNm() {
		return ctsnnNm;
	}

	/**
	 * @param ctsnnNm the ctsnnNm to set
	 */
	public void setCtsnnNm(String ctsnnNm) {
		this.ctsnnNm = ctsnnNm;
	}

	/**
	 * @return the trgterNm
	 */
	public String getTrgterNm() {
		return trgterNm;
	}

	/**
	 * @param trgterNm the trgterNm to set
	 */
	public void setTrgterNm(String trgterNm) {
		this.trgterNm = trgterNm;
	}

	/**
	 * @return the brth
	 */
	public String getBrth() {
		return brth;
	}

	/**
	 * @param brth the brth to set
	 */
	public void setBrth(String brth) {
		this.brth = brth;
	}

	/**
	 * @return the occrrDe
	 */
	public String getOccrrDe() {
		return occrrDe;
	}

	/**
	 * @param occrrDe the occrrDe to set
	 */
	public void setOccrrDe(String occrrDe) {
		this.occrrDe = occrrDe;
	}

	/**
	 * @return the relate
	 */
	public String getRelate() {
		return relate;
	}

	/**
	 * @param relate the relate to set
	 */
	public void setRelate(String relate) {
		this.relate = relate;
	}

	/**
	 * @return the remark
	 */
	public String getRemark() {
		return remark;
	}

	/**
	 * @param remark the remark to set
	 */
	public void setRemark(String remark) {
		this.remark = remark;
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

}
