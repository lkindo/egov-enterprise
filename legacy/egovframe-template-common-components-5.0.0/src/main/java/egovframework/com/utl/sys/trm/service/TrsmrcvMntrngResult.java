package egovframework.com.utl.sys.trm.service;


/**
 * ?≪닔?좊え?덊꽣留??????寃곌낵 ?대옒??
 *
 * @author 源吏꾨쭔
 * @version 1.0
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.08.16   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public class TrsmrcvMntrngResult {

	/**
	 * 紐⑤땲?곕쭅 ?뺤긽?щ?
	 */
	private boolean nrmltAt;
	/**
	 * ?먯씤 Exception
	 */
	private Throwable cause;

	/**
	 * @return the nrmltAt
	 */
	public boolean isNrmltAt() {
		return nrmltAt;
	}
	/**
	 * @return the cause
	 */
	public Throwable getCause() {
		return cause;
	}
	/**
	 * @param nrmltAt the nrmltAt to set
	 */
	public void setNrmltAt(boolean nrmltAt) {
		this.nrmltAt = nrmltAt;
	}
	/**
	 * @param cause the cause to set
	 */
	public void setCause(Throwable cause) {
		this.cause = cause;
	}

	public TrsmrcvMntrngResult( boolean nrmltAt, Throwable cause) {
		this.nrmltAt = nrmltAt;
		this.cause = cause;
	}

}
