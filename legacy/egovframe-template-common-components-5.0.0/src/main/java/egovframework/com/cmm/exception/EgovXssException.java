package egovframework.com.cmm.exception;

import org.egovframe.rte.fdl.cmmn.exception.BaseRuntimeException;

/**
 * EgovXssException ?대옒??
 *
 * @author ?λ룞??
 * @since 2016.10.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??       ?섏젙??          ?섏젙?댁슜
 *  -------      -------------  ----------------------
 *   2016.10.17  ?λ룞??          理쒖큹 ?앹꽦
 * </pre>
 */

public class EgovXssException extends BaseRuntimeException {

	private static final long serialVersionUID = 1L;

	/**
	 * EgovXssException ?앹꽦??
	 *
	 * @param defaultMessage 硫붿꽭吏 吏??
	 * @param wrappedException ?먯씤 Exception
	 */
	public EgovXssException(String message, String messageKey) {
		this.messageKey = messageKey;
		this.messageParameters = null;
		this.message = message;
		this.wrappedException = null;
	}

}
