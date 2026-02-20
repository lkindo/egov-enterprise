package egovframework.com.cmm;

/**
 * IncludedCompInfoVO ?대옒??
 * 
 * <p>
 *  Description : IncludedInfo annotation??諛뷀깢?쇰줈 ?붾㈃???쒖떆???뺣낫瑜?援ъ꽦?섍린 ?꾪븳 VO ?대옒??
 * </p>
 * 
 * @author 怨듯넻而댄룷?뚰듃 ?뺤쭊??
 * @since 2011.08.26
 * @version 2.0.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *  ?섏젙??	?섏젙??	?섏젙?댁슜
 *  -------    	--------    ---------------------------
 *  2011.08.26	?뺤쭊??		理쒖큹 ?앹꽦
 * </pre>
 * 
 */
public class IncludedCompInfoVO {
	
	private String name;
	private String listUrl;
	private int order;
	private int gid;
	
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public String getListUrl() {
		return listUrl;
	}
	public void setListUrl(String listUrl) {
		this.listUrl = listUrl;
	}
	public int getOrder() {
		return order;
	}
	public void setOrder(int order) {
		this.order = order;
	}
	public int getGid() {
		return gid;
	}
	public void setGid(int gid) {
		this.gid = gid;
	}
}
