package egovframework.com.utl.pao.service;

import java.io.Serializable;

/**
 *
 * ??? ???????
 * @author ???????? ????
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.02.01  ????         ????
 *
 * </pre>
 **/
public class PrntngOutptVO implements Serializable {

	private static final long serialVersionUID = 941289557959718464L;

	/*
	 * ????
	 */
    private byte[] imgInfo;

    /*
     * ???????
     */
	private String imgType;

	/*
	 * ???
	 */
    private String orgCode;

    /*
     * ????
     */
    private String erncslSe;

	/**
	 * imgInfo attribute ?????.
	 * @return byte[]
	 **/
	public byte[] getImgInfo() {
		byte[] ret = null;

		if (imgInfo != null) {
			ret = new byte[imgInfo.length];

			for (int i = 0; i < imgInfo.length; i++) {
				ret[i] = imgInfo[i];
			}
		}
		return ret;
	}

	/**
	 * imgInfo attribute ???????.
	 * @param imgInfo byte[]
	 **/
	public void setImgInfo(byte[] imgInfo) {
		this.imgInfo = new byte[imgInfo.length];

		for (int i = 0; i <  imgInfo.length; ++i) {
			this.imgInfo[i] = imgInfo[i];
		}
	}

	/**
	 * imgType attribute ?????.
	 * @return String
	 **/
	public String getImgType() {
		return imgType;
	}

	/**
	 * imgType attribute ???????.
	 * @param imgType String
	 **/
	public void setImgType(String imgType) {
		this.imgType = imgType;
	}

	/**
	 * orgCode attribute ?????.
	 * @return String
	 **/
	public String getOrgCode() {
		return orgCode;
	}

	/**
	 * orgCode attribute ???????.
	 * @param orgCode String
	 **/
	public void setOrgCode(String orgCode) {
		this.orgCode = orgCode;
	}

	/**
	 * erncslSe attribute ?????.
	 * @return String
	 **/
	public String getErncslSe() {
		return erncslSe;
	}

	/**
	 * erncslSe attribute ???????.
	 * @param erncslSe String
	 **/
	public void setErncslSe(String erncslSe) {
		this.erncslSe = erncslSe;
	}


}
