package egovframework.com.utl.sys.srm.service;

import java.util.Collections;
import java.util.List;

/**
 * 媛쒖슂
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅??紐⑸줉 ??ぉ, 議고쉶議곌굔, ??젣????깆쓣 愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?ㅼ쟾 11:24:00
 */
public class ServerResrceMntrngVO extends ServerResrceMntrng {

	private static final long serialVersionUID = 1L;
	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 ?쒕쾭紐?議고쉶議곌굔
	 */
	private String strServerNm;
	/**
	 * ?쒖옉?쇱옄 寃?됱“嫄?
	 */
	private String strStartDt;
	/**
	 * 醫낅즺?쇱옄 寃?됱“嫄?
	 */
	private String strEndDt;
	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 紐⑸줉
	 */
	private List<ServerResrceMntrngVO> serverResrceMntrngList;
	/**
	 * @return the strServerNm
	 */
	public String getStrServerNm() {
		return strServerNm;
	}
	/**
	 * @param strServerNm the strServerNm to set
	 */
	public void setStrServerNm(String strServerNm) {
		this.strServerNm = strServerNm;
	}
	/**
	 * @return the strStartDt
	 */
	public String getStrStartDt() {
		return strStartDt;
	}
	/**
	 * @param strStartDt the strStartDt to set
	 */
	public void setStrStartDt(String strStartDt) {
		this.strStartDt = strStartDt;
	}
	/**
	 * @return the strEndDt
	 */
	public String getStrEndDt() {
		return strEndDt;
	}
	/**
	 * @param strEndDt the strEndDt to set
	 */
	public void setStrEndDt(String strEndDt) {
		this.strEndDt = strEndDt;
	}
	/**
	 * @return the serverResrceMntrngList
	 */
	public List<ServerResrceMntrngVO> getServerResrceMntrngList() {
		return serverResrceMntrngList;
	}
	/**
	 * @param serverResrceMntrngList the serverResrceMntrngList to set
	 */
	public void setServerResrceMntrngList(List<ServerResrceMntrngVO> serverResrceMntrngList) {
		this.serverResrceMntrngList = Collections.unmodifiableList(serverResrceMntrngList);
	}

}
