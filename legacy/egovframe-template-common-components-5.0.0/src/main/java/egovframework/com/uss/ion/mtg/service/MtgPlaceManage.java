package egovframework.com.uss.ion.mtg.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?뚯쓽?ㅺ?由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅺ?由ъ쓽 ?뚯쓽?ㅼ퐫???뚯쓽?ㅻ챸,媛쒕갑?쒖옉?쒓컙,媛쒕갑醫낅즺?쒓컙,?섏슜媛?μ씤???꾩튂援щ텇,?꾩튂?곸꽭,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class MtgPlaceManage extends ComDefaultVO {

	/**
	* serialVersionUID
	*/
	private static final long serialVersionUID = 1L;
	
	/**
	*  ?뚯쓽?짪D
	*/
	private String mtgPlaceId;
	
	/**
	* ?뚯쓽?ㅻ챸
	*/
	private String mtgPlaceNm;
	
	/**
	* 媛쒕갑?쒖옉?쒓컙
	*/
	private String opnBeginTm;
	
	/**
	* 媛쒕갑醫낅즺?쒓컙
	*/
	private String opnEndTm;
	
	/**
	* ?섏슜媛?μ씤??
	*/
	private int aceptncPosblNmpr;
	
	/**
	* ?꾩튂援щ텇
	*/
	private String lcSe;
	
	/**
	* ?꾩튂?곸꽭
	*/
	private String lcDetail;
	
	/**
	* 泥⑤??뚯씪
	*/
	private String atchFileId;

	/**
	* 理쒖큹?깅줉?륤D
	*/
	private String frstRegisterId;
	
	/**
	* 理쒖큹?깅줉?쒖젏
	*/
	private String frstRegisterPnttm;
	
	/**
	* 理쒖쥌?섏젙?륤D
	*/
	private String lastUpdusrId;
	
	/**
	* 理쒖쥌?섏젙?쒖젏
	*/
	private String lastUpdusrPnttm;

	/**
	 * @return the mtgPlaceCd
	 */
	public String getMtgPlaceId() {
		return mtgPlaceId;
	}

	/**
	 * @param mtgPlaceCd the mtgPlaceCd to set
	 */
	public void setMtgPlaceId(String mtgPlaceId) {
		this.mtgPlaceId = mtgPlaceId;
	}

	/**
	 * @return the mtgPlaceNm
	 */
	public String getMtgPlaceNm() {
		return mtgPlaceNm;
	}

	/**
	 * @param mtgPlaceNm the mtgPlaceNm to set
	 */
	public void setMtgPlaceNm(String mtgPlaceNm) {
		this.mtgPlaceNm = mtgPlaceNm;
	}

	/**
	 * @return the opnBeginTm
	 */
	public String getOpnBeginTm() {
		return opnBeginTm;
	}

	/**
	 * @param opnBeginTm the opnBeginTm to set
	 */
	public void setOpnBeginTm(String opnBeginTm) {
		this.opnBeginTm = opnBeginTm;
	}

	/**
	 * @return the opnEndTm
	 */
	public String getOpnEndTm() {
		return opnEndTm;
	}

	/**
	 * @param opnEndTm the opnEndTm to set
	 */
	public void setOpnEndTm(String opnEndTm) {
		this.opnEndTm = opnEndTm;
	}

	/**
	 * @return the aceptncPosblNmpr
	 */
	public int getAceptncPosblNmpr() {
		return aceptncPosblNmpr;
	}

	/**
	 * @param aceptncPosblNmpr the aceptncPosblNmpr to set
	 */
	public void setAceptncPosblNmpr(int aceptncPosblNmpr) {
		this.aceptncPosblNmpr = aceptncPosblNmpr;
	}

	/**
	 * @return the lcSe
	 */
	public String getLcSe() {
		return lcSe;
	}

	/**
	 * @param lcSe the lcSe to set
	 */
	public void setLcSe(String lcSe) {
		this.lcSe = lcSe;
	}

	/**
	 * @return the lcDetail
	 */
	public String getLcDetail() {
		return lcDetail;
	}

	/**
	 * @param lcDetail the lcDetail to set
	 */
	public void setLcDetail(String lcDetail) {
		this.lcDetail = lcDetail;
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
}
