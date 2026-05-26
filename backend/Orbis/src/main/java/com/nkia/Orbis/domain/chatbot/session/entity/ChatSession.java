// 인수인계: 챗봇 대화방 엔티티입니다.
// 핵심 흐름: 사용자 ownerId, 제목, 삭제 여부, 마지막 threadId를 저장해 프론트 세션 목록을 복원합니다.
// 같이 확인: 컬럼 변경 시 migration과 ChatSessionResponse 변환을 같이 확인하세요.
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
