package egovframework.com.utl.sys.htm.service;

public class HttpMonResult {

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

	public HttpMonResult( boolean nrmltAt, Throwable cause) {
		this.nrmltAt = nrmltAt;
		this.cause = cause;
	}

}
