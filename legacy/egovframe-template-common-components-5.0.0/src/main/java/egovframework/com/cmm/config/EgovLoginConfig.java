package egovframework.com.cmm.config;

/**
 * EgovLoginConfig ?대옒??
 * <Notice>
 * 	    ?ъ슜???몄쬆?섑뻾?쒗븳??????ㅼ젙??愿由ы븯???대옒??
 * <Disclaimer>
 *		N/A
 *
 * @author ?λ룞??
 * @since 2017.07.17
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??       ?섏젙??          ?섏젙?댁슜
 *  -------      -------------  ----------------------
 *   2016.07.17  ?λ룞??          理쒖큹 ?앹꽦
 * </pre>
 */


public class EgovLoginConfig {
	//濡쒓렇???몄쬆 ?쒗븳 ?щ?
	boolean lock = false;
	//濡쒓렇???몄쬆 ?쒗븳 ?잛닔
	int lockCount = 0;

	public boolean isLock() {
		return lock;
	}

	public void setLock(boolean lock) {
		this.lock = lock;
	}

	public int getLockCount() {
		return lockCount;
	}

	public void setLockCount(int lockCount) {
		this.lockCount = lockCount;
	}
}
