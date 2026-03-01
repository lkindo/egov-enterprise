package egovframework.com.uss.ion.bnt.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?뱀쭅愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뱀쭅愿由ъ쓽 ?뱀쭅ID,?뱀쭅?쇱옄,鍮꾧퀬,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class BndtCeckManage extends ComDefaultVO {

	private static final long serialVersionUID = -690185899926659585L;

	/**
	*  ?뱀쭅泥댄겕援щ텇
	*/
	private String bndtCeckSe;

	/**
	*  ?뱀쭅泥댄겕肄붾뱶
	*/
	private String bndtCeckCd;

	/**
	*  ?뱀쭅泥댄겕肄붾뱶紐?
	*/
	private String bndtCeckCdNm;

	/**
	*  ?ъ슜?щ?
	*/
	private String useAt;

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
	 * @return the bndtCeckSe
	 */
	public String getBndtCeckSe() {
		return bndtCeckSe;
	}

	/**
	 * @param bndtCeckSe the bndtCeckSe to set
	 */
	public void setBndtCeckSe(String bndtCeckSe) {
		this.bndtCeckSe = bndtCeckSe;
	}

	/**
	 * @return the bndtCeckCd
	 */
	public String getBndtCeckCd() {
		return bndtCeckCd;
	}

	/**
	 * @param bndtCeckCd the bndtCeckCd to set
	 */
	public void setBndtCeckCd(String bndtCeckCd) {
		this.bndtCeckCd = bndtCeckCd;
	}

	/**
	 * @return the bndtCeckCdNm
	 */
	public String getBndtCeckCdNm() {
		return bndtCeckCdNm;
	}

	/**
	 * @param bndtCeckCdNm the bndtCeckCdNm to set
	 */
	public void setBndtCeckCdNm(String bndtCeckCdNm) {
		this.bndtCeckCdNm = bndtCeckCdNm;
	}

	/**
	 * @return the useAt
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * @param useAt the useAt to set
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
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
