// 인수인계 메모: 채팅 세션/메시지 저장 계층입니다. 사용자별 대화 목록과 메시지 이력을 DB에 보존합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "chat_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatSession extends BaseEntity {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String title;

    @Column
    private String lastThreadId;

    @Column
    private LocalDateTime lastMessageAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ChatMessage> messages = new ArrayList<>();

    @Builder
    public ChatSession(String userId, String title) {
        this.userId = userId;
        this.title = title;
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void markMessagePersisted(String lastThreadId) {
        this.lastThreadId = lastThreadId;
        this.lastMessageAt = LocalDateTime.now();
    }
}
