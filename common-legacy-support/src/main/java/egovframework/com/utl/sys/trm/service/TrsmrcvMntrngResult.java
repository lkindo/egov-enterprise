package egovframework.com.utl.sys.trm.service;


/**
 * ???????????????????
 *
 * @author ?
 * @version 1.0
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.08.16   ?    ????
 * </pre>
 **/
public class TrsmrcvMntrngResult {

	/**
	 * ?? ????
	 **/
	private boolean nrmltAt;
	/**
	 * ?? Exception
	 **/
	private Throwable cause;

	/**
	 * @return the nrmltAt
	 **/
	public boolean isNrmltAt() {
		return nrmltAt;
	}
	/**
	 * @return the cause
	 **/
	public Throwable getCause() {
		return cause;
	}
	/**
	 * @param nrmltAt the nrmltAt to set
	 **/
	public void setNrmltAt(boolean nrmltAt) {
		this.nrmltAt = nrmltAt;
	}
	/**
	 * @param cause the cause to set
	 **/
	public void setCause(Throwable cause) {
		this.cause = cause;
	}

	public TrsmrcvMntrngResult( boolean nrmltAt, Throwable cause) {
		this.nrmltAt = nrmltAt;
		this.cause = cause;
	}

}
