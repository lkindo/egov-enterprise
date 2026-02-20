package egovframework.com.cop.smt.djm.service;

import java.io.Serializable;

/**
 * ??
 * - ??? ????model ?????? ???.
 * 
 * ???
 * - ????D, ????, ?????? ??????? ??????? ???, ????ID ???????????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:04
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.6.28	???         ????
 *
 *          </pre>
 **/

public class Dept implements Serializable {
	private static final long serialVersionUID = 1L;
	/** ???ID **/
	private String orgnztId;
	/** ??? **/
	private String orgnztNm;
	/** ????**/
	private String orgnztDc;

	public String getOrgnztId() {
		return orgnztId;
	}

	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}

	public String getOrgnztNm() {
		return orgnztNm;
	}

	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}

	public String getOrgnztDc() {
		return orgnztDc;
	}

	public void setOrgnztDc(String orgnztDc) {
		this.orgnztDc = orgnztDc;
	}
}
