package egovframework.com.utl.sys.srm.service;

import java.util.Collections;
import java.util.List;

/**
 * ??
 * - ????????????Vo ?????? ???.
 *
 * ???
 * - ????????????? ??, ???????? ????
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?? 11:24:00
 **/
public class ServerResrceMntrngVO extends ServerResrceMntrng {

	private static final long serialVersionUID = 1L;
	/**
	 * ?????? ?????
	 **/
	private String strServerNm;
	/**
	 * ???? ???
	 **/
	private String strStartDt;
	/**
	 * ??? ???
	 **/
	private String strEndDt;
	/**
	 * ?????? ?
	 **/
	private List<ServerResrceMntrngVO> serverResrceMntrngList;
	/**
	 * @return the strServerNm
	 **/
	public String getStrServerNm() {
		return strServerNm;
	}
	/**
	 * @param strServerNm the strServerNm to set
	 **/
	public void setStrServerNm(String strServerNm) {
		this.strServerNm = strServerNm;
	}
	/**
	 * @return the strStartDt
	 **/
	public String getStrStartDt() {
		return strStartDt;
	}
	/**
	 * @param strStartDt the strStartDt to set
	 **/
	public void setStrStartDt(String strStartDt) {
		this.strStartDt = strStartDt;
	}
	/**
	 * @return the strEndDt
	 **/
	public String getStrEndDt() {
		return strEndDt;
	}
	/**
	 * @param strEndDt the strEndDt to set
	 **/
	public void setStrEndDt(String strEndDt) {
		this.strEndDt = strEndDt;
	}
	/**
	 * @return the serverResrceMntrngList
	 **/
	public List<ServerResrceMntrngVO> getServerResrceMntrngList() {
		return serverResrceMntrngList;
	}
	/**
	 * @param serverResrceMntrngList the serverResrceMntrngList to set
	 **/
	public void setServerResrceMntrngList(List<ServerResrceMntrngVO> serverResrceMntrngList) {
		this.serverResrceMntrngList = Collections.unmodifiableList(serverResrceMntrngList);
	}

}
