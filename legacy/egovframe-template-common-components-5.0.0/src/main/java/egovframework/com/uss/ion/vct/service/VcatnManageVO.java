package egovframework.com.uss.ion.vct.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?닿?愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?닿?愿由ъ쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class VcatnManageVO extends VcatnManage implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * ?닿? 紐⑸줉
	 */
	List<VcatnManageVO> vcatnManageList;

	/**
	*  ?좎껌?먮챸
	*/
	private String applcntNm;

	/**
	*  ?뱀씤?먮챸
	*/
	private String sanctnerNm;

	/**
	*  ?닿?援щ텇紐?
	*/
	private String vcatnSeNm;

	/**
	*  ?ъ슜?륤D
	*/
	private String usid;

	/**
	*  諛쒖깮?곗감媛쒖닔
	*/
	private double occrncYrycCo = 0.0;

	/**
	*  ?ъ슜?곗감媛쒖닔
	*/
	private double useYrycCo = 0.0;

	/**
	*  ?붿뿬?곗감媛쒖닔
	*/
	private double remndrYrycCo = 0.0;

	/**
	*  ?ъ슜???뚯냽紐?

	private String orgnztNm;
	*/
	/**
	*  ?뱀씤???뚯냽紐?
	*/
	private String sanctnerOrgnztNm;

	/**
	*  寃???곕룄
	*/
	private String searchYear;

	/**
	*  寃????
	*/
	private String searchMonth;

	/**
	*  寃???깅챸
	*/
	private String searchNm;

	/**
	*  寃??吏꾪뻾援щ텇
	*/
	private String searchConfmAt;

	/**
	*  sTempBgnde
	*/
	private String tempBgnde;

	/**
	*  sTempEndde
	*/
	private String tempEndde;

	/**
	*  tempUsNm
	*/
	private String tempUsNm;

	/**
	*  tempOrgnztNm
	*/
	private String tempOrgnztNm;


	/**
	*  ?좎껌?륤D
	*/
	private String applcntIdKey;

	/**
	*  ?닿?援щ텇
	*/
	private String vcatnSeKey;

	/**
	*  ?쒖옉?쇱옄
	*/
	private String bgndeKey;

	/**
	*  醫낅즺?쇱옄
	*/
	private String enddeKey;

	/**
	 * @return the tempUsNm
	 */
	public String getTempUsNm() {
		return tempUsNm;
	}
	/**
	 * @param tempUsNm the tempUsNm to set
	 */
	public void setTempUsNm(String tempUsNm) {
		this.tempUsNm = tempUsNm;
	}
	/**
	 * @return the tempOrgnztNm
	 */
	public String getTempOrgnztNm() {
		return tempOrgnztNm;
	}
	/**
	 * @param tempOrgnztNm the tempOrgnztNm to set
	 */
	public void setTempOrgnztNm(String tempOrgnztNm) {
		this.tempOrgnztNm = tempOrgnztNm;
	}
	/**
	 * @return the tempBgnde
	 */
	public String getTempBgnde() {
		return tempBgnde;
	}
	/**
	 * @param tempBgnde the tempBgnde to set
	 */
	public void setTempBgnde(String tempBgnde) {
		this.tempBgnde = tempBgnde;
	}
	/**
	 * @return the tempEndde
	 */
	public String getTempEndde() {
		return tempEndde;
	}
	/**
	 * @param tempEndde the tempEndde to set
	 */
	public void setTempEndde(String tempEndde) {
		this.tempEndde = tempEndde;
	}
	/**
	 * @return the vcatnManageList
	 */
	public List<VcatnManageVO> getVcatnManageList() {
		return vcatnManageList;
	}
	/**
	 * @param VcatnManage the vcatnManage to set
	 */
	public void setVcatnManageList(List<VcatnManageVO> vcatnManageList) {
		this.vcatnManageList = vcatnManageList;
	}
	/**
	 * @return the applcntNm
	 */
	public String getApplcntNm() {
		return applcntNm;
	}
	/**
	 * @param applcntNm the applcntNm to set
	 */
	public void setApplcntNm(String applcntNm) {
		this.applcntNm = applcntNm;
	}
	/**
	 * @return the sanctnerNm
	 */
	public String getSanctnerNm() {
		return sanctnerNm;
	}

	/**
	 * @param sanctnerNm the sanctnerNm to set
	 */
	public void setSanctnerNm(String sanctnerNm) {
		this.sanctnerNm = sanctnerNm;
	}

	/**
	 * @return the vcatnSeNm
	 */
	public String getVcatnSeNm() {
		return vcatnSeNm;
	}
	/**
	 * @param vcatnSeNm the vcatnSeNm to set
	 */
	public void setVcatnSeNm(String vcatnSeNm) {
		this.vcatnSeNm = vcatnSeNm;
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
	 * @return the orgnztNm

	public String getOrgnztNm() {
		return orgnztNm;
	}
		 */
	/**
	 * @param orgnztNm the orgnztNm to set

	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}	 */
	/**
	 * @return the sanctnerOrgnztNm
	 */
	public String getSanctnerOrgnztNm() {
		return sanctnerOrgnztNm;
	}
	/**
	 * @param sanctnerOrgnztNm the sanctnerOrgnztNm to set
	 */
	public void setSanctnerOrgnztNm(String sanctnerOrgnztNm) {
		this.sanctnerOrgnztNm = sanctnerOrgnztNm;
	}
	/**
	 * @return the occrncYrycCo
	 */
	public double getOccrncYrycCo() {
		return occrncYrycCo;
	}
	/**
	 * @param occrncYrycCo the occrncYrycCo to set
	 */
	public void setOccrncYrycCo(double occrncYrycCo) {
		this.occrncYrycCo = occrncYrycCo;
	}
	/**
	 * @return the useYrycCo
	 */
	public double getUseYrycCo() {
		return useYrycCo;
	}
	/**
	 * @param useYrycCo the useYrycCo to set
	 */
	public void setUseYrycCo(double useYrycCo) {
		this.useYrycCo = useYrycCo;
	}
	/**
	 * @return the remndrYrycCo
	 */
	public double getRemndrYrycCo() {
		return remndrYrycCo;
	}
	/**
	 * @param remndrYrycCo the remndrYrycCo to set
	 */
	public void setRemndrYrycCo(double remndrYrycCo) {
		this.remndrYrycCo = remndrYrycCo;
	}
	/**
	 * @return the searchYear
	 */
	public String getSearchYear() {
		return searchYear;
	}
	/**
	 * @param searchYear the searchYear to set
	 */
	public void setSearchYear(String searchYear) {
		this.searchYear = searchYear;
	}
	/**
	 * @return the searchMonth
	 */
	public String getSearchMonth() {
		return searchMonth;
	}
	/**
	 * @param searchMonth the searchMonth to set
	 */
	public void setSearchMonth(String searchMonth) {
		this.searchMonth = searchMonth;
	}
	/**
	 * @return the searchNm
	 */
	public String getSearchNm() {
		return searchNm;
	}
	/**
	 * @param searchNm the searchNm to set
	 */
	public void setSearchNm(String searchNm) {
		this.searchNm = searchNm;
	}
	/**
	 * @return the searchConfmAt
	 */
	public String getSearchConfmAt() {
		return searchConfmAt;
	}
	/**
	 * @param searchConfmAt the searchConfmAt to set
	 */
	public void setSearchConfmAt(String searchConfmAt) {
		this.searchConfmAt = searchConfmAt;
	}
	/**
	 * @return the applcntIdKey
	 */
	public String getApplcntIdKey() {
		return applcntIdKey;
	}
	/**
	 * @param applcntIdKey the applcntIdKey to set
	 */
	public void setApplcntIdKey(String applcntIdKey) {
		this.applcntIdKey = applcntIdKey;
	}
	/**
	 * @return the vcatnSeKey
	 */
	public String getVcatnSeKey() {
		return vcatnSeKey;
	}
	/**
	 * @param vcatnSeKey the vcatnSeKey to set
	 */
	public void setVcatnSeKey(String vcatnSeKey) {
		this.vcatnSeKey = vcatnSeKey;
	}
	/**
	 * @return the bgndeKey
	 */
	public String getBgndeKey() {
		return bgndeKey;
	}
	/**
	 * @param bgndeKey the bgndeKey to set
	 */
	public void setBgndeKey(String bgndeKey) {
		this.bgndeKey = bgndeKey;
	}
	/**
	 * @return the enddeKey
	 */
	public String getEnddeKey() {
		return enddeKey;
	}
	/**
	 * @param enddeKey the enddeKey to set
	 */
	public void setEnddeKey(String enddeKey) {
		this.enddeKey = enddeKey;
	}
}
