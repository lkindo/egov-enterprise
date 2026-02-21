package egovframework.com.sym.prm.service;

/**
 * ??? ???????? ???????? ???.
 * @author ???????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *
 * </pre>
 **/

public class ProgrmManage {
	/**
	 * ????
	 **/
	private String progrmDc;
	/**
	 * ??????
	 **/
	private String progrmFileNm;
	/**
	 * ??????
	 **/
	private String progrmKoreanNm;
	/**
	 * ??????
	 **/
	private String progrmStrePath;
	/**
	 * URL
	 **/
	private String url;

	public String getProgrmDc() {
		return progrmDc;
	}
	public void setProgrmDc(String progrmDc) {
		this.progrmDc = progrmDc;
	}
	public String getProgrmFileNm() {
		return progrmFileNm;
	}
	public void setProgrmFileNm(String progrmFileNm) {
		this.progrmFileNm = progrmFileNm;
	}
	public String getProgrmKoreanNm() {
		return progrmKoreanNm;
	}
	public void setProgrmKoreanNm(String progrmKoreanNm) {
		this.progrmKoreanNm = progrmKoreanNm;
	}
	public String getProgrmStrePath() {
		return progrmStrePath;
	}
	public void setProgrmStrePath(String progrmStrePath) {
		this.progrmStrePath = progrmStrePath;
	}
	public String getUrl() {
		return url;
	}
	public void setUrl(String urlTemp) {
		url = urlTemp;
	}
}
