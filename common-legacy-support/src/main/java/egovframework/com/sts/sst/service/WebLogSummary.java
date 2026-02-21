package egovframework.com.sts.sst.service;

/**
 * ??? ???????????
 * @author ???????? ???
 * @since 2009.04.15
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------     --------    ---------------------------
 *  2009.04.15   ???         ????
 *  2011.07.01   ????         ??? ???sts -> sts.sst)
 *
 *  </pre>
 **/
public class WebLogSummary {

	/**
	 * ??
	 **/
	private int rdCnt;
	/**
	 * ??
	 **/
	private String occrrncDe;
	/**
	 * URL
	 **/
	private String url;
	/**
	 * rdCnt attribute ?????.
	 * @return int
	 **/
	public int getRdCnt() {
		return rdCnt;
	}
	/**
	 * rdCnt attribute ???????.
	 * @param rdCnt int
	 **/
	public void setRdCnt(int rdCnt) {
		this.rdCnt = rdCnt;
	}
	/**
	 * occrrncDe attribute ?????.
	 * @return String
	 **/
	public String getOccrrncDe() {
		return occrrncDe;
	}
	/**
	 * occrrncDe attribute ???????.
	 * @param occrrncDe String
	 **/
	public void setOccrrncDe(String occrrncDe) {
		this.occrrncDe = occrrncDe;
	}
	/**
	 * url attribute ?????.
	 * @return String
	 **/
	public String getUrl() {
		return url;
	}
	/**
	 * url attribute ???????.
	 * @param url String
	 **/
	public void setUrl(String url) {
		this.url = url;
	}
}
