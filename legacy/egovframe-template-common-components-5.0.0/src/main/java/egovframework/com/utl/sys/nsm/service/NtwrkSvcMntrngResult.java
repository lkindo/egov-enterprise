package egovframework.com.utl.sys.nsm.service;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅?????寃곌낵 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 紐⑤땲?곕쭅 ?뺤긽?щ?, ?먯씤 Exception ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 */

public class NtwrkSvcMntrngResult {

	/**
	 * 紐⑤땲?곕쭅 ?뺤긽?щ?
	 */
	private boolean nrmltAt;
	/**
	 * ?먯씤 Exception
	 */
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
