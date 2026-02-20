package egovframework.com.sts.sst.service;

/**
 * ?밸줈洹몄쭛怨꾩젙蹂댁뿉 ???紐⑤뜽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.04.15
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2009.04.15   諛뺤???         理쒖큹 ?앹꽦
 *  2011.07.01   ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.sst)
 *
 *  </pre>
 */
public class WebLogSummary {

	/**
	 * ?잛닔
	 */
	private int rdCnt;
	/**
	 * 諛쒖깮?쇱옄
	 */
	private String occrrncDe;
	/**
	 * URL
	 */
	private String url;
	/**
	 * rdCnt attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getRdCnt() {
		return rdCnt;
	}
	/**
	 * rdCnt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param rdCnt int
	 */
	public void setRdCnt(int rdCnt) {
		this.rdCnt = rdCnt;
	}
	/**
	 * occrrncDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOccrrncDe() {
		return occrrncDe;
	}
	/**
	 * occrrncDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param occrrncDe String
	 */
	public void setOccrrncDe(String occrrncDe) {
		this.occrrncDe = occrrncDe;
	}
	/**
	 * url attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUrl() {
		return url;
	}
	/**
	 * url attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param url String
	 */
	public void setUrl(String url) {
		this.url = url;
	}
}
