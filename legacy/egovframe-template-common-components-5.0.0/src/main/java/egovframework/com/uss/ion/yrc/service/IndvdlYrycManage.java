package egovframework.com.uss.ion.yrc.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - 媛쒖씤蹂??곗감愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?곗감愿由ъ쓽 諛쒖깮?곕룄,?ъ슜?륤D,?곗감諛쒖깮媛쒖닔,?ъ슜?곗감媛쒖닔,?붿뿬?곗감媛쒖닔,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?닿린??
 * @version 1.0
 * @created 2014.11.14
 */

public class IndvdlYrycManage extends ComDefaultVO {

	private static final long serialVersionUID = 1L;

	/**
	*  諛쒖깮?곕룄
	*/
	private String occrrncYear;

	/**
	*  ?ъ슜?륤D
	*/
	private String mberId;

	/**
	 *  ?ъ슜???대쫫
	 */
	private String mberNm;

	/**
	*  諛쒖깮?곗감媛쒖닔
	*/
	private double occrncYrycCo;

	/**
	*  ?ъ슜?곗감媛쒖닔
	*/
	private double useYrycCo;

	/**
	*  ?붿뿬?곗감媛쒖닔
	*/
	private double remndrYrycCo;

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
	 * @return the mberId
	 */
	public String getMberId() {
		return mberId;
	}

	/**
	 * @param mberId the mberId to set
	 */
	public void setMberId(String mberId) {
		this.mberId = mberId;
	}


	/**
	 * @return the mberNm
	 */
	public String getMberNm() {
		return mberNm;
	}

	/**
	 * @param mberId the mberNm to set
	 */
	public void setMberNm(String mberNm) {
		this.mberNm = mberNm;
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

}
