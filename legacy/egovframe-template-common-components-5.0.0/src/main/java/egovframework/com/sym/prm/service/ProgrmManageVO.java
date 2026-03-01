package egovframework.com.sym.prm.service;

import jakarta.validation.constraints.NotEmpty;

/**
 * ?꾨줈洹몃옩紐⑸줉 泥섎━瑜??꾪븳 VO ?대옒?ㅻⅤ瑜??뺤쓽?쒕떎
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 *   2024.10.29  沅뚰깭??         ?꾩닔媛?BindingResult 寃利앹쓣 ?꾪븳 @NotEmpty 異붽?
 *   2025.07.21  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
public class ProgrmManageVO {

	/** ?꾨줈洹몃옩?뚯씪紐?*/
	@NotEmpty(message = "?꾨줈洹몃옩?뚯씪紐?common.required.msg}")
	private String progrmFileNm;
	/** ?꾨줈洹몃옩??κ꼍濡?*/
	@NotEmpty(message = "?꾨줈洹몃옩??κ꼍濡?common.required.msg}")
	private String progrmStrePath;
	/** ?꾨줈洹몃옩?쒓?紐?*/
	@NotEmpty(message = "?꾨줈洹몃옩?쒓?紐?common.required.msg}")
	private String progrmKoreanNm;
	/** URL */
	@NotEmpty(message = "URL{common.required.msg}")
	private String url;
	/** ?꾨줈洹몃옩?ㅻ챸 */
	@NotEmpty(message = "?꾨줈洹몃옩?ㅻ챸{common.required.msg}")
	private String progrmDc;

	/**
	 * progrmFileNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getProgrmFileNm() {
		return progrmFileNm;
	}

	/**
	 * progrmFileNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param progrmFileNm String
	 */
	public void setProgrmFileNm(String progrmFileNm) {
		this.progrmFileNm = progrmFileNm;
	}

	/**
	 * progrmStrePath attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getProgrmStrePath() {
		return progrmStrePath;
	}

	/**
	 * progrmStrePath attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param progrmStrePath String
	 */
	public void setProgrmStrePath(String progrmStrePath) {
		this.progrmStrePath = progrmStrePath;
	}

	/**
	 * progrmKoreanNm attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getProgrmKoreanNm() {
		return progrmKoreanNm;
	}

	/**
	 * progrmKoreanNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param progrmKoreanNm String
	 */
	public void setProgrmKoreanNm(String progrmKoreanNm) {
		this.progrmKoreanNm = progrmKoreanNm;
	}

	/**
	 * url attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getURL() {
		return url;
	}

	/**
	 * url attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param url String
	 */
	public void setURL(String url) {
		this.url = url;
	}

	/**
	 * progrmDc attribute瑜?由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getProgrmDc() {
		return progrmDc;
	}

	/**
	 * progrmDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param progrmDc String
	 */
	public void setProgrmDc(String progrmDc) {
		this.progrmDc = progrmDc;
	}

}
