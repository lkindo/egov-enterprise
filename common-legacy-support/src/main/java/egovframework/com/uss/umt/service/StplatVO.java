package egovframework.com.uss.umt.service;

import java.io.Serializable;

/**
 * ???VO???????????????????????????????.
 * @author ???????? ???
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.10  ???         ????
 *
 * </pre>
 **/
public class StplatVO implements Serializable {

	private static final long serialVersionUID = 3744005602026645L;

	/** ??????*/
    private String useStplatId;

    /** ????????**/
    private String useStplatCn;

    /** ?????**/
    private String infoProvdAgeCn;

    /**
	 * useStplatId attribute ??? ???.
	 * @return String
	 **/
	public String getUseStplatId() {
		return useStplatId;
	}

	/**
	 * useStplatId attribute ???????.
	 * @param useStplatId String
	 **/
	public void setUseStplatId(String useStplatId) {
		this.useStplatId = useStplatId;
	}

	/**
	 * useStplatCn attribute ??? ???.
	 * @return String
	 **/
	public String getUseStplatCn() {
		return useStplatCn;
	}

	/**
	 * useStplatCn attribute ???????.
	 * @param useStplatCn String
	 **/
	public void setUseStplatCn(String useStplatCn) {
		this.useStplatCn = useStplatCn;
	}

	/**
	 * infoProvdAgeCn attribute ??? ???.
	 * @return String
	 **/
	public String getInfoProvdAgeCn() {
		return infoProvdAgeCn;
	}

	/**
	 * infoProvdAgeCn attribute ???????.
	 * @param infoProvdAgeCn String
	 **/
	public void setInfoProvdAgeCn(String infoProvdAgeCn) {
		this.infoProvdAgeCn = infoProvdAgeCn;
	}

}
