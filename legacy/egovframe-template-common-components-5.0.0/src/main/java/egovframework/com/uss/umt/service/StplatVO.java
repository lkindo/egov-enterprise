package egovframework.com.uss.umt.service;

import java.io.Serializable;

/**
 * 媛?낆빟愿VO?대옒?ㅻ줈?쒓??낆빟愿?뺤씤??鍮꾩??덉뒪濡쒖쭅 泥섎━????ぉ??援ъ꽦?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  議곗옱??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class StplatVO implements Serializable {

	private static final long serialVersionUID = 3744005602026645L;

	/** ?쎄??꾩씠??/
    private String useStplatId;

    /** ?ъ슜?쎄??덈궡*/
    private String useStplatCn;

    /** ?뺣낫?숈쓽?덈궡*/
    private String infoProvdAgeCn;

    /**
	 * useStplatId attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUseStplatId() {
		return useStplatId;
	}

	/**
	 * useStplatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useStplatId String
	 */
	public void setUseStplatId(String useStplatId) {
		this.useStplatId = useStplatId;
	}

	/**
	 * useStplatCn attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUseStplatCn() {
		return useStplatCn;
	}

	/**
	 * useStplatCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useStplatCn String
	 */
	public void setUseStplatCn(String useStplatCn) {
		this.useStplatCn = useStplatCn;
	}

	/**
	 * infoProvdAgeCn attribute 媛믪쓣  由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInfoProvdAgeCn() {
		return infoProvdAgeCn;
	}

	/**
	 * infoProvdAgeCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param infoProvdAgeCn String
	 */
	public void setInfoProvdAgeCn(String infoProvdAgeCn) {
		this.infoProvdAgeCn = infoProvdAgeCn;
	}

}
