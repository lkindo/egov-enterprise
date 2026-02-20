package egovframework.com.cmm.config;

/**
 * EgovLoginConfig ?????
 * <Notice>
 * 	    ?????????????????????????????
 * <Disclaimer>
 *		N A   
 *
 * @author ?      ??
 * @since 2017.07.17
 * @version 1.0
 * @see
 *
 * <pre>
 * <<          ???  ??Modification Information) >>
 *
 *   ??      ??       ??      ??          ??      ??      
 *  -------      -------------  ----------------------
 *   2016.07.17  ?      ??                   ????      
 * </pre>
 */


public class EgovLoginConfig {
	//???? ?? ???
	boolean lock = false;
	//???? ?? ??
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
