package egovframework.com.sym.prm.service;

/**
 * ?꾨줈洹몃옩紐⑸줉 愿由??앹꽦???꾪븳 紐⑤뜽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜          理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class ProgrmManage {
	/**
	 * ?꾨줈洹몃옩?ㅻ챸
	 */
	private String progrmDc;
	/**
	 * ?꾨줈洹몃옩?뚯씪紐?
	 */
	private String progrmFileNm;
	/**
	 * ?꾨줈洹몃옩?쒓?紐?
	 */
	private String progrmKoreanNm;
	/**
	 * ?꾨줈洹몃옩??κ꼍濡?
	 */
	private String progrmStrePath;
	/**
	 * URL
	 */
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