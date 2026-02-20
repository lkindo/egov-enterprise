package egovframework.com.sym.prm.service;

import jakarta.validation.constraints.NotEmpty;

/**
 * ??? ??? VO ??????????
 * 
 * @author ?? ?? ??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??           ????
 *   2024.10.29  ??         ??BindingResult ??? @NotEmpty ??
 *   2025.07.21  ????         2025????????PMD???????? ????????-FormalParameterNamingConventions(?????????
 *
 *      </pre>
 **/
public class ProgrmManageVO {

	/** ??????**/
	@NotEmpty(message = "?                  ????      ?common.required.msg}")
	private String progrmFileNm;
	/** ??????**/
	@NotEmpty(message = "?                  ????            ?common.required.msg}")
	private String progrmStrePath;
	/** ??????**/
	@NotEmpty(message = "?                  ????   ?common.required.msg}")
	private String progrmKoreanNm;
	/** URL **/
	@NotEmpty(message = "URL{common.required.msg}")
	private String url;
	/** ???? **/
	@NotEmpty(message = "?                  ???      {common.required.msg}")
	private String progrmDc;

	/**
	 * progrmFileNm attribute?????.
	 * 
	 * @return String
	 **/
	public String getProgrmFileNm() {
		return progrmFileNm;
	}

	/**
	 * progrmFileNm attribute ???????.
	 * 
	 * @param progrmFileNm String
	 **/
	public void setProgrmFileNm(String progrmFileNm) {
		this.progrmFileNm = progrmFileNm;
	}

	/**
	 * progrmStrePath attribute?????.
	 * 
	 * @return String
	 **/
	public String getProgrmStrePath() {
		return progrmStrePath;
	}

	/**
	 * progrmStrePath attribute ???????.
	 * 
	 * @param progrmStrePath String
	 **/
	public void setProgrmStrePath(String progrmStrePath) {
		this.progrmStrePath = progrmStrePath;
	}

	/**
	 * progrmKoreanNm attribute?????.
	 * 
	 * @return String
	 **/
	public String getProgrmKoreanNm() {
		return progrmKoreanNm;
	}

	/**
	 * progrmKoreanNm attribute ???????.
	 * 
	 * @param progrmKoreanNm String
	 **/
	public void setProgrmKoreanNm(String progrmKoreanNm) {
		this.progrmKoreanNm = progrmKoreanNm;
	}

	/**
	 * url attribute?????.
	 * 
	 * @return String
	 **/
	public String getURL() {
		return url;
	}

	/**
	 * url attribute ???????.
	 * 
	 * @param url String
	 **/
	public void setURL(String url) {
		this.url = url;
	}

	/**
	 * progrmDc attribute?????.
	 * 
	 * @return String
	 **/
	public String getProgrmDc() {
		return progrmDc;
	}

	/**
	 * progrmDc attribute ???????.
	 * 
	 * @param progrmDc String
	 **/
	public void setProgrmDc(String progrmDc) {
		this.progrmDc = progrmDc;
	}

}
