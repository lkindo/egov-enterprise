package egovframework.com.uss.ion.rwd.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?ъ긽愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?ъ긽愿由ъ쓽 ?ъ긽?륤D,?ъ긽肄붾뱶,?ъ긽?쇱옄,怨듭쟻?댁슜,寃곗옱?륤D,?뱀씤?щ?,寃곗옱?쇱떆,諛섎젮?ъ쑀,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??         ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *   2010.06.15  ?댁슜			理쒖큹 ?앹꽦
 *   2024.10.29  沅뚰깭??		?ъ긽???뚯냽??泥섎━??蹂?섏? getter, setter 異붽?
 *  
 * </pre>
 */

public class RwardManage extends ComDefaultVO {

	/**
	* serialVersionUID
	*/
	private static final long serialVersionUID = 1L;

	/**
	*  ?ъ긽ID	      
	*/ 
	private String rwardId;
	
	/**
	*  ?ъ긽?륤D	      
	*/ 
	private String rwardManId;
	
	/**
	*  ?ъ긽?먮챸	      
	*/ 
	private String rwardManNm;

	/**
	 * ?ъ긽???뚯냽
	 */
	private String rwardManOrgnztNm;
	
	public String getRwardManNm() {
		return rwardManNm;
	}

	public void setRwardManNm(String rwardManNm) {
		this.rwardManNm = rwardManNm;
	}

	/**
	*  ?ъ긽肄붾뱶	      
	*/ 
	private String rwardCd;

	/**
	*  ?ъ긽?쇱옄	      
	*/ 
	private String rwardDe;

	/**
	*  ?ъ긽紐?
	*/ 
	private String rwardNm;
	
	/**
	*  怨듭쟻?댁슜	      
	*/ 
	private String pblenCn;

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
	*  泥⑤??뚯씪ID	      
	*/ 
	private String atchFileId;

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
	 * @return the rwardId
	 */
	public String getRwardId() {
		return rwardId;
	}

	/**
	 * @param rwardId the rwardId to set
	 */
	public void setRwardId(String rwardId) {
		this.rwardId = rwardId;
	}

	/**
	 * @return the rwardManId
	 */
	public String getRwardManId() {
		return rwardManId;
	}

	/**
	 * @param rwardManId the rwardManId to set
	 */
	public void setRwardManId(String rwardManId) {
		this.rwardManId = rwardManId;
	}

	/**
	 * @return the rwardCd
	 */
	public String getRwardCd() {
		return rwardCd;
	}

	/**
	 * @param rwardCd the rwardCd to set
	 */
	public void setRwardCd(String rwardCd) {
		this.rwardCd = rwardCd;
	}

	/**
	 * @return the rwardDe
	 */
	public String getRwardDe() {
		return rwardDe;
	}

	/**
	 * @param rwardDe the rwardDe to set
	 */
	public void setRwardDe(String rwardDe) {
		this.rwardDe = rwardDe;
	}

	/**
	 * @return the rwardNm
	 */
	public String getRwardNm() {
		return rwardNm;
	}

	/**
	 * @param rwardNm the rwardNm to set
	 */
	public void setRwardNm(String rwardNm) {
		this.rwardNm = rwardNm;
	}

	/**
	 * @return the pblenCn
	 */
	public String getPblenCn() {
		return pblenCn;
	}

	/**
	 * @param pblenCn the pblenCn to set
	 */
	public void setPblenCn(String pblenCn) {
		this.pblenCn = pblenCn;
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
	 * ?ъ긽???뚯냽 Getter Setter
	 */
	public String getRwardManOrgnztNm() {
		return rwardManOrgnztNm;
	}

	public void setRwardManOrgnztNm(String rwardManOrgnztNm) {
		this.rwardManOrgnztNm = rwardManOrgnztNm;
	}

	public static long getSerialversionuid() {
		return serialVersionUID;
	}

}
