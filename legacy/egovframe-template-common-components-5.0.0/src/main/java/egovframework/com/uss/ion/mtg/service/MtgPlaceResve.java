package egovframework.com.uss.ion.mtg.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?뚯쓽?ㅼ삁?쎌뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅼ삁?쎌쓽 ?덉빟ID,?뚯쓽?ㅼ퐫???뚯쓽?쒕ぉ,?덉빟?륤D,?덉빟?쒖옉?쒓컙,?덉빟醫낅즺?쒓컙,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class MtgPlaceResve extends ComDefaultVO {

	/**
	* serialVersionUID
	*/
	private static final long serialVersionUID = 1L;
	
	/**
	*  ?덉빟ID	
	*/ 
	private String resveId;

	/**
	*  ?뚯쓽?ㅼ퐫??   
	*/ 
	private String mtgPlaceId;

	/**
	*  ?뚯쓽?쒕ぉ	      
	*/ 
	private String mtgSj;

	/**
	*  ?덉빟?륤D	      
	*/ 
	private String resveManId;

	/**
	*  ?덉빟?쇱옄	      
	*/ 
	private String resveDe;
	
	/**
	*  ?덉빟?쒖옉?쒓컙	
	*/ 
	private String resveBeginTm;

	/**
	*  ?덉빟醫낅즺?쒓컙	
	*/ 
	private String resveEndTm;

	/**
	*  李몄꽍?몄썝	
	*/ 
	private int atndncNmpr;
	
	/**
	*  ?뚯쓽?댁슜	
	*/ 
	private String mtgCn;
	
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
	 * @return the resveId
	 */
	public String getResveId() {
		return resveId;
	}

	/**
	 * @param resveId the resveId to set
	 */
	public void setResveId(String resveId) {
		this.resveId = resveId;
	}


	/**
	 * @return the mtgPlaceId
	 */
	public String getMtgPlaceId() {
		return mtgPlaceId;
	}

	/**
	 * @param mtgPlaceId the mtgPlaceId to set
	 */
	public void setMtgPlaceId(String mtgPlaceId) {
		this.mtgPlaceId = mtgPlaceId;
	}

	/**
	 * @return the mtgSj
	 */
	public String getMtgSj() {
		return mtgSj;
	}

	/**
	 * @param mtgSj the mtgSj to set
	 */
	public void setMtgSj(String mtgSj) {
		this.mtgSj = mtgSj;
	}

	/**
	 * @return the resveManId
	 */
	public String getResveManId() {
		return resveManId;
	}

	/**
	 * @param resveManId the resveManId to set
	 */
	public void setResveManId(String resveManId) {
		this.resveManId = resveManId;
	}

	/**
	 * @return the resveDe
	 */
	public String getResveDe() {
		return resveDe;
	}

	/**
	 * @param resveDe the resveDe to set
	 */
	public void setResveDe(String resveDe) {
		this.resveDe = resveDe;
	}

	/**
	 * @return the resveBeginTm
	 */
	public String getResveBeginTm() {
		return resveBeginTm;
	}

	/**
	 * @param resveBeginTm the resveBeginTm to set
	 */
	public void setResveBeginTm(String resveBeginTm) {
		this.resveBeginTm = resveBeginTm;
	}

	/**
	 * @return the resveEndTm
	 */
	public String getResveEndTm() {
		return resveEndTm;
	}

	/**
	 * @param resveEndTm the resveEndTm to set
	 */
	public void setResveEndTm(String resveEndTm) {
		this.resveEndTm = resveEndTm;
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
	 * @return the atndncNmpr
	 */
	public int getAtndncNmpr() {
		return atndncNmpr;
	}

	/**
	 * @param atndncNmpr the atndncNmpr to set
	 */
	public void setAtndncNmpr(int atndncNmpr) {
		this.atndncNmpr = atndncNmpr;
	}

	/**
	 * @return the mtgCn
	 */
	public String getMtgCn() {
		return mtgCn;
	}

	/**
	 * @param mtgCn the mtgCn to set
	 */
	public void setMtgCn(String mtgCn) {
		this.mtgCn = mtgCn;
	}
}
