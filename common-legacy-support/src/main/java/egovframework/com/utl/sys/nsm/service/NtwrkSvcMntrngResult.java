package egovframework.com.utl.sys.nsm.service;

/**
 * ??
 * - ???????????????????????? ???.
 *
 * ???
 * - ?? ????, ?? Exception ?????????
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:33:43
 **/

public class NtwrkSvcMntrngResult {

	/**
	 * ?? ????
	 **/
	private boolean nrmltAt;
	/**
	 * ?? Exception
	 **/
	private Throwable cause;

	public boolean isNrmltAt() {
		return nrmltAt;
	}
	public Throwable getCause() {
		return cause;
	}
	public void setNrmltAt(boolean nrmltAt) {
		this.nrmltAt = nrmltAt;
	}
	public void setCause(Throwable cause) {
		this.cause = cause;
	}

	public NtwrkSvcMntrngResult( boolean nrmltAt, Throwable cause) {
		this.nrmltAt = nrmltAt;
		this.cause = cause;
	}

}
