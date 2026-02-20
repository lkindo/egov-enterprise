package egovframework.com.cmm.util;

import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import egovframework.com.cmm.service.EgovProperties;
import jakarta.annotation.Resource;


/**
 * ?곗씠?곕쿋?댁뒪 ?⑥뒪?뚮뱶 ?닿껐???꾪븳 ?좏떥由ы떚 ?대옒??
 * ?뷀샇?붾맂 ?⑥뒪?뚮뱶瑜?蹂듯샇?뷀븯嫄곕굹 ?됰Ц ?⑥뒪?뚮뱶瑜?諛섑솚
 * 
 * @author ?좎?蹂댁닔
 * @since 2025.06.01
 */
@Component
public class EgovPasswordResolver {

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovPasswordResolver.class);
    
    @Resource(name = "egovEnvCryptoService")
    private EgovEnvCryptoService cryptoService;
    
    /**
     * ?뷀샇???쒕퉬???ㅼ젙
     */
    public void setCryptoService(EgovEnvCryptoService cryptoService) {
        this.cryptoService = cryptoService;
    }
    
    /**
     * EgovEnvCryptoService瑜??듯빐 crypto ?ㅼ젙媛믪쓣 ?뺤씤
     * @return true: ?뷀샇???ъ슜, false: ?됰Ц ?ъ슜
     */
    private boolean isCryptoEnabled() {
        try {
            if (cryptoService == null) {
                LOGGER.warn("EgovEnvCryptoService媛 null?낅땲?? 湲곕낯媛믪쑝濡??됰Ц ?ъ슜");
                return false;
            }
            
            try {
                java.lang.reflect.Method method = cryptoService.getClass().getMethod("isCrypto");
                boolean cryptoEnabled = (Boolean) method.invoke(cryptoService);
                return cryptoEnabled;
            } catch (NoSuchMethodException e) {
                LOGGER.debug("isCryptoEnabled() 硫붿꽌?쒓? ?놁뒿?덈떎. ?ㅻⅨ 諛⑸쾿?쇰줈 ?뺤씤 ?쒕룄");
                
                // 諛⑸쾿 1: getCryptoConfig() 硫붿꽌???쒕룄
                try {
                    java.lang.reflect.Method getConfigMethod = cryptoService.getClass().getMethod("getCryptoConfig");
                    Object cryptoConfig = getConfigMethod.invoke(cryptoService);
                    
                    if (cryptoConfig != null) {
                        java.lang.reflect.Method isCryptoMethod = cryptoConfig.getClass().getMethod("isCrypto");
                        boolean cryptoEnabled = (Boolean) isCryptoMethod.invoke(cryptoConfig);
                        LOGGER.debug("EgovEnvCryptoService.getCryptoConfig().isCrypto(): {}", cryptoEnabled);
                        return cryptoEnabled;
                    }
                } catch (Exception e2) {
                    LOGGER.debug("getCryptoConfig() 諛⑸쾿???ㅽ뙣: {}", e2.getMessage());
                }
                
                // 諛⑸쾿 2: 湲곕낯媛믪쑝濡?true 諛섑솚 (?뷀샇???ъ슜)
                LOGGER.debug("crypto ?ㅼ젙???뺤씤?????놁뼱 湲곕낯媛믪쑝濡??뷀샇???ъ슜");
                return true;
            }
            
        } catch (Exception e) {
            LOGGER.error("EgovEnvCryptoService瑜??듯븳 crypto ?ㅼ젙 ?뺤씤 ?ㅻ쪟: {}", e.getMessage());
            return true; // ?ㅻ쪟 ???뷀샇???ъ슜 (湲곕낯媛?
        }
    }
    
    /**
     * ?⑥뒪?뚮뱶 ?닿껐 (?뷀샇?붾맂 ?⑥뒪?뚮뱶 蹂듯샇???먮뒗 ?됰Ц 諛섑솚)
     * EgovEnvCryptoService瑜??듯빐 crypto ?ㅼ젙媛믪쓣 ?뺤씤?섏뿬 ?됰Ц/?뷀샇??援щ텇
     * 
     * @param propertyKey ?꾨줈?쇳떚 ??(?? Globals.mysql.Password)
     * @return ?닿껐???⑥뒪?뚮뱶
     */
    public String resolvePassword(String propertyKey) {
        try {
            // 1. globals.properties?먯꽌 ?⑥뒪?뚮뱶 媛??쎄린
            String passwordValue = EgovProperties.getProperty(propertyKey);
            if (passwordValue == null || passwordValue.trim().isEmpty()) {
                LOGGER.warn("?⑥뒪?뚮뱶 媛믪쓣 李얠쓣 ???놁쓬: {}", propertyKey);
                return "";
            }
            
            // 2. EgovEnvCryptoService瑜??듯빐 crypto ?ㅼ젙媛??뺤씤
            boolean cryptoEnabled = isCryptoEnabled();
            
            if (cryptoEnabled) {
                // 3-1. ?뷀샇???ъ슜??寃쎌슦: 蹂듯샇???섑뻾
                try {
                    String decryptedValue = cryptoService.decrypt(passwordValue);
                    return decryptedValue;
                } catch (Exception e) {
                    LOGGER.error("?⑥뒪?뚮뱶 蹂듯샇???ㅽ뙣: {} - {}", propertyKey, e.getMessage());
                    return passwordValue;
                }
            } else {
                // 3-2. ?됰Ц ?ъ슜??寃쎌슦: 媛?洹몃?濡?諛섑솚
                return passwordValue;
            }
            
        } catch (Exception e) {
            LOGGER.error("?⑥뒪?뚮뱶 ?닿껐 以??ㅻ쪟 諛쒖깮: {} - {}", propertyKey, e.getMessage());
            // ?ㅻ쪟 諛쒖깮 ???먮낯 媛?諛섑솚
            return EgovProperties.getProperty(propertyKey);
        }
    }

}
