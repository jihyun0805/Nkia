// 인수인계: 챗봇 메시지 JPA repository입니다.
// 핵심 흐름: 세션별 메시지를 생성 시간 오름차순으로 가져와 대화 흐름을 복원합니다.
// 같이 확인: 정렬 기준 변경 시 프론트 ChatMessages 표시 순서도 함께 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.repository;

import com.nkia.Orbis.domain.chatbot.session.entity.ChatMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("SELECT m FROM ChatMessage m WHERE m.session.id = :sessionId ORDER BY m.createdAt ASC")
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(@Param("sessionId") UUID sessionId);
}
