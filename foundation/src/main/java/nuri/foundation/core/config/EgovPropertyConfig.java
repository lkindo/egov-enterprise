package nuri.foundation.core.config;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.fdl.property.impl.EgovPropertyServiceImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class EgovPropertyConfig {

    @Bean(destroyMethod = "destroy")
    public EgovPropertyService propertiesService() {
        EgovPropertyServiceImpl propertyService = new EgovPropertyServiceImpl();

        Map<String, String> properties = new HashMap<>();
        properties.put("pageUnit", "20");
        properties.put("pageSize", "10");
        properties.put("posblAtchFileSize", "10485760");

        propertyService.setProperties(properties);
        return propertyService;
    }
}
