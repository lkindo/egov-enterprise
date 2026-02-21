package egovframework.com.cmm.exception;

import org.egovframe.rte.fdl.cmmn.exception.BaseRuntimeException;

/**
 * EgovXssException ?????
 *
 * @author ???
 * @since 2016.10.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????       ????          ????
 *  -------      -------------  ----------------------
 *   2016.10.17  ???          ????
 * </pre>
 **/

public class EgovFileExtensionException extends BaseRuntimeException {

	private static final long serialVersionUID = 1L;

	/**
	 * EgovFileExtensionException ????
	 *
	 * @param defaultMessage ?? ??
	 * @param wrappedException ?? Exception
	 **/
	public EgovFileExtensionException(String message, String messageKey) {
		this.messageKey = messageKey;
		this.messageParameters = null;
		this.message = message;
		this.wrappedException = null;
	}

}
