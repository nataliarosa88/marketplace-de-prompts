package com.promptvault.backend.prompt;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromptRepository extends JpaRepository<Prompt, String> {
  List<Prompt> findAllByAuthorizedAtIsNotNullAndDeletedAtIsNullOrderByCreatedAtDesc();

  List<Prompt> findAllByAuthorizedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc();

  List<Prompt> findAllByDeletedAtIsNotNullOrderByCreatedAtDesc();

  long countByAuthorizedAtIsNullAndDeletedAtIsNull();

  long countByAuthorizedAtIsNotNullAndDeletedAtIsNull();

  long countByDeletedAtIsNotNull();

  List<Prompt> findAllByDeletedAtIsNullAndCreatedAtAfterOrderByCreatedAtDesc(OffsetDateTime createdAt);
}
