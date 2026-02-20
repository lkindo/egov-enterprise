package egovframework.com.utl.pao.service;

import java.io.Serializable;

/**
 *
 * 愿?몄씠誘몄? 紐⑤뜽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class PrntngOutptVO implements Serializable {

	private static final long serialVersionUID = 941289557959718464L;

	/*
	 * ?대?吏?뺣낫
	 */
    private byte[] imgInfo;

    /*
     * ?대?吏???
     */
	private String imgType;

	/*
	 * 湲곌?肄붾뱶
	 */
    private String orgCode;

    /*
     * 愿?멸뎄遺?
     */
    private String erncslSe;

	/**
	 * imgInfo attribute 瑜?由ы꽩?쒕떎.
	 * @return byte[]
	 */
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
	 * imgInfo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param imgInfo byte[]
	 */
	public void setImgInfo(byte[] imgInfo) {
		this.imgInfo = new byte[imgInfo.length];

		for (int i = 0; i <  imgInfo.length; ++i) {
			this.imgInfo[i] = imgInfo[i];
		}
	}

	/**
	 * imgType attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getImgType() {
		return imgType;
	}

	/**
	 * imgType attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param imgType String
	 */
	public void setImgType(String imgType) {
		this.imgType = imgType;
	}

	/**
	 * orgCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOrgCode() {
		return orgCode;
	}

	/**
	 * orgCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param orgCode String
	 */
	public void setOrgCode(String orgCode) {
		this.orgCode = orgCode;
	}

	/**
	 * erncslSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getErncslSe() {
		return erncslSe;
	}

	/**
	 * erncslSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param erncslSe String
	 */
	public void setErncslSe(String erncslSe) {
		this.erncslSe = erncslSe;
	}


}
