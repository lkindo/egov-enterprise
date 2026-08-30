package nuri.foundation.core.event;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PostCreatedEventTest {

    @Test
    void preservesSourceAndPostIdentity() {
        Object source = new Object();

        PostCreatedEvent event = new PostCreatedEvent(source, "BBS_01", 42L, "user-1");

        assertThat(event.getSource()).isSameAs(source);
        assertThat(event.getBbsId()).isEqualTo("BBS_01");
        assertThat(event.getPstSn()).isEqualTo(42L);
        assertThat(event.getUserId()).isEqualTo("user-1");
    }
}
